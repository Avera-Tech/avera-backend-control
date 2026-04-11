import { Request, Response } from 'express';
import { Op } from 'sequelize';
import coreDB from '../../../config/database.core';
import StudentCredit from '../models/StudentCredit.model';
import CreditTransaction from '../models/CreditTransaction.model';
import ClientUser from '../../../modules/user/models/User.model';
import Product from '../../products/models/Product.model';
import ProductType from '../../products/models/ProductType.model';

export class CreditController {

  // ─── POST /users/:id/credits ──────────────────────────────────────────────────
  /**
   * Recebe productId, cria lote de créditos e registra transação com reason = 'purchase'.
   * Toda a operação é atômica via transaction Sequelize.
   */
  static async assignCredits(req: Request, res: Response): Promise<Response> {
    const t = await coreDB.transaction();
    try {
      const clientId = Number(req.params.id);
      const { productId } = req.body;

      if (!productId) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'productId é obrigatório' });
      }

      const client = await ClientUser.findByPk(clientId, { transaction: t });
      if (!client) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
      }

      const product = await Product.findOne({
        where: { id: productId, active: true },
        transaction: t,
      });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Produto não encontrado ou inativo' });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + product.validityDays);

      const credit = await StudentCredit.create(
        {
          clientId,
          productId: product.id,
          totalCredits:     product.credits,
          usedCredits:      0,
          availableCredits: product.credits,
          status:           'active',
          expiresAt,
        },
        { transaction: t }
      );

      await CreditTransaction.create(
        {
          studentCreditId: credit.id,
          clientId,
          delta:   product.credits,
          reason:  'purchase',
          note:    `Compra do produto: ${product.name}`,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(201).json({
        success: true,
        message: 'Créditos atribuídos com sucesso',
        credit: {
          id:               credit.id,
          clientId:         credit.clientId,
          productId:        credit.productId,
          totalCredits:     credit.totalCredits,
          usedCredits:      credit.usedCredits,
          availableCredits: credit.availableCredits,
          status:           credit.status,
          expiresAt:        credit.expiresAt,
        },
      });
    } catch (error: unknown) {
      await t.rollback();
      console.error('Erro ao atribuir créditos:', error);
      const message = error instanceof Error ? error.message : undefined;
      return res.status(500).json({
        success: false,
        error: 'Erro ao atribuir créditos',
        message: process.env.NODE_ENV === 'development' ? message : undefined,
      });
    }
  }

  // ─── GET /users/:id/credits ───────────────────────────────────────────────────
  /**
   * Retorna todos os lotes do cliente com total consolidado de créditos disponíveis.
   */
  static async getClientCredits(req: Request, res: Response): Promise<Response> {
    try {
      const clientId = Number(req.params.id);

      const client = await ClientUser.findByPk(clientId);
      if (!client) {
        return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
      }

      const credits = await StudentCredit.findAll({
        where: { clientId },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'credits', 'validityDays'],
            include: [
              {
                model: ProductType,
                as: 'productType',
                attributes: ['id', 'name', 'color'],
              },
            ],
          },
        ],
        order: [['expiresAt', 'ASC']],
      });

      const totalAvailable = credits
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => sum + c.availableCredits, 0);

      return res.json({
        success: true,
        summary: {
          totalAvailable,
          totalLotes: credits.length,
          activeLotes: credits.filter((c) => c.status === 'active').length,
        },
        credits,
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar créditos:', error);
      const message = error instanceof Error ? error.message : undefined;
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar créditos',
        message: process.env.NODE_ENV === 'development' ? message : undefined,
      });
    }
  }

  // ─── POST /users/:id/credits/consume ─────────────────────────────────────────
  /**
   * Debita 1 crédito do lote mais próximo de vencer (FEFO).
   * Retorna 400 se saldo insuficiente.
   */
  static async consumeCredit(req: Request, res: Response): Promise<Response> {
    const t = await coreDB.transaction();
    try {
      const clientId = Number(req.params.id);
      const { referenceId, note } = req.body;

      const client = await ClientUser.findByPk(clientId, { transaction: t });
      if (!client) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
      }

      const lote = await StudentCredit.findOne({
        where: {
          clientId,
          status:           'active',
          availableCredits: { [Op.gt]: 0 },
          expiresAt:        { [Op.gt]: new Date() },
        },
        order: [['expiresAt', 'ASC']],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!lote) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Saldo de créditos insuficiente',
        });
      }

      lote.usedCredits      += 1;
      lote.availableCredits -= 1;

      if (lote.availableCredits === 0) {
        lote.status = 'exhausted';
      }

      await lote.save({ transaction: t });

      const transaction = await CreditTransaction.create(
        {
          studentCreditId: lote.id,
          clientId,
          delta:       -1,
          reason:      'consume',
          referenceId: referenceId ?? null,
          note:        note ?? null,
        },
        { transaction: t }
      );

      await t.commit();

      return res.json({
        success: true,
        message: 'Crédito consumido com sucesso',
        lote: {
          id:               lote.id,
          availableCredits: lote.availableCredits,
          usedCredits:      lote.usedCredits,
          status:           lote.status,
          expiresAt:        lote.expiresAt,
        },
        transaction: {
          id:     transaction.id,
          delta:  transaction.delta,
          reason: transaction.reason,
        },
      });
    } catch (error: unknown) {
      await t.rollback();
      console.error('Erro ao consumir crédito:', error);
      const message = error instanceof Error ? error.message : undefined;
      return res.status(500).json({
        success: false,
        error: 'Erro ao consumir crédito',
        message: process.env.NODE_ENV === 'development' ? message : undefined,
      });
    }
  }
}
