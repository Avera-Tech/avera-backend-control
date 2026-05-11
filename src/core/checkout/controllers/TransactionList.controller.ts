import { Request, Response } from 'express';
import { Op } from 'sequelize';

const DEFAULT_PAGE     = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE     = 100;

export const listTransactions = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { Transaction, Item } = req.tenantDb;

    const page    = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, parseInt(req.query.perPage as string) || DEFAULT_PER_PAGE));
    const offset  = (page - 1) * perPage;

    const where: any = {};

    if (req.query.status)         where.status         = req.query.status;
    if (req.query.payment_method) where.payment_method = req.query.payment_method;
    if (req.query.studentId)      where.studentId      = Number(req.query.studentId);

    if (req.query.search) {
      const like = `%${req.query.search}%`;
      where[Op.or] = [
        { customerName:  { [Op.like]: like } },
        { customerEmail: { [Op.like]: like } },
        { transactionId: { [Op.like]: like } },
      ];
    }

    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt[Op.gte] = new Date(req.query.dateFrom as string);
      if (req.query.dateTo)   where.createdAt[Op.lte] = new Date(req.query.dateTo   as string);
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      limit:  perPage,
      offset,
      order:  [['createdAt', 'DESC']],
    });

    // Fetch items for all returned transactions in one query
    const txIds = transactions.map((t) => (t as any).transactionId);
    const items = txIds.length
      ? await Item.findAll({ where: { transactionId: txIds } })
      : [];

    const itemsByTx: Record<string, any[]> = {};
    for (const item of items) {
      const id = (item as any).transactionId;
      if (!itemsByTx[id]) itemsByTx[id] = [];
      itemsByTx[id].push(item);
    }

    const data = transactions.map((t: any) => ({
      ...t.toJSON(),
      items: itemsByTx[t.transactionId] ?? [],
    }));

    return res.json({
      success: true,
      pagination: {
        total: count,
        page,
        perPage,
        totalPages: Math.ceil(count / perPage),
        hasNext: page < Math.ceil(count / perPage),
        hasPrev: page > 1,
      },
      transactions: data,
    });
  } catch (error: any) {
    console.error('[TransactionList] Erro:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
