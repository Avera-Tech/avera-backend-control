import { Request, Response } from 'express';
import coreDB from '../../../config/database.core';
import Class from '../models/Class.model';
import ClassStudent from '../models/ClassStudent.model';
import ClientUser from '../../../modules/user/models/User.model';
import UserLevel from '../../../modules/user/models/UserLevel.model';

function includeStudent() {
  return {
    model: ClientUser,
    as: 'student',
    attributes: ['id', 'name', 'email'],
    include: [{ model: UserLevel, as: 'level', attributes: ['id', 'name'] }],
  };
}

export async function enrollStudent(req: Request, res: Response): Promise<Response> {
  try {
    const class_id = Number(req.params.id);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    }

    const cls = await Class.findByPk(class_id, { attributes: ['id', 'active', 'limit', 'spots_taken'] });
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });
    if (!cls.active) return res.status(400).json({ success: false, message: 'Aula não está ativa' });
    if (cls.spots_taken >= cls.limit) {
      return res.status(400).json({ success: false, message: 'Aula lotada' });
    }

    const existing = await ClassStudent.findOne({ where: { class_id, user_id: Number(user_id) } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Aluno já matriculado nesta aula' });
    }

    const enrollment = await coreDB.transaction(async (t) => {
      const created = await ClassStudent.create(
        { class_id, user_id: Number(user_id), status: 'enrolled' },
        { transaction: t }
      );

      await Class.increment('spots_taken', { by: 1, where: { id: class_id }, transaction: t });

      console.log(`consume 1 credit for user ${user_id}`);

      return created;
    });

    const data = await ClassStudent.findByPk(enrollment.id, { include: [includeStudent()] });

    return res.status(201).json({ success: true, data, message: 'Matrícula realizada com sucesso' });
  } catch (err: unknown) {
    console.error('enrollStudent error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao matricular aluno',
    });
  }
}

export async function cancelEnrollment(req: Request, res: Response): Promise<Response> {
  try {
    const class_id = Number(req.params.classId);
    const enrollment_id = Number(req.params.enrollmentId);

    const enrollment = await ClassStudent.findOne({
      where: { id: enrollment_id, class_id },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Matrícula não encontrada' });
    if (enrollment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Matrícula já está cancelada' });
    }

    await coreDB.transaction(async (t) => {
      await enrollment.update({ status: 'cancelled' }, { transaction: t });

      await Class.decrement('spots_taken', { by: 1, where: { id: class_id }, transaction: t });

      console.log(`refund 1 credit for user ${enrollment.user_id}`);
    });

    return res.json({ success: true, message: 'Matrícula cancelada com sucesso' });
  } catch (err: unknown) {
    console.error('cancelEnrollment error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao cancelar matrícula' });
  }
}

export async function checkinByEnrollmentId(req: Request, res: Response): Promise<Response> {
  try {
    const class_id = Number(req.params.classId);
    const enrollment_id = Number(req.params.enrollmentId);

    const enrollment = await ClassStudent.findOne({ where: { id: enrollment_id, class_id } });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Matrícula não encontrada' });

    if (enrollment.checkin) {
      return res.status(200).json({ success: true, message: 'already checked in', data: enrollment });
    }

    if (enrollment.status !== 'enrolled') {
      return res.status(400).json({
        success: false,
        message: `Não é possível fazer check-in com status '${enrollment.status}'`,
      });
    }

    await enrollment.update({ checkin: true, checkin_at: new Date(), status: 'attended' });

    return res.json({ success: true, data: enrollment, message: 'Check-in realizado com sucesso' });
  } catch (err: unknown) {
    console.error('checkinByEnrollmentId error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao realizar check-in' });
  }
}

export async function checkinByStudentPair(req: Request, res: Response): Promise<Response> {
  try {
    const class_id = Number(req.params.classId);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    }

    const data = await coreDB.transaction(async (t) => {
      const enrollment = await ClassStudent.findOne({
        where: { class_id, user_id: Number(user_id) },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!enrollment) return null;

      if (enrollment.checkin) return { enrollment, alreadyDone: true };

      if (enrollment.status !== 'enrolled') {
        throw new Error(`INVALID_STATUS:${enrollment.status}`);
      }

      await enrollment.update(
        { checkin: true, checkin_at: new Date(), status: 'attended' },
        { transaction: t }
      );

      return { enrollment, alreadyDone: false };
    });

    if (data === null) {
      return res.status(404).json({ success: false, message: 'Matrícula não encontrada' });
    }

    if (data.alreadyDone) {
      return res.status(200).json({ success: true, message: 'already checked in', data: data.enrollment });
    }

    return res.json({ success: true, data: data.enrollment, message: 'Check-in realizado com sucesso' });
  } catch (err: unknown) {
    console.error('checkinByStudentPair error:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('INVALID_STATUS:')) {
      return res.status(400).json({
        success: false,
        message: `Não é possível fazer check-in com status '${msg.split(':')[1]}'`,
      });
    }
    return res.status(500).json({ success: false, message: 'Erro ao realizar check-in' });
  }
}

export async function listEnrollments(req: Request, res: Response): Promise<Response> {
  try {
    const class_id = Number(req.params.id);

    const cls = await Class.findByPk(class_id, { attributes: ['id'] });
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    const where: Record<string, unknown> = { class_id };
    if (req.query.status) where.status = String(req.query.status);

    const enrollments = await ClassStudent.findAll({
      where,
      include: [includeStudent()],
      order: [['createdAt', 'ASC']],
    });

    const all = await ClassStudent.findAll({
      where: { class_id },
      attributes: ['status'],
      raw: true,
    });

    const counts = { total: all.length, enrolled: 0, attended: 0, cancelled: 0, missed: 0 };
    for (const e of all) {
      const s = (e as { status: string }).status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    return res.json({ success: true, data: enrollments, counts });
  } catch (err: unknown) {
    console.error('listEnrollments error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar matrículas' });
  }
}
