import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { TenantDb } from '../../../config/tenantModels';

function includeStudent(db: TenantDb) {
  return {
    model: db.ClientUser,
    as: 'student',
    attributes: ['id', 'name', 'email'],
  };
}

export async function addToWaitingList(req: Request, res: Response): Promise<Response> {
  try {
    const { Class, ClassStudent, WaitingList } = req.tenantDb;
    const class_id = Number(req.params.classId);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    }

    const cls = await Class.findByPk(class_id, {
      attributes: ['id', 'active', 'limit', 'spots_taken'],
    });
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });
    if (!cls.active) return res.status(400).json({ success: false, message: 'Aula não está ativa' });

    if (cls.spots_taken < cls.limit) {
      return res.status(400).json({
        success: false,
        message: 'Class still has spots available, enroll directly',
      });
    }

    const activeEnrollment = await ClassStudent.findOne({
      where: { class_id, user_id: Number(user_id), status: { [Op.ne]: 'cancelled' } },
    });
    if (activeEnrollment) {
      return res.status(409).json({ success: false, message: 'Aluno já está matriculado nesta aula' });
    }

    const alreadyWaiting = await WaitingList.findOne({
      where: { class_id, user_id: Number(user_id) },
    });
    if (alreadyWaiting) {
      return res.status(409).json({ success: false, message: 'Aluno já está na lista de espera desta aula' });
    }

    const last = await WaitingList.max<number, any>('order', { where: { class_id } });
    const order = (last ?? 0) + 1;

    const entry = await WaitingList.create({ class_id, user_id: Number(user_id), order });

    const data = await WaitingList.findByPk(entry.id, { include: [includeStudent(req.tenantDb)] });

    return res.status(201).json({
      success: true,
      data,
      position: order,
      message: 'Adicionado à lista de espera com sucesso',
    });
  } catch (err: unknown) {
    console.error('addToWaitingList error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao adicionar à lista de espera',
    });
  }
}

export async function removeFromWaitingList(req: Request, res: Response): Promise<Response> {
  try {
    const { WaitingList, sequelize } = req.tenantDb;
    const class_id = Number(req.params.classId);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    }

    const entry = await WaitingList.findOne({
      where: { class_id, user_id: Number(user_id) },
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Entrada na lista de espera não encontrada' });

    const deletedOrder = entry.order;

    await sequelize.transaction(async (t) => {
      await entry.destroy({ transaction: t });

      await WaitingList.decrement('order', {
        by: 1,
        where: { class_id, order: { [Op.gt]: deletedOrder } },
        transaction: t,
      });
    });

    return res.json({ success: true, message: 'Removido da lista de espera com sucesso' });
  } catch (err: unknown) {
    console.error('removeFromWaitingList error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao remover da lista de espera' });
  }
}

export async function promoteFromWaitingList(req: Request, res: Response): Promise<Response> {
  try {
    const { Class, ClassStudent, WaitingList, sequelize } = req.tenantDb;
    const class_id = Number(req.params.classId);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    }

    const waitingEntry = await WaitingList.findOne({
      where: { class_id, user_id: Number(user_id) },
    });
    if (!waitingEntry) {
      return res.status(404).json({ success: false, message: 'Aluno não está na lista de espera desta aula' });
    }

    const cls = await Class.findByPk(class_id, { attributes: ['id', 'limit', 'spots_taken'] });
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    if (cls.spots_taken >= cls.limit) {
      return res.status(400).json({ success: false, message: 'Aula ainda está lotada' });
    }

    const promotedOrder = waitingEntry.order;

    const classStudent = await sequelize.transaction(async (t) => {
      const freshClass = await Class.findByPk(class_id, {
        attributes: ['id', 'limit', 'spots_taken'],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!freshClass || freshClass.spots_taken >= freshClass.limit) {
        throw new Error('CLASS_FULL');
      }

      const enrollment = await ClassStudent.create(
        { class_id, user_id: Number(user_id), status: 'enrolled' },
        { transaction: t }
      );

      await Class.increment('spots_taken', { by: 1, where: { id: class_id }, transaction: t });

      console.log(`consume 1 credit for user ${user_id}`);

      await waitingEntry.destroy({ transaction: t });

      await WaitingList.decrement('order', {
        by: 1,
        where: { class_id, order: { [Op.gt]: promotedOrder } },
        transaction: t,
      });

      return enrollment;
    });

    const data = await ClassStudent.findByPk(classStudent.id, { include: [includeStudent(req.tenantDb)] });

    return res.status(201).json({
      success: true,
      data,
      message: 'Aluno promovido da lista de espera e matriculado com sucesso',
    });
  } catch (err: unknown) {
    console.error('promoteFromWaitingList error:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'CLASS_FULL') {
      return res.status(400).json({ success: false, message: 'Aula lotada, promoção não realizada' });
    }
    return res.status(500).json({ success: false, message: 'Erro ao promover aluno da lista de espera' });
  }
}

export async function getWaitingListByClass(req: Request, res: Response): Promise<Response> {
  try {
    const { Class, WaitingList } = req.tenantDb;
    const class_id = Number(req.params.classId);

    const cls = await Class.findByPk(class_id, { attributes: ['id'] });
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    const entries = await WaitingList.findAll({
      where: { class_id },
      include: [includeStudent(req.tenantDb)],
      order: [['order', 'ASC']],
    });

    const data = entries.map((e) => ({
      id: e.id,
      position: e.order,
      student: (e as any).student,
      joinedAt: e.createdAt,
    }));

    return res.json({ success: true, total: data.length, data });
  } catch (err: unknown) {
    console.error('getWaitingListByClass error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar lista de espera' });
  }
}

// NOTE: When student JWT auth is implemented, replace req.query.user_id with req.user.userId.
export async function getMyWaitingLists(req: Request, res: Response): Promise<Response> {
  try {
    const { WaitingList, Class, ProductType, Place } = req.tenantDb;
    const user_id = Number(req.query.user_id);

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    }

    const entries = await WaitingList.findAll({
      where: { user_id },
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'date', 'time', 'limit', 'spots_taken'],
          include: [
            { model: ProductType, as: 'productType', attributes: ['id', 'name'] },
            { model: Place, as: 'place', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = entries.map((e) => {
      const cls = (e as any).class;
      return {
        id: e.id,
        position: e.order,
        joinedAt: e.createdAt,
        class: cls
          ? {
              id: cls.id,
              date: cls.date,
              time: cls.time,
              spots_available: cls.limit - cls.spots_taken,
              productType: cls.productType,
              place: cls.place,
            }
          : null,
      };
    });

    return res.json({ success: true, total: data.length, data });
  } catch (err: unknown) {
    console.error('getMyWaitingLists error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar listas de espera' });
  }
}
