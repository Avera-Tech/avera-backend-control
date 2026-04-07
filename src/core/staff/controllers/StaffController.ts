import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { Op } from 'sequelize';
import coreDB from '../../../config/database.core';
import Staff from '../models/Staff.model';
import User from '../../users/models/User.model';
import Role from '../../rbac/models/Role.model';
import UserRole from '../../rbac/models/UserRole.model';

// ─────────────────────────────────────────────
// Schemas de validação
// ─────────────────────────────────────────────

const passwordRule = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'string.pattern.base':
      'Senha deve conter letras maiúsculas, minúsculas, números e símbolos',
    'any.required': 'Senha é obrigatória',
  });

const optionalPasswordRule = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'string.pattern.base':
      'Senha deve conter letras maiúsculas, minúsculas, números e símbolos',
  });

const createStaffSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  email: Joi.string().email().max(150).required().messages({
    'string.email': 'Email inválido',
    'string.max': 'Email deve ter no máximo 150 caracteres',
    'any.required': 'Email é obrigatório',
  }),
  password: passwordRule,
  role: Joi.string()
    .valid('admin', 'employee', 'teacher')
    .required()
    .messages({
      'any.only': 'Role deve ser: admin, employee ou teacher',
      'any.required': 'Role é obrigatório',
    }),
  active: Joi.boolean().default(true),
  phone: Joi.string().max(20).allow('', null).optional(),
  employeeLevel: Joi.string().max(50).allow('', null).optional(),
});

const updateStaffSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  email: Joi.string().email().max(150),
  password: optionalPasswordRule.optional().allow(null, ''),
  role: Joi.string().valid('admin', 'employee', 'teacher'),
  active: Joi.boolean(),
  phone: Joi.string().max(20).allow('', null),
  employeeLevel: Joi.string().max(50).allow('', null),
})
  .min(1)
  .messages({ 'object.min': 'Informe ao menos um campo para atualizar' });

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function findStaffWithUser(id: number) {
  return Staff.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: User,
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

// ─────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────

export class StaffController {
  /**
   * GET /staff
   * Lista funcionários (perfil staff + usuário + roles)
   */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const { active, search } = req.query;

      const staffWhere: Record<string, unknown> & { [Op.or]?: unknown[] } = {};
      if (active !== undefined) {
        staffWhere.active = active === 'true';
      }
      if (search) {
        const q = `%${String(search).trim()}%`;
        staffWhere[Op.or] = [
          { name: { [Op.like]: q } },
          { email: { [Op.like]: q } },
        ];
      }

      const rows = await Staff.findAll({
        attributes: { exclude: ['password'] },
        where: Object.keys(staffWhere).length ? staffWhere : undefined,
        include: [
          {
            model: User,
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
        order: [['name', 'ASC']],
      });

      return res.json({
        success: true,
        total: rows.length,
        staff: rows,
      });
    } catch (error: unknown) {
      console.error('Erro ao listar staff:', error);
      const message = error instanceof Error ? error.message : undefined;
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar funcionários',
        message: process.env.NODE_ENV === 'development' ? message : undefined,
      });
    }
  }

  /**
   * GET /staff/:id
   */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const row = await findStaffWithUser(Number(id));

      if (!row) {
        return res.status(404).json({
          success: false,
          error: 'Funcionário não encontrado',
        });
      }

      return res.json({ success: true, staff: row });
    } catch (error: unknown) {
      console.error('Erro ao buscar staff:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar funcionário',
      });
    }
  }

  /**
   * POST /staff
   * Cria usuário RBAC + vínculo user_roles + registro em staff (campos alinhados ao esquema staff)
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createStaffSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const {
        name,
        email,
        password,
        role: roleSlug,
        active,
        phone,
        employeeLevel,
      } = value;

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ where: { email: normalizedEmail } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email já cadastrado',
        });
      }

      const staffEmailTaken = await Staff.findOne({ where: { email: normalizedEmail } });
      if (staffEmailTaken) {
        return res.status(409).json({
          success: false,
          error: 'Email já cadastrado em staff',
        });
      }

      const role = await Role.findOne({ where: { slug: roleSlug, active: true } });
      if (!role) {
        return res.status(400).json({
          success: false,
          error: `Role '${roleSlug}' não encontrada ou inativa`,
        });
      }

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const assignedBy = (req as { user?: { userId?: number } }).user?.userId ?? null;

      const phoneTrim = phone ? String(phone).trim() : '';
      const levelTrim = employeeLevel ? String(employeeLevel).trim() : '';

      const result = await coreDB.transaction(async (t) => {
        const user = await User.create(
          {
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            active,
            emailVerified: true,
            ...(phoneTrim ? { phone: phoneTrim } : {}),
          },
          { transaction: t },
        );

        await UserRole.create(
          {
            userId: user.id,
            roleId: role.id,
            assignedBy: assignedBy ?? undefined,
          },
          { transaction: t },
        );

        const staff = await Staff.create(
          {
            userId: user.id,
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            active,
            phone: phoneTrim || undefined,
            employeeLevel: levelTrim || undefined,
          },
          { transaction: t },
        );

        return staff.id;
      });

      const staff = await findStaffWithUser(result);

      return res.status(201).json({
        success: true,
        message: 'Funcionário criado com sucesso',
        staff,
      });
    } catch (error: unknown) {
      console.error('Erro ao criar staff:', error);
      const message = error instanceof Error ? error.message : undefined;
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar funcionário',
        message: process.env.NODE_ENV === 'development' ? message : undefined,
      });
    }
  }

  /**
   * PATCH /staff/:id
   * Atualiza registro staff e usuário vinculado (nome, email, senha e active mantidos coerentes)
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { error, value } = updateStaffSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const staff = await Staff.findByPk(Number(id));
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Funcionário não encontrado',
        });
      }

      const user = await User.findByPk(staff.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário vinculado não encontrado',
        });
      }

      const {
        name,
        email,
        password,
        role: roleSlug,
        active,
        phone,
        employeeLevel,
      } = value;

      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const emailInUseUser = await User.findOne({
          where: { email: normalizedEmail, id: { [Op.ne]: user.id } },
        });
        if (emailInUseUser) {
          return res.status(409).json({
            success: false,
            error: 'Email já em uso por outro usuário',
          });
        }
        const emailInUseStaff = await Staff.findOne({
          where: { email: normalizedEmail, id: { [Op.ne]: staff.id } },
        });
        if (emailInUseStaff) {
          return res.status(409).json({
            success: false,
            error: 'Email já em uso por outro funcionário',
          });
        }
        user.email = normalizedEmail;
        staff.email = normalizedEmail;
      }

      if (name) {
        const trimmed = name.trim();
        user.name = trimmed;
        staff.name = trimmed;
      }
      if (active !== undefined) {
        user.active = active;
        staff.active = active;
      }

      if (password) {
        const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        user.password = hashedPassword;
        staff.password = hashedPassword;
      }

      if (phone !== undefined) {
        const phoneTrim = phone ? String(phone).trim() : '';
        staff.phone = phoneTrim || null;
        (user as unknown as { phone: string | null }).phone = phoneTrim || null;
      }

      if (employeeLevel !== undefined) {
        const levelTrim = employeeLevel ? String(employeeLevel).trim() : '';
        staff.employeeLevel = levelTrim || null;
      }

      const assignedBy = (req as { user?: { userId?: number } }).user?.userId ?? null;

      try {
        await coreDB.transaction(async (t) => {
          await user.save({ transaction: t });

          if (roleSlug) {
            const newRole = await Role.findOne({ where: { slug: roleSlug, active: true } });
            if (!newRole) {
              throw new Error(`ROLE_NOT_FOUND:${roleSlug}`);
            }
            await UserRole.destroy({ where: { userId: user.id }, transaction: t });
            await UserRole.create(
              {
                userId: user.id,
                roleId: newRole.id,
                assignedBy: assignedBy ?? undefined,
              },
              { transaction: t },
            );
          }

          await staff.save({ transaction: t });
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.startsWith('ROLE_NOT_FOUND:')) {
          const slug = msg.split(':')[1];
          return res.status(400).json({
            success: false,
            error: `Role '${slug}' não encontrada ou inativa`,
          });
        }
        throw e;
      }

      const updated = await findStaffWithUser(staff.id);

      return res.json({
        success: true,
        message: 'Funcionário atualizado com sucesso',
        staff: updated,
      });
    } catch (error: unknown) {
      console.error('Erro ao atualizar staff:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar funcionário',
      });
    }
  }

  /**
   * DELETE /staff/:id
   * Remove o perfil staff e desativa o usuário (mantém registro em users)
   */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const requesterId = (req as { user?: { userId?: number } }).user?.userId;

      const staff = await Staff.findByPk(Number(id));
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Funcionário não encontrado',
        });
      }

      if (requesterId !== undefined && staff.userId === requesterId) {
        return res.status(400).json({
          success: false,
          error: 'Você não pode remover seu próprio perfil de funcionário',
        });
      }

      const user = await User.findByPk(staff.userId);
      if (!user) {
        await staff.destroy();
        return res.json({
          success: true,
          message: 'Registro de staff removido (usuário já inexistente)',
        });
      }

      await coreDB.transaction(async (t) => {
        await staff.destroy({ transaction: t });
        user.active = false;
        await user.save({ transaction: t });
      });

      return res.json({
        success: true,
        message: `Funcionário '${user.name}' removido e usuário desativado`,
      });
    } catch (error: unknown) {
      console.error('Erro ao remover staff:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao remover funcionário',
      });
    }
  }
}
