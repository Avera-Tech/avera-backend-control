import { consumeCredits, purchaseCredits } from "../../../fit/credits/services/credits.service";


/**
 * Wrapper de compatibilidade com o fluxo de checkout.
 *
 * ATENÇÃO — diferença do studio-backend:
 *   - idCustomer  → userId
 *   - productTypeId → productId  (FK direto para products, não productTypes)
 */
export async function updateCustomerBalance(
  userId: number,
  quantity: number,
  transactionId: string,
  add: boolean,
  productId: number
) {
  if (add) {
    return purchaseCredits({
      userId,
      productId,
      quantity,
      transactionId,
      origin: 'Compra',
    });
  }

  return consumeCredits({ userId, productId, quantity });
}