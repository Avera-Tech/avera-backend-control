import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';

export const getCheckoutStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { Transaction } = req.tenantDb;

    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ success: false, message: 'dateFrom e dateTo são obrigatórios' });
    }

    const from = new Date(String(dateFrom));
    const to   = new Date(String(dateTo));
    to.setHours(23, 59, 59, 999);

    const result = await Transaction.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where: {
        closed: true,
        createdAt: { [Op.between]: [from, to] },
      },
      raw: true,
    }) as { total: string | null } | null;

    const total = result?.total ? Number(result.total) : 0;

    return res.json({ success: true, data: { total } });
  } catch (error: any) {
    console.error('[CheckoutStats] Erro:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
