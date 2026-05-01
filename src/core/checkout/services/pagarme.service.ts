// Wrapper da API Pagar.me v5
// Documentação: https://docs.pagar.me/reference

const PAGARME_BASE_URL = 'https://api.pagar.me/core/v5';

function getAuthHeader(): string {
  const key = process.env.PAGARME_SECRET_KEY;
  if (!key) throw new Error('PAGARME_SECRET_KEY não configurada.');
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

export interface PagarmeOrderItem {
  itemId: string | number;
  amount: number;       // em centavos
  description: string;
  quantity: number;
  credit: number;
  code?: string;
}

export interface PagarmeCustomer {
  name: string;
  email: string;
  document: string;
  type: 'individual' | 'company';
  address?: {
    line_1?: string;
    line_2?: string;
    zip_code?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  phones?: {
    mobile_phone?: {
      country_code: string;
      area_code: string;
      number: string;
    };
  };
}

// ─── Cartão de crédito ───────────────────────────────────────────────────────

export interface CreditCardPayment {
  number: string;
  holder_name: string;
  exp_month: string;
  exp_year: string;
  cvv: string;
  installments?: number;
  billingAddress?: any;
}

export async function createCreditCardOrder(
  customer: PagarmeCustomer,
  items: PagarmeOrderItem[],
  card: CreditCardPayment
) {
  const billingAddress = card.billingAddress ?? {
    line_1: customer.address?.line_1 ?? 'Endereço não informado',
    zip_code: customer.address?.zip_code ?? '00000000',
    city: customer.address?.city ?? 'Cidade',
    state: customer.address?.state ?? 'SP',
    country: 'BR',
  };

  const phone = extractPhone(customer);

  const payload = {
    closed: true,
    customer: {
      name: customer.name,
      type: customer.type,
      email: customer.email,
      document: customer.document,
      address: billingAddress,
      phones: { mobile_phone: phone },
    },
    items,
    payments: [
      {
        payment_method: 'credit_card',
        credit_card: {
          installments: card.installments ?? 1,
          statement_descriptor: process.env.PAGARME_STATEMENT_DESCRIPTOR ?? 'AVERA',
          card: {
            number: card.number,
            holder_name: card.holder_name,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            cvv: card.cvv,
            billing_address: billingAddress,
          },
        },
      },
    ],
  };

  return sendOrder(payload);
}

// ─── PIX ─────────────────────────────────────────────────────────────────────

export interface PixPayment {
  expires_in?: number;
  expires_at?: string;
  additional_information?: Array<{ name: string; value: string }>;
  metadata?: Record<string, any>;
}

export async function createPixOrder(
  customer: PagarmeCustomer,
  items: PagarmeOrderItem[],
  pix: PixPayment
) {
  const phone = extractPhone(customer);

  const payload: any = {
    closed: true,
    customer: {
      name: customer.name,
      type: customer.type,
      email: customer.email,
      document: customer.document,
      phones: { mobile_phone: phone },
    },
    items,
    payments: [
      {
        payment_method: 'pix',
        pix: {
          expires_in: pix.expires_in ?? 3600,
          ...(pix.expires_at ? { expires_at: pix.expires_at } : {}),
          additional_information: pix.additional_information ?? [],
        },
      },
    ],
    ...(pix.metadata ? { metadata: pix.metadata } : {}),
  };

  return sendOrder(payload);
}

// ─── Dinheiro / Cash ─────────────────────────────────────────────────────────

export interface CashPayment {
  description?: string;
  confirm?: boolean;
  metadata?: Record<string, any>;
}

export async function createCashOrder(
  customer: PagarmeCustomer,
  items: PagarmeOrderItem[],
  cash: CashPayment
) {
  const payload = {
    closed: true,
    customer: {
      name: customer.name,
      type: customer.type,
      email: customer.email,
      document: customer.document,
      address: { country: 'BR' },
      phones: {
        mobile_phone: { country_code: '55', area_code: '11', number: '999999999' },
      },
    },
    items,
    payments: [
      {
        payment_method: 'cash',
        cash: {
          description: cash.description ?? 'Pagamento em dinheiro',
          confirm: cash.confirm ?? false,
          metadata: cash.metadata ?? {},
        },
      },
    ],
  };

  return sendOrder(payload);
}

// ─── Helper: envio para API ───────────────────────────────────────────────────

async function sendOrder(payload: any) {
  try {
    const response = await fetch(`${PAGARME_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Pagar.me] Falha:', data);
      return {
        success: false,
        message: data.message ?? 'Erro na transação',
        errors: data.errors ?? data,
        data,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Pagar.me] Erro de rede:', err);
    return { success: false, message: err.message, data: null };
  }
}

// ─── Helper: extrair telefone do documento do cliente ────────────────────────

function extractPhone(customer: PagarmeCustomer) {
  const phone = customer.phones?.mobile_phone;
  if (phone) return phone;

  return { country_code: '55', area_code: '11', number: '999999999' };
}