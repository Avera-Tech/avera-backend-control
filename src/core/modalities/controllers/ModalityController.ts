import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';

const createSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  icon: Joi.string().max(100).allow('', null).optional(),
  active: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  icon: Joi.string().max(100).allow('', null).optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Informe ao menos um campo para atualizar' });

export class ModalityController {

  static async dropdown(req: Request, res: Response): Promise<Response> {
    try {
      const { Modality } = req.tenantDb;
      const modalities = await Modality.findAll({
        where: { active: true },
        attributes: ['id', 'name', 'color', 'icon'],
        order: [['name', 'ASC']],
      });
      return res.json({ success: true, modalities });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao buscar modalidades' });
    }
  }

  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const { Modality } = req.tenantDb;
      const modalities = await Modality.findAll({ order: [['name', 'ASC']] });
      return res.json({ success: true, total: modalities.length, modalities });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao listar modalidades' });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, error: error.details[0].message });

      const { Modality } = req.tenantDb;
      const existing = await Modality.findOne({ where: { name: value.name.trim() } });
      if (existing) {
        return res.status(409).json({ success: false, error: `Já existe uma modalidade com o nome "${value.name.trim()}"` });
      }

      const modality = await Modality.create({
        name: value.name.trim(),
        description: value.description ?? null,
        color: value.color ?? null,
        icon: value.icon ?? null,
        active: value.active ?? true,
      });

      return res.status(201).json({ success: true, message: 'Modalidade criada com sucesso', modality });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao criar modalidade' });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, error: error.details[0].message });

      const { Modality } = req.tenantDb;
      const modality = await Modality.findByPk(Number(id));
      if (!modality) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });

      if (value.name && value.name.trim() !== modality.name) {
        const duplicated = await Modality.findOne({
          where: { name: value.name.trim(), id: { [Op.ne]: Number(id) } },
        });
        if (duplicated) {
          return res.status(409).json({ success: false, error: `Já existe uma modalidade com o nome "${value.name.trim()}"` });
        }
        modality.name = value.name.trim();
      }

      if (value.description !== undefined) modality.description = value.description;
      if (value.color !== undefined)       modality.color       = value.color;
      if (value.icon !== undefined)        modality.icon        = value.icon;
      if (value.active !== undefined)      modality.active      = value.active;

      await modality.save();
      return res.json({ success: true, message: 'Modalidade atualizada com sucesso', modality });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao atualizar modalidade' });
    }
  }

  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { Modality } = req.tenantDb;
      const modality = await Modality.findByPk(Number(id));
      if (!modality) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });

      await modality.update({ active: false });
      return res.json({ success: true, message: 'Modalidade removida com sucesso' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao remover modalidade' });
    }
  }
}
