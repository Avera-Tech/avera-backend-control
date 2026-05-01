import { Request, Response } from 'express';
import crypto from 'crypto';
import { getTenantDb } from '../../../config/tenantConnectionManager';
import TenantConfig from '../../../master/models/TenantConfig.model';
import { savePendingPixTransaction } from './Transaction.controller';
import { updateCustomerBalance } from './Balance.controller';
import { checkPurchaseLimit, createItemsAfterTransaction, activateItemsByTransaction } from './Items.controller';
import { createPixOrder, PagarmeOrderItem } from '../services/pagarme.service';
import { TenantDb } from '../../../config/tenantModels';

interface ProductRequest {
  productId: string;
  quantity: number;
}

interface PixPaymentRequest {
  expires_in?: number;
  expires_at?: string;
  additional_information?: Array<{ name: string; value: string }>;
}

interface CheckoutPixRequest {
  studentId: string;
  products: ProductRequest[];
  pix?: PixPaymentRequest;
}

export const checkoutPix = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { ClientUser, Product } = req.tenantDb;
    const { studentId, products, pix }: CheckoutPixRequest = req.body;

    const student = await ClientUser.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
    }

    const productIds = products.map((p) => p.productId);
    const productInfos = await Product.findAll({ where: { id: productIds } });

    if (!productInfos.length) {
      return res.status(404).json({ success: false, message: 'Produtos não encontrados.' });
    }

    for (const item of products) {
      const allowed = await checkPurchaseLimit(Number(studentId), item.productId, req.tenantDb);
      if (!allowed) {
        return res.status(400).json({
          success: false,
          message: `O produto ${item.productId} atingiu o limite de compras para este aluno.`,
        });
      }
    }

    let creditTotal = 0;
    let productTypeId: number | null = null;

    const items: PagarmeOrderItem[] = products.map((item) => {
      const product = productInfos.find((p) => p.id.toString() === item.productId);
      if (!product) throw new Error(`Produto ${item.productId} não encontrado.`);

      creditTotal += product.credits;
      productTypeId = product.productTypeId ?? null;

      return {
        itemId: product.id,
        amount: Math.round(product.value * 100),
        description: product.name.replace(/[^a-zA-Z0-9 ]/g, ''),
        quantity: item.quantity,
        credit: product.credits,
        code: String(product.id),
      };
    });

    const rawDoc = (student as any).document ?? (student as any).identity ?? '';
    const customer = {
      name: student.name,
      email: student.email,
      document: String(rawDoc).replace(/\D/g, ''),
      type: 'individual' as const,
    };

    // Store clientId in metadata so the webhook can resolve the tenant DB
    const clientId = req.headers['x-client-id'] as string;
    const result = await createPixOrder(customer, items, { ...(pix ?? {}), metadata: { clientId } });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao gerar PIX.',
        details: result.message,
      });
    }

    await savePendingPixTransaction(
      result.data,
      creditTotal,
      Number(studentId),
      req.tenantDb,
      productTypeId ?? undefined
    );

    try {
      await createItemsAfterTransaction(result.data.id, Number(studentId), items, req.tenantDb);
    } catch (err) {
      console.error('[Checkout PIX] Erro ao criar itens:', err);
    }

    const charge = result.data?.charges?.[0];
    const lastTransaction = charge?.last_transaction;
    const qrCode = lastTransaction?.qr_code ?? null;
    const qrCodeUrl = lastTransaction?.qr_code_url ?? null;
    const expiresAt = lastTransaction?.expires_at ?? null;

    return res.status(200).json({
      success: true,
      message: 'PIX gerado com sucesso. Aguardando pagamento.',
      transactionId: result.data.id,
      pix: { qrCode, qrCodeUrl, expiresAt },
    });
  } catch (error: any) {
    console.error('[Checkout PIX] Erro:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Public webhook — called by Pagar.me, no X-Client-Id header.
// Resolves tenant DB from clientId stored in order metadata at checkout time.
export const pixWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    const signature = req.headers['x-hub-signature'] as string;
    if (signature && process.env.PAGARME_WEBHOOK_SECRET) {
      const expected =
        'sha256=' +
        crypto
          .createHmac('sha256', process.env.PAGARME_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');

      if (signature !== expected) {
        console.warn('[PIX Webhook] Assinatura inválida');
        return res.status(401).json({ message: 'Assinatura inválida.' });
      }
    }

    res.status(200).json({ received: true });

    const { type, data } = req.body;
    const clientId = data?.metadata?.clientId as string | undefined;

    if (!clientId) {
      console.warn('[PIX Webhook] clientId ausente nos metadados — ignorando evento');
      return res.status(200).json({ received: true });
    }

    const tenantConfig = await TenantConfig.findOne({ where: { clientId } });
    if (!tenantConfig) {
      console.error(`[PIX Webhook] Tenant '${clientId}' não encontrado`);
      return res.status(200).json({ received: true });
    }

    const db = getTenantDb({
      clientId: tenantConfig.clientId,
      dbHost: tenantConfig.dbHost,
      dbPort: tenantConfig.dbPort,
      dbUser: tenantConfig.dbUser,
      dbPass: tenantConfig.dbPass,
      dbName: tenantConfig.dbName,
    });

    if (type === 'charge.paid') {
      await handlePixPaid(data, db);
    } else if (type === 'charge.refunded') {
      await handlePixRefunded(data, db);
    } else if (type === 'charge.payment_failed') {
      await handlePixFailed(data, db);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[PIX Webhook] Erro:', error);
    return res.status(500).json({ message: 'Erro ao processar webhook.' });
  }
};

async function handlePixPaid(chargeData: any, db: TenantDb) {
  try {
    const transaction = await db.Transaction.findOne({
      where: { chargeId: chargeData.id },
    });

    if (!transaction) {
      console.error('[PIX] Transação não encontrada para chargeId:', chargeData.id);
      return;
    }

    if (transaction.status === 'paid') {
      console.log('[PIX] Transação já confirmada, ignorando.');
      return;
    }

    await transaction.update({ status: 'paid', paidAt: new Date() });

    await updateCustomerBalance(
      transaction.studentId,
      transaction.balance,
      transaction.transactionId,
      true,
      transaction.productTypeId,
      db
    );

    await activateItemsByTransaction(transaction.transactionId, db);

    console.log('[PIX] Créditos adicionados e itens ativados.');
  } catch (error) {
    console.error('[PIX] Erro ao processar pagamento confirmado:', error);
  }
}

async function handlePixRefunded(chargeData: any, db: TenantDb) {
  try {
    const transaction = await db.Transaction.findOne({
      where: { chargeId: chargeData.id },
    });

    if (!transaction) return;

    await transaction.update({ status: 'refunded' });

    await updateCustomerBalance(
      transaction.studentId,
      transaction.balance,
      transaction.transactionId,
      false,
      transaction.productTypeId,
      db
    );
  } catch (error) {
    console.error('[PIX] Erro ao processar estorno:', error);
  }
}

async function handlePixFailed(chargeData: any, db: TenantDb) {
  try {
    const transaction = await db.Transaction.findOne({
      where: { chargeId: chargeData.id },
    });

    if (!transaction) return;

    await transaction.update({ status: 'failed' });
  } catch (error) {
    console.error('[PIX] Erro ao processar falha:', error);
  }
}
