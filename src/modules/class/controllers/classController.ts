import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Class from '../models/Class.model';
import ClassStudent from '../models/ClassStudent.model';
import Staff from '../../../core/staff/models/Staff.model';
import ProductType from '../../../core/products/models/ProductType.model';
import Place from '../../../modules/place/models/Place.model';
import ClientUser from '../../../modules/user/models/User.model';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function includeTeacher() {
  return { model: Staff, as: 'teacher', attributes: ['id', 'name'] };
}

function includeProductType() {
  return { model: ProductType, as: 'productType', attributes: ['id', 'name', 'color'] };
}

function includePlace() {
  return { model: Place, as: 'place', attributes: ['id', 'name'] };
}

function validateDatetime(date: unknown, time: unknown): string | null {
  if (!date || !DATE_RE.test(String(date))) return 'date deve estar no formato YYYY-MM-DD';
  if (!time || !TIME_RE.test(String(time))) return 'time deve estar no formato HH:mm';
  return null;
}

export async function createClass(req: Request, res: Response): Promise<Response> {
  try {
    const { staff_id, product_type_id, date, time, limit, place_id, has_commission, kickback_rule, kickback } = req.body;

    if (!staff_id || !product_type_id || !date || !time || !limit) {
      return res.status(400).json({
        success: false,
        message: 'staff_id, product_type_id, date, time e limit são obrigatórios',
      });
    }

    const dtError = validateDatetime(date, time);
    if (dtError) return res.status(400).json({ success: false, message: dtError });

    const staff = await Staff.findByPk(Number(staff_id), { attributes: ['id', 'active'] });
    if (!staff) return res.status(400).json({ success: false, message: 'staff_id não encontrado' });
    if (!staff.active) return res.status(400).json({ success: false, message: 'Funcionário está inativo' });

    const created = await Class.create({
      staff_id: Number(staff_id),
      product_type_id: Number(product_type_id),
      date: String(date),
      time: String(time),
      limit: Number(limit),
      place_id: place_id != null ? Number(place_id) : undefined,
      has_commission: has_commission ?? false,
      kickback_rule: kickback_rule ?? null,
      kickback: kickback != null ? Number(kickback) : null,
    });

    const data = await Class.findByPk(created.id, {
      include: [includeTeacher(), includeProductType(), includePlace()],
    });

    return res.status(201).json({ success: true, data, message: 'Aula criada com sucesso' });
  } catch (err: unknown) {
    console.error('createClass error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao criar aula',
    });
  }
}

export async function listClasses(req: Request, res: Response): Promise<Response> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (req.query.date) {
      where.date = String(req.query.date);
    } else {
      where.date = { [Op.gte]: todayString() };
    }

    if (req.query.staff_id) where.staff_id = Number(req.query.staff_id);
    if (req.query.product_type_id) where.product_type_id = Number(req.query.product_type_id);
    if (req.query.place_id) where.place_id = Number(req.query.place_id);
    if (req.query.active !== undefined) where.active = req.query.active === 'true';

    const { count, rows } = await Class.findAndCountAll({
      where,
      include: [includeTeacher(), includeProductType(), includePlace()],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit,
      offset,
      distinct: true,
    });

    const data = rows.map((c) => ({
      ...c.toJSON(),
      spots_available: c.limit - c.spots_taken,
    }));

    return res.json({
      success: true,
      data,
      meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (err: unknown) {
    console.error('listClasses error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar aulas' });
  }
}

export async function getClassById(req: Request, res: Response): Promise<Response> {
  try {
    const cls = await Class.findByPk(Number(req.params.id), {
      include: [
        includeTeacher(),
        includeProductType(),
        includePlace(),
        {
          model: ClassStudent,
          as: 'enrollments',
          include: [
            {
              model: ClientUser,
              as: 'student',
              attributes: ['id', 'name', 'email'],
            },
          ],
          attributes: ['id', 'user_id', 'status', 'checkin', 'checkin_at'],
        },
      ],
    });

    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    return res.json({ success: true, data: cls });
  } catch (err: unknown) {
    console.error('getClassById error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar aula' });
  }
}

export async function updateClass(req: Request, res: Response): Promise<Response> {
  try {
    const cls = await Class.findByPk(Number(req.params.id));
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    const {
      staff_id, product_type_id, place_id, date, time,
      limit, has_commission, kickback_rule, kickback, active,
    } = req.body;

    const updates: Record<string, unknown> = {};

    if (date !== undefined || time !== undefined) {
      const nextDate = date ?? cls.date;
      const nextTime = time ?? cls.time;
      const dtError = validateDatetime(nextDate, nextTime);
      if (dtError) return res.status(400).json({ success: false, message: dtError });
      if (date !== undefined) updates.date = String(date);
      if (time !== undefined) updates.time = String(time);
    }

    if (staff_id !== undefined) {
      const staff = await Staff.findByPk(Number(staff_id), { attributes: ['id', 'active'] });
      if (!staff) return res.status(400).json({ success: false, message: 'staff_id não encontrado' });
      if (!staff.active) return res.status(400).json({ success: false, message: 'Funcionário está inativo' });
      updates.staff_id = Number(staff_id);
    }

    if (product_type_id !== undefined) updates.product_type_id = Number(product_type_id);
    if (place_id !== undefined) updates.place_id = place_id != null ? Number(place_id) : null;
    if (limit !== undefined) updates.limit = Number(limit);
    if (has_commission !== undefined) updates.has_commission = has_commission;
    if (kickback_rule !== undefined) updates.kickback_rule = kickback_rule ?? null;
    if (kickback !== undefined) updates.kickback = kickback != null ? Number(kickback) : null;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um campo para atualizar' });
    }

    await cls.update(updates);

    const data = await Class.findByPk(cls.id, {
      include: [includeTeacher(), includeProductType(), includePlace()],
    });

    return res.json({ success: true, data, message: 'Aula atualizada com sucesso' });
  } catch (err: unknown) {
    console.error('updateClass error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao atualizar aula',
    });
  }
}

export async function cancelClass(req: Request, res: Response): Promise<Response> {
  try {
    const cls = await Class.findByPk(Number(req.params.id));
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    const cancelling = cls.active;

    await cls.update({ active: !cls.active });

    if (cancelling) {
      const enrollments = await ClassStudent.findAll({
        where: { class_id: cls.id, status: 'enrolled' },
      });

      await ClassStudent.update(
        { status: 'cancelled' },
        { where: { class_id: cls.id, status: 'enrolled' } }
      );

      for (const enrollment of enrollments) {
        if (enrollment.transaction_id != null) {
          console.log(`credit refund for user ${enrollment.user_id}, transaction ${enrollment.transaction_id}`);
        }
      }

      return res.json({ success: true, message: 'Aula cancelada e matrículas encerradas' });
    }

    return res.json({ success: true, message: 'Aula reativada com sucesso' });
  } catch (err: unknown) {
    console.error('cancelClass error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao cancelar aula' });
  }
}

export async function deleteClass(req: Request, res: Response): Promise<Response> {
  try {
    const cls = await Class.findByPk(Number(req.params.id));
    if (!cls) return res.status(404).json({ success: false, message: 'Aula não encontrada' });

    const enrollmentCount = await ClassStudent.count({ where: { class_id: cls.id } });
    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a class with enrollments. Cancel it instead.',
      });
    }

    await cls.destroy();

    return res.json({ success: true, message: 'Aula excluída com sucesso' });
  } catch (err: unknown) {
    console.error('deleteClass error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao excluir aula' });
  }
}
