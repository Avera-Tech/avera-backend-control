import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';

const BILLING_TYPES = ['avulso', 'recorrente', 'plano', 'cortesia'] as const;

const createSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  icon: Joi.string().max(100).allow('', null).optional(),
  billingType: Joi.string().valid(...BILLING_TYPES).required().messages({
    'any.only': 'Tipo de cobrança inválido',
    'any.required': 'Tipo de cobrança é obrigatório',
  }),
  active: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  icon: Joi.string().max(100).allow('', null).optional(),
  billingType: Joi.string().valid(...BILLING_TYPES).optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'Informe ao menos um campo para atualizar' });

export class ProductTypeController {

  static async dropdown(req: Request, res: Response): Promise<Response> {
    try {
      const { ProductType, Place } = req.tenantDb;
      const productTypes = await ProductType.findAll({
        where: { active: true },
        attributes: ['id', 'name', 'color', 'icon', 'billingType'],
        include: [{
          model: Place,
          as: 'places',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          where: { active: true },
          required: false,
        }],
        order: [['name', 'ASC']],
      });
      return res.status(200).json({ success: true, productTypes });
    } catch {
      return res.status(500).json({ success: false, error: 'Erro ao buscar tipos de produto' });
    }
  }

  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const { ProductType } = req.tenantDb;
      const productTypes = await ProductType.findAll({ order: [['name', 'ASC']] });
      return res.json({ success: true, total: productTypes.length, productTypes });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao listar tipos de produto' });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, error: error.details[0].message });

      const { ProductType } = req.tenantDb;
      const existing = await ProductType.findOne({ where: { name: value.name.trim() } });
      if (existing) {
        return res.status(409).json({ success: false, error: `Já existe um tipo de produto com o nome "${value.name.trim()}"` });
      }

      const productType = await ProductType.create({
        name: value.name.trim(),
        description: value.description ?? null,
        color: value.color ?? null,
        icon: value.icon ?? null,
        billingType: value.billingType,
        active: value.active ?? true,
      });

      return res.status(201).json({ success: true, message: 'Tipo de produto criado com sucesso', productType });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao criar tipo de produto' });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, error: error.details[0].message });

      const { ProductType } = req.tenantDb;
      const productType = await ProductType.findByPk(Number(id));
      if (!productType) return res.status(404).json({ success: false, error: 'Tipo de produto não encontrado' });

      if (value.name && value.name.trim() !== productType.name) {
        const duplicated = await ProductType.findOne({
          where: { name: value.name.trim(), id: { [Op.ne]: Number(id) } },
        });
        if (duplicated) {
          return res.status(409).json({ success: false, error: `Já existe um tipo de produto com o nome "${value.name.trim()}"` });
        }
        productType.name = value.name.trim();
      }

      if (value.description !== undefined) productType.description = value.description;
      if (value.color !== undefined)       productType.color       = value.color;
      if (value.icon !== undefined)        productType.icon        = value.icon;
      if (value.billingType !== undefined) productType.billingType = value.billingType;
      if (value.active !== undefined)      productType.active      = value.active;

      await productType.save();
      return res.json({ success: true, message: 'Tipo de produto atualizado com sucesso', productType });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao atualizar tipo de produto' });
    }
  }

  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { ProductType } = req.tenantDb;
      const productType = await ProductType.findByPk(Number(id));
      if (!productType) return res.status(404).json({ success: false, error: 'Tipo de produto não encontrado' });

      await productType.destroy();
      return res.json({ success: true, message: 'Tipo de produto removido com sucesso' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao remover tipo de produto' });
    }
  }
}
