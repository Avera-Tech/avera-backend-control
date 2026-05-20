/**
 * src/core/student/controllers/StudentHomeController.ts
 *
 * GET /app/v1/student/home
 *
 * Retorna em uma única chamada tudo que a tela Home do aluno precisa:
 *   - nome do aluno logado
 *   - créditos disponíveis
 *   - próximas aulas (status enrolled, data >= hoje, limit 10)
 *   - resumo: créditos disponíveis, aulas agendadas, aulas realizadas
 */

import { Request, Response } from 'express';
import { Op } from 'sequelize';

export class StudentHomeController {
  static async getHomeData(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.student) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const studentId = req.student.studentId;
      const { ClientUser, StudentCredit, ClassStudent, Class, Place } = req.tenantDb;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Dados do aluno
      const student = await ClientUser.findOne({
        where: { id: studentId },
        attributes: ['id', 'name', 'email'],
      });

      if (!student) {
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      // 2. Créditos disponíveis
      const creditRows = await StudentCredit.findAll({
        where: {
          userId: studentId,
          status: 'active',
          availableCredits: { [Op.gt]: 0 },
          expiresAt: { [Op.gte]: new Date() },
        },
        attributes: ['availableCredits'],
        raw: true,
      });

      const totalCredits = creditRows.reduce(
        (sum: number, row: any) => sum + Number(row.availableCredits),
        0,
      );

      // 3. Próximas aulas (agendadas, data >= hoje)
      const upcomingEnrollments = await ClassStudent.findAll({
        where: { user_id: studentId, status: 'enrolled' },
        include: [
          {
            model: Class,
            as: 'class',
            where: { date: { [Op.gte]: today }, active: true },
            attributes: ['id', 'date', 'time', 'limit', 'spots_taken'],
            include: [{ model: Place, as: 'place', attributes: ['id', 'name'] }],
          },
        ],
        order: [
          [{ model: Class, as: 'class' }, 'date', 'ASC'],
          [{ model: Class, as: 'class' }, 'time', 'ASC'],
        ],
        limit: 10,
      });

      const upcomingClasses = upcomingEnrollments.map((enrollment: any) => {
        const cls = enrollment.class;
        return {
          enrollmentId: enrollment.id,
          status:       enrollment.status,
          classId:      cls.id,
          date:         cls.date,
          time:         cls.time,
          location:     cls.place?.name ?? null,
        };
      });

      // 4. Resumo
      const scheduledCount = await ClassStudent.count({
        where: { user_id: studentId, status: 'enrolled' },
        include: [{
          model: Class,
          as: 'class',
          where: { date: { [Op.gte]: today }, active: true },
        }],
      });

      const attendedCount = await ClassStudent.count({
        where: { user_id: studentId, status: 'attended' },
      });

      return res.status(200).json({
        success: true,
        data: {
          student: { id: student.id, name: student.name, email: student.email },
          summary: {
            totalCredits,
            scheduledClasses: scheduledCount,
            attendedClasses:  attendedCount,
          },
          upcomingClasses,
        },
      });
    } catch (error: any) {
      console.error('[StudentHomeController] Erro:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}