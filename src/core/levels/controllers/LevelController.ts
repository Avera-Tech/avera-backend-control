import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';

const createSchema = Joi.object({
  name: Joi.string().max(50).required().messages({
    'string.max': 'Nome deve ter no máximo 50 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  sortOrder: Joi.number().integer().min(1).allow(null).optional(),
  active: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().max(50).optional(),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  sortOrder: Joi.number().integer().min(1).allow(null).optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Informe ao menos um campo para atualizar' });

export class LevelController {

  static async dropdown(req: Request, res: Response): Promise<Response> {
    try {
      const { UserLevel } = req.tenantDb;
      const levels = await UserLevel.findAll({
        where: { active: true },
        attributes: ['id', 'name', 'color', 'sortOrder'],
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      });
      return res.json({ success: true, levels });
    } catch {
      return res.status(500).json({ success: false, error: 'Erro ao buscar níveis' });
    }
  }

  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const { UserLevel } = req.tenantDb;
      const levels = await UserLevel.findAll({
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      });
      return res.json({ success: true, total: levels.length, levels });
    } catch {
      return res.status(500).json({ success: false, error: 'Erro ao listar níveis' });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, error: error.details[0].message });

      const { UserLevel } = req.tenantDb;
      const existing = await UserLevel.findOne({ where: { name: value.name.trim() } });
      if (existing) {
        return res.status(409).json({ success: false, error: `Já existe um nível com o nome "${value.name.trim()}"` });
      }

      const level = await UserLevel.create({
        name: value.name.trim(),
        description: value.description ?? null,
        color: value.color ?? null,
        sortOrder: value.sortOrder ?? null,
        active: value.active ?? true,
      });

      return res.status(201).json({ success: true, message: 'Nível criado com sucesso', level });
    } catch {
      return res.status(500).json({ success: false, error: 'Erro ao criar nível' });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, error: error.details[0].message });

      const { UserLevel } = req.tenantDb;
      const level = await UserLevel.findByPk(Number(id));
      if (!level) return res.status(404).json({ success: false, error: 'Nível não encontrado' });

      if (value.name && value.name.trim() !== level.name) {
        const duplicated = await UserLevel.findOne({
          where: { name: value.name.trim(), id: { [Op.ne]: Number(id) } },
        });
        if (duplicated) {
          return res.status(409).json({ success: false, error: `Já existe um nível com o nome "${value.name.trim()}"` });
        }
        level.name = value.name.trim();
      }

      if (value.description !== undefined) level.description = value.description;
      if (value.color !== undefined)       level.color       = value.color;
      if (value.sortOrder !== undefined)   level.sortOrder   = value.sortOrder;
      if (value.active !== undefined)      level.active      = value.active;

      await level.save();
      return res.json({ success: true, message: 'Nível atualizado com sucesso', level });
    } catch {
      return res.status(500).json({ success: false, error: 'Erro ao atualizar nível' });
    }
  }

  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { UserLevel } = req.tenantDb;
      const level = await UserLevel.findByPk(Number(id));
      if (!level) return res.status(404).json({ success: false, error: 'Nível não encontrado' });

      await level.destroy();
      return res.json({ success: true, message: 'Nível removido com sucesso' });
    } catch {
      return res.status(500).json({ success: false, error: 'Erro ao remover nível' });
    }
  }
}
