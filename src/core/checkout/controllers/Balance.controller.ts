import { TenantDb } from '../../../config/tenantModels';
import { consumeCredits, purchaseCredits } from '../../../fit/credits/services/credits.service';

export async function updateCustomerBalance(
  userId: number,
  quantity: number,
  transactionId: string,
  add: boolean,
  productId: number,
  db: TenantDb
) {
  if (add) {
    return purchaseCredits({
      userId,
      productId,
      quantity,
      transactionId,
      origin: 'Compra',
    }, db);
  }

  return consumeCredits({ userId, productId, quantity }, db);
}
