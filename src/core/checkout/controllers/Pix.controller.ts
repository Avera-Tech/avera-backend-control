import { Request, Response } from 'express';
import crypto from 'crypto';
import Student from '../../../modules/user/models/User.model';
import Product from '../../products/models/Product.model';
import Transaction from '../models/Transaction.model';
import { savePendingPixTransaction } from './Transaction.controller';
import { updateCustomerBalance } from './Balance.controller';
import { checkPurchaseLimit, createItemsAfterTransaction, activateItemsByTransaction } from './Items.controller';
import { createPixOrder, PagarmeOrderItem } from '../services/pagarme.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

// ─── POST /checkout/pix ───────────────────────────────────────────────────────

export const checkoutPix = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { studentId, products, pix }: CheckoutPixRequest = req.body;

    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
    }

    const productIds = products.map((p) => p.productId);
    const productInfos = await Product.findAll({ where: { id: productIds } });

    if (!productInfos.length) {
      return res.status(404).json({ success: false, message: 'Produtos não encontrados.' });
    }

    // Verificar limite de compras
    for (const item of products) {
      const allowed = await checkPurchaseLimit(Number(studentId), item.productId);
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

    const result = await createPixOrder(customer, items, pix ?? {});

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao gerar PIX.',
        details: result.message,
      });
    }

    // Salvar transação como pending — será ativada pelo webhook
    await savePendingPixTransaction(
      result.data,
      creditTotal,
      Number(studentId),
      productTypeId ?? undefined
    );

    // Criar itens com status 'pendente' (ativados no webhook)
    try {
      await createItemsAfterTransaction(result.data.id, Number(studentId), items);
    } catch (err) {
      console.error('[Checkout PIX] Erro ao criar itens:', err);
    }

    // Extrair QR code da resposta da Pagar.me
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

// ─── POST /checkout/pix/webhook ───────────────────────────────────────────────
// Recebe eventos da Pagar.me e confirma o pagamento PIX

export const pixWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validar assinatura do webhook (HMAC-SHA256)
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

    // Responder imediatamente para a Pagar.me (evitar timeout)
    res.status(200).json({ received: true });

    // Processar o evento de forma assíncrona
    const { type, data } = req.body;

    if (type === 'charge.paid') {
      await handlePixPaid(data);
    } else if (type === 'charge.refunded') {
      await handlePixRefunded(data);
    } else if (type === 'charge.payment_failed') {
      await handlePixFailed(data);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[PIX Webhook] Erro:', error);
    return res.status(500).json({ message: 'Erro ao processar webhook.' });
  }
};

// ─── Handlers internos ────────────────────────────────────────────────────────

async function handlePixPaid(chargeData: any) {
  try {
    console.log('[PIX] Pagamento confirmado:', chargeData.id);

    const transaction = await Transaction.findOne({
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

    // Atualizar status da transação
    await transaction.update({ status: 'paid', paidAt: new Date() });

    // Adicionar créditos ao aluno
    await updateCustomerBalance(
      transaction.studentId,
      transaction.balance,
      transaction.transactionId,
      true,
      transaction.productTypeId
    );

    // Ativar itens
    await activateItemsByTransaction(transaction.transactionId);

    console.log('[PIX] Créditos adicionados e itens ativados.');
  } catch (error) {
    console.error('[PIX] Erro ao processar pagamento confirmado:', error);
  }
}

async function handlePixRefunded(chargeData: any) {
  try {
    console.log('[PIX] Estorno:', chargeData.id);

    const transaction = await Transaction.findOne({
      where: { chargeId: chargeData.id },
    });

    if (!transaction) return;

    await transaction.update({ status: 'refunded' });

    // Remover créditos do aluno
    await updateCustomerBalance(
      transaction.studentId,
      transaction.balance,
      transaction.transactionId,
      false, // remover
      transaction.productTypeId
    );

    console.log('[PIX] Estorno processado.');
  } catch (error) {
    console.error('[PIX] Erro ao processar estorno:', error);
  }
}

async function handlePixFailed(chargeData: any) {
  try {
    console.log('[PIX] Falha no pagamento:', chargeData.id);

    const transaction = await Transaction.findOne({
      where: { chargeId: chargeData.id },
    });

    if (!transaction) return;

    await transaction.update({ status: 'failed' });

    console.log('[PIX] Status atualizado para failed.');
  } catch (error) {
    console.error('[PIX] Erro ao processar falha:', error);
  }
}