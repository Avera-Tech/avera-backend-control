import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { Op } from 'sequelize';
import { TenantDb } from '../../../config/tenantModels';

const createUserSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Senha deve ter no mínimo 8 caracteres',
      'string.pattern.base':
        'Senha deve conter letras maiúsculas, minúsculas, números e símbolos',
      'any.required': 'Senha é obrigatória',
    }),
  role: Joi.string()
    .valid('admin', 'employee', 'teacher')
    .required()
    .messages({
      'any.only': 'Role deve ser: admin, employee ou teacher',
      'any.required': 'Role é obrigatório',
    }),
  active: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(3).max(100).messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
  }),
  email: Joi.string().email().messages({
    'string.email': 'Email inválido',
  }),
  role: Joi.string().valid('admin', 'employee', 'teacher').messages({
    'any.only': 'Role deve ser: admin, employee ou teacher',
  }),
  active: Joi.boolean(),
}).min(1).messages({
  'object.min': 'Informe ao menos um campo para atualizar',
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Senha atual é obrigatória',
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Nova senha deve ter no mínimo 8 caracteres',
      'string.pattern.base':
        'Nova senha deve conter letras maiúsculas, minúsculas, números e símbolos',
      'any.required': 'Nova senha é obrigatória',
    }),
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Nova senha deve ter no mínimo 8 caracteres',
      'string.pattern.base':
        'Senha deve conter letras maiúsculas, minúsculas, números e símbolos',
      'any.required': 'Nova senha é obrigatória',
    }),
});

async function findUserWithRoles(id: number, db: TenantDb) {
  const { Staff, Role } = db;
  return Staff.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Role,
        as: 'roles',
        attributes: ['id', 'name', 'slug'],
        through: { attributes: [] },
      },
    ],
  });
}

export class UserController {
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const { Staff, Role } = req.tenantDb;
      const { role, active, search } = req.query;

      const whereClause: any = {};
      if (active !== undefined) {
        whereClause.active = active === 'true';
      }
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      const roleFilter: any = {};
      if (role) {
        roleFilter.slug = role;
      }

      const users = await Staff.findAll({
        attributes: { exclude: ['password'] },
        where: whereClause,
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['id', 'name', 'slug'],
            through: { attributes: [] },
            where: Object.keys(roleFilter).length ? roleFilter : undefined,
            required: !!role,
          },
        ],
        order: [['name', 'ASC']],
      });

      return res.json({
        success: true,
        total: users.length,
        users,
      });
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar usuários',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const user = await findUserWithRoles(Number(id), req.tenantDb);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      return res.json({ success: true, user });
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar usuário',
      });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const { Staff, Role, UserRole } = req.tenantDb;
      const { name, email, password, role: roleSlug, active } = value;

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await Staff.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Email já cadastrado',
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

      const user = await Staff.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        active,
        emailVerified: true,
      });

      await UserRole.create({
        staffId: user.id,
        roleId: role.id,
        assignedBy: (req as any).user?.userId ?? null,
      });

      const userWithRoles = await findUserWithRoles(user.id, req.tenantDb);

      return res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        user: userWithRoles,
      });
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar usuário',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const { error, value } = updateUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const { Staff, Role, UserRole } = req.tenantDb;

      const user = await Staff.findByPk(Number(id));
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      const { name, email, role: roleSlug, active } = value;

      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const emailInUse = await Staff.findOne({
          where: { email: normalizedEmail, id: { [Op.ne]: Number(id) } },
        });
        if (emailInUse) {
          return res.status(409).json({
            success: false,
            error: 'Email já em uso por outro usuário',
          });
        }
        user.email = normalizedEmail;
      }

      if (name) user.name = name.trim();
      if (active !== undefined) user.active = active;

      await user.save();

      if (roleSlug) {
        const newRole = await Role.findOne({ where: { slug: roleSlug, active: true } });
        if (!newRole) {
          return res.status(400).json({
            success: false,
            error: `Role '${roleSlug}' não encontrada ou inativa`,
          });
        }

        await UserRole.destroy({ where: { staffId: user.id } });
        await UserRole.create({
          staffId: user.id,
          roleId: newRole.id,
          assignedBy: (req as any).user?.userId ?? null,
        });
      }

      const updatedUser = await findUserWithRoles(user.id, req.tenantDb);

      return res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        user: updatedUser,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar usuário',
      });
    }
  }

  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const requesterId = (req as any).user?.userId;

      if (Number(id) === requesterId) {
        return res.status(400).json({
          success: false,
          error: 'Você não pode desativar seu próprio usuário',
        });
      }

      const { Staff } = req.tenantDb;
      const user = await Staff.findByPk(Number(id));
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      user.active = false;
      await user.save();

      return res.json({
        success: true,
        message: `Usuário '${user.name}' desativado com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao desativar usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao desativar usuário',
      });
    }
  }

  static async activate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { Staff } = req.tenantDb;

      const user = await Staff.findByPk(Number(id));
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      user.active = true;
      await user.save();

      return res.json({
        success: true,
        message: `Usuário '${user.name}' reativado com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao reativar usuário:', error);
      return res.status(500).json({ success: false, error: 'Erro ao reativar usuário' });
    }
  }

  static async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      const requesterId = (req as any).user?.userId;

      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const { currentPassword, newPassword } = value;
      const { Staff } = req.tenantDb;

      const user = await Staff.findByPk(requesterId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
      }

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      user.password = await bcrypt.hash(newPassword, saltRounds);
      await user.save();

      return res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      return res.status(500).json({ success: false, error: 'Erro ao alterar senha' });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const { Staff } = req.tenantDb;
      const user = await Staff.findByPk(Number(id));
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      user.password = await bcrypt.hash(value.newPassword, saltRounds);
      await user.save();

      return res.json({
        success: true,
        message: `Senha do usuário '${user.name}' redefinida com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      return res.status(500).json({ success: false, error: 'Erro ao redefinir senha' });
    }
  }
}
