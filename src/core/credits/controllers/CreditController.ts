import { Request, Response } from 'express';
import { Op } from 'sequelize';
import coreDB from '../../../config/database.core';
import StudentCredit from '../models/StudentCredit.model';
import CreditTransaction from '../models/CreditTransaction.model';
import Student from '../../students/models/Students.model';
import Product from '../../products/models/Product.model';
import ProductType from '../../products/models/ProductType.model';

export class CreditController {

  // ─── POST /students/:id/credits ──────────────────────────────────────────────
  /**
   * Recebe product_id, cria lote de créditos e registra transação com reason = 'purchase'.
   * Toda a operação é atômica via transaction Sequelize.
   */
  static async assignCredits(req: Request, res: Response): Promise<Response> {
    const t = await coreDB.transaction();
    try {
      const studentId = Number(req.params.id);
      const { productId } = req.body;

      if (!productId) {
        await t.rollback();
        return res.status(400).json({ success: false, error: 'productId é obrigatório' });
      }

      // 1. Verificar se o aluno existe
      const student = await Student.findByPk(studentId, { transaction: t });
      if (!student) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      // 2. Verificar se o produto existe e está ativo
      const product = await Product.findOne({
        where: { id: productId, active: true },
        transaction: t,
      });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Produto não encontrado ou inativo' });
      }

      // 3. Calcular expiração: hoje + validityDays
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + product.validityDays);

      // 4. Criar lote de créditos
      const credit = await StudentCredit.create(
        {
          studentId,
          productId: product.id,
          totalCredits:     product.credits,
          usedCredits:      0,
          availableCredits: product.credits,
          status:           'active',
          expiresAt,
        },
        { transaction: t }
      );

      // 5. Registrar transação de entrada
      await CreditTransaction.create(
        {
          studentCreditId: credit.id,
          studentId,
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
          studentId:        credit.studentId,
          productId:        credit.productId,
          totalCredits:     credit.totalCredits,
          usedCredits:      credit.usedCredits,
          availableCredits: credit.availableCredits,
          status:           credit.status,
          expiresAt:        credit.expiresAt,
        },
      });
    } catch (error: any) {
      await t.rollback();
      console.error('Erro ao atribuir créditos:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atribuir créditos',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // ─── GET /students/:id/credits ────────────────────────────────────────────────
  /**
   * Retorna todos os lotes do aluno com total consolidado de créditos disponíveis.
   */
  static async getStudentCredits(req: Request, res: Response): Promise<Response> {
    try {
      const studentId = Number(req.params.id);

      // 1. Verificar se o aluno existe
      const student = await Student.findByPk(studentId);
      if (!student) {
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      // 2. Buscar todos os lotes com produto populado
      const credits = await StudentCredit.findAll({
        where: { studentId },
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

      // 3. Consolidar total disponível apenas dos lotes ativos
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
    } catch (error: any) {
      console.error('Erro ao buscar créditos:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar créditos',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // ─── POST /students/:id/credits/consume ──────────────────────────────────────
  /**
   * Debita 1 crédito do lote mais próximo de vencer (FEFO).
   * Retorna 400 se saldo insuficiente.
   * Toda a operação é atômica via transaction Sequelize.
   */
  static async consumeCredit(req: Request, res: Response): Promise<Response> {
    const t = await coreDB.transaction();
    try {
      const studentId = Number(req.params.id);
      const { referenceId, note } = req.body;

      // 1. Verificar se o aluno existe
      const student = await Student.findByPk(studentId, { transaction: t });
      if (!student) {
        await t.rollback();
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      // 2. Buscar lote mais próximo de vencer com saldo (FEFO)
      //    — apenas lotes ativos, não expirados, com availableCredits > 0
      //    — ordenado por expiresAt ASC para pegar o que vence primeiro
      const lote = await StudentCredit.findOne({
        where: {
          studentId,
          status:           'active',
          availableCredits: { [Op.gt]: 0 },
          expiresAt:        { [Op.gt]: new Date() },
        },
        order: [['expiresAt', 'ASC']],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      // 3. Sem saldo — retorna 400
      if (!lote) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Saldo de créditos insuficiente',
        });
      }

      // 4. Debitar 1 crédito do lote
      lote.usedCredits      += 1;
      lote.availableCredits -= 1;

      // 5. Atualizar status se zerou
      if (lote.availableCredits === 0) {
        lote.status = 'exhausted';
      }

      await lote.save({ transaction: t });

      // 6. Registrar transação de consumo
      const transaction = await CreditTransaction.create(
        {
          studentCreditId: lote.id,
          studentId,
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
    } catch (error: any) {
      await t.rollback();
      console.error('Erro ao consumir crédito:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao consumir crédito',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}