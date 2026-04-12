import Transaction from '../models/Transaction.model';

interface PagarmeTransactionData {
  status: string;
  id: string;
  code: string;
  amount: number;
  currency: string;
  charges: Array<{ id: string; payment_method: string }>;
  closed: boolean;
  customer: {
    id: string;
    name: string;
    email: string;
    document: string;
  };
  closed_at: string;
}

export async function saveTransaction(
  data: PagarmeTransactionData,
  credit: number,
  studentId: number,
  productTypeId?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const transaction = await Transaction.create({
      transactionId: data.id,
      status: data.status,
      transactionType: 1, // 1 = crédito
      transactionCode: data.code,
      chargeId: data.charges[0]?.id ?? '',
      amount: data.amount,
      currency: data.currency,
      payment_method: data.charges[0]?.payment_method ?? '',
      closed: data.closed,
      customerId: data.customer.id,
      studentId,
      customerName: data.customer.name,
      customerEmail: data.customer.email,
      customerDocument: data.customer.document,
      balance: credit,
      productTypeId,
      closedAt: new Date(data.closed_at),
    });

    if (!transaction) {
      return { success: false, message: 'Erro ao criar transação' };
    }

    return { success: true, message: 'Transação salva com sucesso' };
  } catch (error: any) {
    console.error('[TransactionController] Erro:', error);
    return { success: false, message: error.message ?? 'Erro ao criar transação' };
  }
}

export async function savePendingPixTransaction(
  data: {
    id: string;
    code: string;
    status: string;
    amount: number;
    charges: Array<{ id: string; payment_method: string }>;
    customer: { id: string; name: string; email: string; document: string };
  },
  credit: number,
  studentId: number,
  productTypeId?: number
): Promise<{ success: boolean; message: string }> {
  try {
    await Transaction.create({
      transactionId: data.id,
      status: 'pending', // PIX começa como pending
      transactionType: 1,
      transactionCode: data.code,
      chargeId: data.charges[0]?.id ?? '',
      amount: data.amount,
      currency: 'BRL',
      payment_method: 'pix',
      closed: false,
      customerId: data.customer.id,
      studentId,
      customerName: data.customer.name,
      customerEmail: data.customer.email,
      customerDocument: data.customer.document,
      balance: credit,
      productTypeId,
      closedAt: new Date(),
    });

    return { success: true, message: 'Transação PIX pendente salva' };
  } catch (error: any) {
    console.error('[TransactionController] Erro PIX pending:', error);
    return { success: false, message: error.message };
  }
}