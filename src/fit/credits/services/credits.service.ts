import { Op, Transaction, fn, col } from 'sequelize';
import { TenantDb } from '../../../config/tenantModels';

export type PurchaseInput = {
  userId: number;
  productId: number;
  quantity: number;
  transactionId: string;
  origin?: string;
  validityDays?: number;
};

export type ConsumeInput = {
  userId: number;
  productId: number;
  quantity: number;
  referenceId?: number;
};

export type CancelBatchInput = {
  userId: number;
  creditId: number;
};

export type ListCreditsFilter = {
  userId: number;
  productId?: number;
  status?: 'active' | 'expired' | 'exhausted' | string;
};

export type CheckAvailabilityInput = {
  userId: number;
  productId: number;
  quantity: number;
};

async function withTx<T>(db: TenantDb, work: (t: Transaction) => Promise<T>): Promise<T> {
  return db.sequelize.transaction(work);
}

async function getValidityDays(productId: number, db: TenantDb, override?: number): Promise<number> {
  if (override !== undefined) return override;
  const product = await db.Product.findByPk(productId);
  const raw = (product as any)?.validityDays ?? (product as any)?.validity ?? 365;
  const days = Number(raw);
  return Number.isFinite(days) ? days : 365;
}

export async function purchaseCredits(input: PurchaseInput, db: TenantDb) {
  const { userId, productId, quantity, transactionId, origin = 'Compra', validityDays } = input;

  if (quantity <= 0) throw new Error('quantity deve ser > 0.');

  return withTx(db, async (t) => {
    const days = await getValidityDays(productId, db, validityDays);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const credit = await db.StudentCredit.create(
      {
        userId,
        productId,
        totalCredits: quantity,
        usedCredits: 0,
        availableCredits: quantity,
        status: 'active',
        expiresAt,
      },
      { transaction: t }
    );

    await db.CreditTransaction.create(
      {
        studentCreditId: credit.id,
        userId,
        delta: quantity,
        reason: 'purchase',
        note: `${origin} — pagarme: ${transactionId}`,
      },
      { transaction: t }
    );

    return { success: true, message: 'Créditos adicionados com sucesso.', creditId: credit.id };
  });
}

export async function consumeCredits(input: ConsumeInput, db: TenantDb) {
  const { userId, productId, quantity, referenceId } = input;

  if (quantity <= 0) throw new Error('quantity deve ser > 0.');

  return withTx(db, async (t) => {
    const now = new Date();

    const lots = await db.StudentCredit.findAll({
      where: {
        userId,
        productId,
        status: 'active',
        expiresAt: { [Op.gte]: now },
        availableCredits: { [Op.gt]: 0 },
      },
      order: [
        ['expiresAt', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    let remaining = quantity;

    for (const lot of lots) {
      if (remaining <= 0) break;

      const take = Math.min(lot.availableCredits, remaining);

      lot.availableCredits -= take;
      lot.usedCredits += take;
      if (lot.availableCredits === 0) lot.status = 'exhausted';

      await lot.save({ transaction: t });

      await db.CreditTransaction.create(
        {
          studentCreditId: lot.id,
          userId,
          delta: -take,
          reason: 'consume',
          referenceId,
        },
        { transaction: t }
      );

      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error('Créditos insuficientes para este produto.');
    }

    return { success: true, message: 'Créditos consumidos com sucesso.' };
  });
}

export async function cancelBatchIfUnused({ userId, creditId }: CancelBatchInput, db: TenantDb) {
  return withTx(db, async (t) => {
    const lot = await db.StudentCredit.findOne({
      where: { id: creditId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lot) throw new Error('Lote não encontrado.');
    if (lot.usedCredits > 0) {
      throw new Error('Lote já possui consumo; não pode ser cancelado integralmente.');
    }

    await db.CreditTransaction.create(
      {
        studentCreditId: lot.id,
        userId,
        delta: -lot.availableCredits,
        reason: 'refund',
        note: 'Cancelamento de lote sem uso',
      },
      { transaction: t }
    );

    await lot.destroy({ transaction: t });
    return { success: true, message: 'Lote cancelado e removido.' };
  });
}

export async function refundRemainingByBatch({ userId, creditId }: CancelBatchInput, db: TenantDb) {
  return withTx(db, async (t) => {
    const lot = await db.StudentCredit.findOne({
      where: { id: creditId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lot) throw new Error('Lote não encontrado.');

    const refund = lot.availableCredits;

    await db.CreditTransaction.create(
      {
        studentCreditId: lot.id,
        userId,
        delta: -refund,
        reason: 'refund',
        note: 'Estorno de saldo remanescente',
      },
      { transaction: t }
    );

    lot.availableCredits = 0;
    lot.status = 'exhausted';
    await lot.save({ transaction: t });

    return { success: true, message: `Estornados ${refund} créditos do lote #${creditId}.` };
  });
}

export async function expireDueCredits(db: TenantDb) {
  const now = new Date();

  return withTx(db, async (t) => {
    const expiredLots = await db.StudentCredit.findAll({
      where: {
        status: 'active',
        expiresAt: { [Op.lt]: now },
        availableCredits: { [Op.gt]: 0 },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const lot of expiredLots) {
      await db.CreditTransaction.create(
        {
          studentCreditId: lot.id,
          userId: lot.userId,
          delta: -lot.availableCredits,
          reason: 'expiration',
          note: 'Expiração automática',
        },
        { transaction: t }
      );

      lot.availableCredits = 0;
      lot.status = 'expired';
      await lot.save({ transaction: t });
    }

    return {
      success: true,
      message: `Expiração processada. Lotes afetados: ${expiredLots.length}.`,
    };
  });
}

export async function getBalanceByProduct(userId: number, db: TenantDb) {
  const now = new Date();

  const rows = await db.StudentCredit.findAll({
    attributes: [
      'productId',
      [fn('SUM', col('availableCredits')), 'available'],
    ],
    where: {
      userId,
      status: 'active',
      expiresAt: { [Op.gte]: now },
      availableCredits: { [Op.gt]: 0 },
    },
    group: ['productId'],
    raw: true,
  });

  return rows.map((r: any) => ({
    productId: r.productId,
    available: Number(r.available ?? 0),
  }));
}

export async function listCustomerCredits(filter: ListCreditsFilter, db: TenantDb): Promise<any[]> {
  const where: any = { userId: filter.userId };

  if (filter.productId) where.productId = filter.productId;
  if (filter.status) where.status = filter.status;

  return db.StudentCredit.findAll({
    where,
    order: [
      ['status', 'ASC'],
      ['expiresAt', 'ASC'],
      ['id', 'ASC'],
    ],
  });
}

export async function checkAvailability(input: CheckAvailabilityInput, db: TenantDb): Promise<boolean> {
  const { userId, productId, quantity } = input;
  if (quantity <= 0) return true;

  const now = new Date();

  const row = await db.StudentCredit.findOne({
    attributes: [[fn('SUM', col('availableCredits')), 'available']],
    where: {
      userId,
      productId,
      status: 'active',
      expiresAt: { [Op.gte]: now },
      availableCredits: { [Op.gt]: 0 },
    },
    raw: true,
  });

  const available = Number((row as any)?.available ?? 0);
  return available >= quantity;
}

export async function getCreditHistory(userId: number, db: TenantDb): Promise<any[]> {
  return db.CreditTransaction.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}
