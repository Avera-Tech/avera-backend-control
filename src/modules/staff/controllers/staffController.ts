import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { Op } from 'sequelize';
import { TenantDb } from '../../../config/tenantModels';

function withRoles(db: TenantDb) {
  return {
    model: db.Role,
    as: 'roles',
    attributes: ['id', 'name', 'slug'],
    through: { attributes: [] },
  };
}

async function findStaff(id: number, db: TenantDb) {
  return db.Staff.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [withRoles(db)],
  });
}

export async function createStaff(req: Request, res: Response): Promise<Response> {
  try {
    const { Staff, Role, UserRole, sequelize } = req.tenantDb;
    const { name, email, password, role: roleSlug, phone, employeeLevel } = req.body;

    if (!name || !email || !password || !roleSlug) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password e role são obrigatórios',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await Staff.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email já cadastrado' });
    }

    const role = await Role.findOne({ where: { slug: roleSlug, active: true } });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: `Role '${roleSlug}' não encontrada ou inativa`,
      });
    }

    const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const assignedBy = req.user?.staffId ?? undefined;

    const staffId = await sequelize.transaction(async (t) => {
      const staff = await Staff.create(
        {
          name: String(name).trim(),
          email: normalizedEmail,
          password: hashedPassword,
          active: true,
          emailVerified: true,
          phone: phone ? String(phone).trim() : undefined,
          employeeLevel: employeeLevel ? String(employeeLevel).trim() : undefined,
        },
        { transaction: t }
      );

      await UserRole.create(
        { staffId: staff.id, roleId: role.id, assignedBy },
        { transaction: t }
      );

      return staff.id;
    });

    const data = await findStaff(staffId, req.tenantDb);

    return res.status(201).json({ success: true, data, message: 'Funcionário criado com sucesso' });
  } catch (err: unknown) {
    console.error('createStaff error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao criar funcionário',
    });
  }
}

export async function listStaff(req: Request, res: Response): Promise<Response> {
  try {
    const { Staff } = req.tenantDb;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {
      email: { [Op.notLike]: '%@removed.invalid' },
    };
    if (req.query.active !== undefined) {
      where.active = req.query.active === 'true';
    }
    if (req.query.search) {
      const q = `%${String(req.query.search).trim()}%`;
      (where as any)[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
      ];
    }

    const roleWhere = req.query.role ? { slug: String(req.query.role) } : undefined;

    const { count, rows } = await Staff.findAndCountAll({
      attributes: { exclude: ['password'] },
      where,
      include: [
        {
          ...withRoles(req.tenantDb),
          ...(roleWhere ? { where: roleWhere, required: true } : {}),
        },
      ],
      order: [['name', 'ASC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      data: rows,
      meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (err: unknown) {
    console.error('listStaff error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar funcionários' });
  }
}

export async function getStaffById(req: Request, res: Response): Promise<Response> {
  try {
    const data = await findStaff(Number(req.params.id), req.tenantDb);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }
    return res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('getStaffById error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar funcionário' });
  }
}

export async function updateStaff(req: Request, res: Response): Promise<Response> {
  try {
    const { Staff, Role, UserRole, sequelize } = req.tenantDb;
    const staff = await Staff.findByPk(Number(req.params.id));
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    const { name, phone, employeeLevel, active, role: roleSlug } = req.body;
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (employeeLevel !== undefined) updates.employeeLevel = employeeLevel ? String(employeeLevel).trim() : null;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0 && !roleSlug) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um campo para atualizar' });
    }

    const assignedBy = req.user?.staffId ?? undefined;

    await sequelize.transaction(async (t) => {
      if (Object.keys(updates).length > 0) {
        await staff.update(updates, { transaction: t });
      }

      if (roleSlug) {
        const newRole = await Role.findOne({ where: { slug: roleSlug, active: true } });
        if (!newRole) throw new Error(`ROLE_NOT_FOUND:${roleSlug}`);
        await UserRole.destroy({ where: { staffId: staff.id }, transaction: t });
        await UserRole.create({ staffId: staff.id, roleId: newRole.id, assignedBy }, { transaction: t });
      }
    });

    const data = await findStaff(staff.id, req.tenantDb);
    return res.json({ success: true, data, message: 'Funcionário atualizado com sucesso' });
  } catch (err: unknown) {
    console.error('updateStaff error:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('ROLE_NOT_FOUND:')) {
      return res.status(400).json({ success: false, message: `Role '${msg.split(':')[1]}' não encontrada ou inativa` });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar funcionário' });
  }
}

export async function deactivateStaff(req: Request, res: Response): Promise<Response> {
  try {
    const { Staff } = req.tenantDb;
    const staff = await Staff.findByPk(Number(req.params.id));
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
    const anonymousPassword = await bcrypt.hash(randomBytes(32).toString('hex'), saltRounds);

    await staff.update({
      active: false,
      name: 'Removido',
      email: `removed-${randomUUID()}@removed.invalid`,
      password: anonymousPassword,
      phone: null,
      employeeLevel: null,
      emailVerified: false,
      lastLogin: null,
    });

    return res.json({
      success: true,
      message: 'Funcionário removido com sucesso',
    });
  } catch (err: unknown) {
    console.error('deactivateStaff error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao remover funcionário' });
  }
}
