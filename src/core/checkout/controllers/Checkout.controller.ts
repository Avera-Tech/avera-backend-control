import { Request, Response } from 'express';
import User from '../../../modules/user/models/User.model';
import Product from '../../products/models/Product.model';
import { saveTransaction } from './Transaction.controller';
import { updateCustomerBalance } from './Balance.controller';
import { checkPurchaseLimit, createItemsAfterTransaction } from './Items.controller';
import {
  createCreditCardOrder,
  createCashOrder,
  PagarmeOrderItem,
} from '../services/pagarme.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ProductRequest {
  productId: string;
  quantity: number;
}

interface CardPaymentRequest {
  number: string;
  holder_name: string;
  exp_month: string;
  exp_year: string;
  cvv: string;
  installments?: number;
}

interface CashPaymentRequest {
  description?: string;
  confirm?: boolean;
  metadata?: Record<string, any>;
}

interface CheckoutCardRequest {
  userId: string;
  products: ProductRequest[];
  payment: CardPaymentRequest;
  billingAddress?: any;
}

interface CheckoutCashRequest {
  userId: string;
  products: ProductRequest[];
  cash: CashPaymentRequest;
}

// ─── Helper: montar itens da ordem Pagar.me ──────────────────────────────────

async function buildOrderItems(
  products: ProductRequest[],
  userId: number
): Promise<{ items: PagarmeOrderItem[]; creditTotal: number; productTypeId: number | null }> {
  const productIds = products.map((p) => p.productId);
  const productInfos = await Product.findAll({ where: { id: productIds } });

  if (!productInfos.length) throw new Error('Produtos não encontrados.');

  let creditTotal = 0;
  let productTypeId: number | null = null;

  // Verificar limite de compra por produto
  for (const item of products) {
    const allowed = await checkPurchaseLimit(userId, item.productId);
    if (!allowed) {
      throw new Error(
        `O produto ${item.productId} atingiu o limite de compras para este aluno.`
      );
    }
  }

  const items: PagarmeOrderItem[] = products.map((item) => {
    const product = productInfos.find((p) => p.id.toString() === item.productId);
    if (!product) throw new Error(`Produto ${item.productId} não encontrado.`);

    creditTotal += product.credits * item.quantity;
    productTypeId = product.productTypeId ?? null;

    return {
      itemId: product.id,
      amount: Math.round(product.value * 100), // em centavos
      description: product.name.replace(/[^a-zA-Z0-9 ]/g, ''),
      quantity: item.quantity,
      credit: product.credits,
      code: String(product.id),
    };
  });

  return { items, creditTotal, productTypeId };
}

// ─── POST /checkout/card ──────────────────────────────────────────────────────

export const checkoutCard = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, products, payment, billingAddress }: CheckoutCardRequest = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
    }

    let items: PagarmeOrderItem[];
    let creditTotal: number;
    let productTypeId: number | null;

    try {
      ({ items, creditTotal, productTypeId } = await buildOrderItems(products, Number(userId)));
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const rawDoc = (user as any).document ?? (user as any).identity ?? '';
    const customer = {
      name: user.name,
      email: user.email,
      document: String(rawDoc).replace(/\D/g, ''),
      type: 'individual' as const,
    };

    const result = await createCreditCardOrder(customer, items, {
      ...payment,
      billingAddress,
    });

    if (!result.success || result.data?.status !== 'paid') {
      return res.status(500).json({
        success: false,
        message: 'Falha ao processar pagamento.',
        details: result.message ?? result.data,
      });
    }

    const save = await saveTransaction(result.data, creditTotal, Number(userId), productTypeId ?? undefined);
    if (!save.success) {
      return res.status(500).json({ success: false, message: 'Falha ao salvar transação.' });
    }

    await updateCustomerBalance(Number(userId), creditTotal, result.data.id, true, productTypeId!);

    try {
      await createItemsAfterTransaction(result.data.id, Number(userId), items);
    } catch (err) {
      console.error('[Checkout] Erro ao criar itens:', err);
    }

    return res.status(200).json({
      success: true,
      message: 'Pagamento concluído com sucesso.',
      transactionId: result.data.id,
    });
  } catch (error: any) {
    console.error('[Checkout Card] Erro:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /checkout/cash ──────────────────────────────────────────────────────

export const checkoutCash = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, products, cash }: CheckoutCashRequest = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado.' });
    }

    let items: PagarmeOrderItem[];
    let creditTotal: number;
    let productTypeId: number | null;

    try {
      ({ items, creditTotal, productTypeId } = await buildOrderItems(products, Number(userId)));
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const rawDoc = (user as any).document ?? (user as any).identity ?? '';
    const customer = {
      name: user.name,
      email: user.email,
      document: String(rawDoc).replace(/\D/g, ''),
      type: 'individual' as const,
    };

    const result = await createCashOrder(customer, items, cash ?? {});

    if (!result.success || result.data?.status !== 'paid') {
      return res.status(500).json({
        success: false,
        message: 'Falha ao processar pagamento em dinheiro.',
        details: result.message ?? result.data,
      });
    }

    const save = await saveTransaction(result.data, creditTotal, Number(userId), productTypeId ?? undefined);
    if (!save.success) {
      return res.status(500).json({ success: false, message: 'Falha ao salvar transação.' });
    }

    await updateCustomerBalance(Number(userId), creditTotal, result.data.id, true, productTypeId!);

    try {
      await createItemsAfterTransaction(result.data.id, Number(userId), items);
    } catch (err) {
      console.error('[Checkout Cash] Erro ao criar itens:', err);
    }

    return res.status(200).json({
      success: true,
      message: 'Pagamento em dinheiro concluído com sucesso.',
      transactionId: result.data.id,
    });
  } catch (error: any) {
    console.error('[Checkout Cash] Erro:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};