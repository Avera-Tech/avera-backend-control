import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import coreDB from '../../../config/database.core';
import Staff from '../models/Staff.model';
import AuthUser from '../../../core/users/models/User.model';
import Role from '../../../core/rbac/models/Role.model';
import UserRole from '../../../core/rbac/models/UserRole.model';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findStaffWithAccount(id: number) {
  return Staff.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: AuthUser,
        as: 'user',
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] },
          },
        ],
      },
    ],
  });
}

// ─── createStaff ──────────────────────────────────────────────────────────────

export async function createStaff(req: Request, res: Response): Promise<Response> {
  try {
    const { name, email, password, role: roleSlug, phone, employeeLevel } = req.body;

    if (!name || !email || !password || !roleSlug) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password e role são obrigatórios',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [existingUser, existingStaff] = await Promise.all([
      AuthUser.findOne({ where: { email: normalizedEmail } }),
      Staff.findOne({ where: { email: normalizedEmail } }),
    ]);

    if (existingUser || existingStaff) {
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
    const assignedBy = req.user?.userId ?? undefined;

    const staffId = await coreDB.transaction(async (t) => {
      const authUser = await AuthUser.create(
        {
          name: String(name).trim(),
          email: normalizedEmail,
          password: hashedPassword,
          active: true,
          emailVerified: true,
          ...(phone ? { phone: String(phone).trim() } : {}),
        },
        { transaction: t }
      );

      await UserRole.create(
        { userId: authUser.id, roleId: role.id, assignedBy },
        { transaction: t }
      );

      const staff = await Staff.create(
        {
          userId: authUser.id,
          name: String(name).trim(),
          email: normalizedEmail,
          password: hashedPassword,
          active: true,
          phone: phone ? String(phone).trim() : undefined,
          employeeLevel: employeeLevel ? String(employeeLevel).trim() : undefined,
        },
        { transaction: t }
      );

      return staff.id;
    });

    const data = await findStaffWithAccount(staffId);

    return res.status(201).json({
      success: true,
      data,
      message: 'Funcionário criado com sucesso',
    });
  } catch (err: unknown) {
    console.error('createStaff error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao criar funcionário',
    });
  }
}

// ─── listStaff ────────────────────────────────────────────────────────────────

export async function listStaff(req: Request, res: Response): Promise<Response> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const staffWhere: Record<string, unknown> = {};

    if (req.query.active !== undefined) {
      staffWhere.active = req.query.active === 'true';
    }

    const roleWhere: Record<string, unknown> | undefined =
      req.query.role ? { slug: String(req.query.role) } : undefined;

    const { count, rows } = await Staff.findAndCountAll({
      attributes: { exclude: ['password'] },
      where: staffWhere,
      include: [
        {
          model: AuthUser,
          as: 'user',
          attributes: { exclude: ['password'] },
          include: [
            {
              model: Role,
              as: 'roles',
              attributes: ['id', 'name', 'slug'],
              through: { attributes: [] },
              ...(roleWhere ? { where: roleWhere, required: true } : {}),
            },
          ],
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
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err: unknown) {
    console.error('listStaff error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar funcionários' });
  }
}

// ─── getStaffById ─────────────────────────────────────────────────────────────

export async function getStaffById(req: Request, res: Response): Promise<Response> {
  try {
    const data = await findStaffWithAccount(Number(req.params.id));

    if (!data) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    return res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('getStaffById error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar funcionário' });
  }
}

// ─── updateStaff ──────────────────────────────────────────────────────────────

export async function updateStaff(req: Request, res: Response): Promise<Response> {
  try {
    const staff = await Staff.findByPk(Number(req.params.id));
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    const { name, phone, employeeLevel, active, role: roleSlug } = req.body;

    const staffUpdates: Record<string, unknown> = {};
    if (name !== undefined) staffUpdates.name = String(name).trim();
    if (phone !== undefined) staffUpdates.phone = phone ? String(phone).trim() : null;
    if (employeeLevel !== undefined) staffUpdates.employeeLevel = employeeLevel ? String(employeeLevel).trim() : null;
    if (active !== undefined) staffUpdates.active = active;

    if (Object.keys(staffUpdates).length === 0 && !roleSlug) {
      return res.status(400).json({
        success: false,
        message: 'Informe ao menos um campo para atualizar',
      });
    }

    const assignedBy = req.user?.userId ?? undefined;

    await coreDB.transaction(async (t) => {
      if (Object.keys(staffUpdates).length > 0) {
        await staff.update(staffUpdates, { transaction: t });

        // Sync active status to RBAC user
        if (active !== undefined) {
          await AuthUser.update({ active }, { where: { id: staff.userId }, transaction: t });
        }
      }

      if (roleSlug) {
        const newRole = await Role.findOne({ where: { slug: roleSlug, active: true } });
        if (!newRole) {
          throw new Error(`ROLE_NOT_FOUND:${roleSlug}`);
        }
        await UserRole.destroy({ where: { userId: staff.userId }, transaction: t });
        await UserRole.create(
          { userId: staff.userId, roleId: newRole.id, assignedBy },
          { transaction: t }
        );
      }
    });

    const data = await findStaffWithAccount(staff.id);

    return res.json({ success: true, data, message: 'Funcionário atualizado com sucesso' });
  } catch (err: unknown) {
    console.error('updateStaff error:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('ROLE_NOT_FOUND:')) {
      return res.status(400).json({
        success: false,
        message: `Role '${msg.split(':')[1]}' não encontrada ou inativa`,
      });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar funcionário' });
  }
}

// ─── deactivateStaff ──────────────────────────────────────────────────────────

export async function deactivateStaff(req: Request, res: Response): Promise<Response> {
  try {
    const staff = await Staff.findByPk(Number(req.params.id));
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    if (staff.active === false) {
      return res.status(400).json({ success: false, message: 'Funcionário já está inativo' });
    }

    await coreDB.transaction(async (t) => {
      await staff.update({ active: false }, { transaction: t });
      await AuthUser.update({ active: false }, { where: { id: staff.userId }, transaction: t });
    });

    return res.json({
      success: true,
      data: null,
      message: `Funcionário '${staff.name ?? staff.email}' desativado com sucesso`,
    });
  } catch (err: unknown) {
    console.error('deactivateStaff error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao desativar funcionário' });
  }
}
