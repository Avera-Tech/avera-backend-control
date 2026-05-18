import { TenantDb } from '../../../config/tenantModels';
import { consumeCredits, purchaseCredits } from '../../../fit/credits/services/credits.service';

export interface BalanceItem {
  productId: number;
  credits: number;
  quantity: number;
}

export async function addCreditsForItems(
  userId: number,
  items: BalanceItem[],
  transactionId: string,
  db: TenantDb
): Promise<void> {
  for (const item of items) {
    const total = item.credits * item.quantity;
    if (total <= 0) continue;
    await purchaseCredits({
      userId,
      productId: item.productId,
      quantity: total,
      transactionId,
      origin: 'Compra',
    }, db);
  }
}

export async function addCreditsFromItemRows(
  userId: number,
  transactionId: string,
  db: TenantDb
): Promise<void> {
  const rows = await db.Item.findAll({ where: { transactionId } });
  for (const row of rows) {
    const total = (row as any).balance * ((row as any).quantity ?? 1);
    if (total <= 0) continue;
    await purchaseCredits({
      userId,
      productId: (row as any).itemId,
      quantity: total,
      transactionId,
      origin: 'Compra PIX',
    }, db);
  }
}

export async function updateCustomerBalance(
  userId: number,
  quantity: number,
  transactionId: string,
  add: boolean,
  productId: number,
  db: TenantDb
) {
  if (add) {
    return purchaseCredits({ userId, productId, quantity, transactionId, origin: 'Compra' }, db);
  }
  return consumeCredits({ userId, productId, quantity }, db);
}
