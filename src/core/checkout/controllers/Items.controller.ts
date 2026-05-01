import { TenantDb } from '../../../config/tenantModels';

export interface ItemData {
  itemId: string | number;
  code?: string;
  description: string;
  quantity: number;
  amount: number;
  credit: number;
}

export async function createItemsAfterTransaction(
  transactionId: string,
  studentId: number,
  items: ItemData[],
  db: TenantDb
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    for (const item of items) {
      await db.Item.create({
        itemId: Number(item.itemId),
        transactionId,
        itemCode: item.code ?? String(item.itemId),
        description: item.description,
        quantity: item.quantity,
        amount: item.amount,
        balance: item.credit,
        status: 'concluído',
        studentId,
      });
    }

    return { success: true, message: 'Itens criados com sucesso.' };
  } catch (error: any) {
    console.error('[ItemsController] Erro ao criar itens:', error);
    return { success: false, message: 'Erro ao criar itens.', error: error.message };
  }
}

export async function checkPurchaseLimit(
  studentId: number,
  productId: number | string,
  db: TenantDb
): Promise<boolean> {
  const product = await db.Product.findByPk(productId);

  if (!product || !product.purchaseLimit) return true;

  const purchaseCount = await db.Item.count({
    where: { studentId, itemId: productId },
  });

  return purchaseCount < product.purchaseLimit;
}

export async function activateItemsByTransaction(transactionId: string, db: TenantDb): Promise<void> {
  await db.Item.update({ status: 'ativo' }, { where: { transactionId } });
}
