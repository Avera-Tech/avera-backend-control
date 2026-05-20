/**
 * src/core/student/controllers/StudentCreditController.ts
 *
 * Endpoints de créditos do aluno no app mobile.
 *
 * — Por que não reutilizar o CreditController existente?
 *   O CreditController recebe userId via req.params.id (rota admin).
 *   Aqui o userId vem do JWT do aluno (req.student.studentId),
 *   garantindo que o aluno só veja os próprios créditos.
 *
 * GET  /app/v1/student/credits         → lotes + summary
 * GET  /app/v1/student/credits/history → histórico de transações
 */

import { Request, Response } from 'express';

export class StudentCreditController {
  /**
   * GET /app/v1/student/credits
   *
   * Retorna todos os lotes de crédito do aluno logado + summary.
   *
   * Response:
   * {
   *   success: true,
   *   summary: { totalAvailable, activeLotes, totalLotes },
   *   credits: [
   *     {
   *       id, status, totalCredits, usedCredits, availableCredits, expiresAt,
   *       product: { id, name, credits, validityDays,
   *                  productType: { id, name, color } }
   *     }
   *   ]
   * }
   */
  static async getMyCredits(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.student) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const studentId = req.student.studentId;
      const { StudentCredit, Product, ProductType } = req.tenantDb;

      const credits = await StudentCredit.findAll({
        where: { userId: studentId },
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
        order: [
          // Ativos primeiro, depois expiração mais próxima
          ['status', 'ASC'],
          ['expiresAt', 'ASC'],
        ],
      });

      const totalAvailable = credits
        .filter((c: any) => c.status === 'active')
        .reduce((sum: number, c: any) => sum + c.availableCredits, 0);

      return res.status(200).json({
        success: true,
        summary: {
          totalAvailable,
          activeLotes: credits.filter((c: any) => c.status === 'active').length,
          totalLotes:  credits.length,
        },
        credits,
      });
    } catch (error: any) {
      console.error('[StudentCreditController.getMyCredits] Erro:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar créditos',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /app/v1/student/credits/history
   *
   * Retorna o histórico de transações de crédito do aluno.
   * Query params:
   *   - limit  (default 20, max 100)
   *   - offset (default 0)
   *
   * Response:
   * {
   *   success: true,
   *   total,
   *   transactions: [
   *     { id, delta, reason, note, createdAt,
   *       credit: { id, product: { name } } }
   *   ]
   * }
   */
  static async getCreditHistory(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.student) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const studentId = req.student.studentId;
      const limit     = Math.min(Number(req.query.limit)  || 20, 100);
      const offset    = Math.max(Number(req.query.offset) || 0, 0);

      const { CreditTransaction, StudentCredit, Product } = req.tenantDb;

      const { count, rows } = await CreditTransaction.findAndCountAll({
        where: { userId: studentId },
        include: [
          {
            model: StudentCredit,
            as: 'credit',
            attributes: ['id'],
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return res.status(200).json({
        success: true,
        total: count,
        transactions: rows,
      });
    } catch (error: any) {
      console.error('[StudentCreditController.getCreditHistory] Erro:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar histórico de créditos',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}