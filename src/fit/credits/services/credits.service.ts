import { Op, Transaction, fn, col } from 'sequelize';
import coreDB from '../../../config/database.core';
import StudentCredit from '../models/StudentCredit.model';
import CreditTransaction from '../models/CreditTransaction.model';
import Product from '../../../core/products/models/Product.model';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PurchaseInput = {
  userId: number;
  productId: number;       // FK direto para products (não productType)
  quantity: number;
  transactionId: string;   // ID da transação Pagar.me — salvo como note no ledger
  origin?: string;         // 'Compra', 'Bônus', etc.
  validityDays?: number;   // se omitido, busca no Product
};

export type ConsumeInput = {
  userId: number;
  productId: number;
  quantity: number;
  referenceId?: number;    // id da aula, reserva, etc. (auditoria)
};

export type CancelBatchInput = {
  userId: number;
  creditId: number;        // id do StudentCredit
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function withTx<T>(work: (t: Transaction) => Promise<T>): Promise<T> {
  return coreDB.transaction(work);
}

async function getValidityDays(productId: number, override?: number): Promise<number> {
  if (override !== undefined) return override;
  const product = await Product.findByPk(productId);
  const raw = (product as any)?.validityDays ?? (product as any)?.validity ?? 365;
  const days = Number(raw);
  return Number.isFinite(days) ? days : 365;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchaseCredits(input: PurchaseInput) {
  const { userId, productId, quantity, transactionId, origin = 'Compra', validityDays } = input;

  if (quantity <= 0) throw new Error('quantity deve ser > 0.');

  return withTx(async (t) => {
    const days = await getValidityDays(productId, validityDays);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const credit = await StudentCredit.create(
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

    // Registrar no ledger
    await CreditTransaction.create(
      {
        studentCreditId: credit.id,
        userId,
        delta: quantity,              // positivo = entrada
        reason: 'purchase',
        note: `${origin} — pagarme: ${transactionId}`,
      },
      { transaction: t }
    );

    return { success: true, message: 'Créditos adicionados com sucesso.', creditId: credit.id };
  });
}

// ─── Consume (FEFO + lock) ────────────────────────────────────────────────────

export async function consumeCredits(input: ConsumeInput) {
  const { userId, productId, quantity, referenceId } = input;

  if (quantity <= 0) throw new Error('quantity deve ser > 0.');

  return withTx(async (t) => {
    const now = new Date();

    // Busca lotes válidos, não vencidos e com saldo — ordem FEFO (vence primeiro, consome primeiro)
    const lots = await StudentCredit.findAll({
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

      // Ledger: delta negativo = saída
      await CreditTransaction.create(
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

// ─── Cancelar lote sem uso ────────────────────────────────────────────────────

export async function cancelBatchIfUnused({ userId, creditId }: CancelBatchInput) {
  return withTx(async (t) => {
    const lot = await StudentCredit.findOne({
      where: { id: creditId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lot) throw new Error('Lote não encontrado.');
    if (lot.usedCredits > 0) {
      throw new Error('Lote já possui consumo; não pode ser cancelado integralmente.');
    }

    await CreditTransaction.create(
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

// ─── Estornar saldo remanescente do lote ──────────────────────────────────────

export async function refundRemainingByBatch({ userId, creditId }: CancelBatchInput) {
  return withTx(async (t) => {
    const lot = await StudentCredit.findOne({
      where: { id: creditId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lot) throw new Error('Lote não encontrado.');

    const refund = lot.availableCredits;

    await CreditTransaction.create(
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

// ─── Expirar créditos vencidos (cron/admin) ───────────────────────────────────

export async function expireDueCredits() {
  const now = new Date();

  return withTx(async (t) => {
    const expiredLots = await StudentCredit.findAll({
      where: {
        status: 'active',
        expiresAt: { [Op.lt]: now },
        availableCredits: { [Op.gt]: 0 },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const lot of expiredLots) {
      await CreditTransaction.create(
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

// ─── Saldo disponível por produto ─────────────────────────────────────────────

export async function getBalanceByProduct(userId: number) {
  const now = new Date();

  const rows = await StudentCredit.findAll({
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

// ─── Listar créditos do cliente ───────────────────────────────────────────────

export async function listCustomerCredits(filter: ListCreditsFilter) {
  const where: any = { userId: filter.userId };

  if (filter.productId) where.productId = filter.productId;
  if (filter.status) where.status = filter.status;

  return StudentCredit.findAll({
    where,
    order: [
      ['status', 'ASC'],
      ['expiresAt', 'ASC'],
      ['id', 'ASC'],
    ],
  });
}

// ─── Checar disponibilidade antes de reservar/consumir ───────────────────────

export async function checkAvailability(input: CheckAvailabilityInput): Promise<boolean> {
  const { userId, productId, quantity } = input;
  if (quantity <= 0) return true;

  const now = new Date();

  const row = await StudentCredit.findOne({
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

// ─── Histórico de transações do cliente ──────────────────────────────────────

export async function getCreditHistory(userId: number) {
  return CreditTransaction.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}