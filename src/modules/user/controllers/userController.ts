import { Request, Response } from 'express';
import { Op } from 'sequelize';
import ClientUser from '../models/User.model';
import UserLevel from '../models/UserLevel.model';
import StudentCredit from '../../../core/credits/models/StudentCredit.model';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const levelAttributes = ['id', 'name', 'color'];

function withLevel() {
  return {
    model: UserLevel,
    as: 'level',
    attributes: levelAttributes,
  };
}

// ─── createUser ───────────────────────────────────────────────────────────────

export async function createUser(req: Request, res: Response): Promise<Response> {
  try {
    const { name, email, phone, document, birthday, height, weight, levelId, address, city, state, zipCode } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'name e email são obrigatórios' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await ClientUser.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email já cadastrado' });
    }

    const user = await ClientUser.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone ?? null,
      document: document ?? null,
      birthday: birthday ?? null,
      height: height ?? null,
      weight: weight ?? null,
      levelId: levelId ?? null,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      zipCode: zipCode ?? null,
    });

    const data = await ClientUser.findByPk(user.id, { include: [withLevel()] });

    return res.status(201).json({ success: true, data, message: 'Cliente criado com sucesso' });
  } catch (err: unknown) {
    console.error('createUser error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao criar cliente',
    });
  }
}

// ─── listUsers ────────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<Response> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (req.query.active !== undefined) {
      where.active = req.query.active === 'true';
    }

    if (req.query.level_id) {
      where.levelId = Number(req.query.level_id);
    }

    if (req.query.search) {
      const q = `%${String(req.query.search).trim()}%`;
      (where as any)[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
      ];
    }

    const { count, rows } = await ClientUser.findAndCountAll({
      where,
      include: [withLevel()],
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err: unknown) {
    console.error('listUsers error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar clientes' });
  }
}

// ─── getUserById ──────────────────────────────────────────────────────────────

export async function getUserById(req: Request, res: Response): Promise<Response> {
  try {
    const user = await ClientUser.findByPk(Number(req.params.id), {
      include: [withLevel()],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const credits = await StudentCredit.findAll({
      where: { clientId: user.id, status: 'active' },
      attributes: ['availableCredits'],
    });
    const availableCredits = credits.reduce((sum, c) => sum + c.availableCredits, 0);

    return res.json({
      success: true,
      data: { ...user.toJSON(), availableCredits },
    });
  } catch (err: unknown) {
    console.error('getUserById error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar cliente' });
  }
}

// ─── updateUser ───────────────────────────────────────────────────────────────

export async function updateUser(req: Request, res: Response): Promise<Response> {
  try {
    const user = await ClientUser.findByPk(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const allowed = ['name', 'phone', 'document', 'birthday', 'height', 'weight', 'levelId', 'address', 'city', 'state', 'zipCode', 'active'];
    const updates: Record<string, unknown> = {};

    for (const field of allowed) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um campo para atualizar' });
    }

    await user.update(updates);

    const data = await ClientUser.findByPk(user.id, { include: [withLevel()] });

    return res.json({ success: true, data, message: 'Cliente atualizado com sucesso' });
  } catch (err: unknown) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar cliente' });
  }
}

// ─── getUsersDropdown ─────────────────────────────────────────────────────────

export async function getUsersDropdown(_req: Request, res: Response): Promise<Response> {
  try {
    const users = await ClientUser.findAll({
      where: { active: true },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    return res.json({ success: true, data: users });
  } catch (err: unknown) {
    console.error('getUsersDropdown error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar clientes' });
  }
}
