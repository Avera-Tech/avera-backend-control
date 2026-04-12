import Item from '../models/Item.model';
// TODO: ajuste o path conforme a localização do Product.model no seu projeto
import Product from '../../products/models/Product.model';

export interface ItemData {
  itemId: string | number;
  code?: string;
  description: string;
  quantity: number;
  amount: number;
  credit: number;
}

// Cria os itens no banco após confirmação da transação
export async function createItemsAfterTransaction(
  transactionId: string,
  studentId: number,
  items: ItemData[]
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    for (const item of items) {
      await Item.create({
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

// Verifica se o aluno ainda pode comprar o produto (respeitando purchaseLimit)
export async function checkPurchaseLimit(
  studentId: number,
  productId: number | string
): Promise<boolean> {
  const product = await Product.findByPk(productId);

  // Sem limite definido → sempre permitido
  if (!product || !product.purchaseLimit) return true;

  const purchaseCount = await Item.count({
    where: { studentId, itemId: productId },
  });

  return purchaseCount < product.purchaseLimit;
}

// Atualiza status dos itens de uma transação (usado após confirmação de PIX)
export async function activateItemsByTransaction(transactionId: string): Promise<void> {
  await Item.update({ status: 'ativo' }, { where: { transactionId } });
}