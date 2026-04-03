import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';
import ProductType from '../models/ProductType.model';

// ─── Schemas de Validação ─────────────────────────────────────────────────────

const createSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional().messages({
    'string.max': 'Cor deve ter no máximo 20 caracteres',
  }),
  icon: Joi.string().max(100).allow('', null).optional().messages({
    'string.max': 'Ícone deve ter no máximo 100 caracteres',
  }),
  active: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().allow('', null).optional(),
  color: Joi.string().max(20).allow('', null).optional(),
  icon: Joi.string().max(100).allow('', null).optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Informe ao menos um campo para atualizar',
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class ProductTypeController {

  static async list(_req: Request, res: Response): Promise<Response> {
    try {
      const productTypes = await ProductType.findAll({
        order: [['name', 'ASC']],
      });

      return res.json({
        success: true,
        total: productTypes.length,
        productTypes,
      });
    } catch (error: any) {
      console.error('Erro ao listar tipos de produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar tipos de produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Validar body
      const { error, value } = createSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const { name, description, color, icon, active } = value;

      // 2. Garantir unicidade do nome no tenant
      const existing = await ProductType.findOne({
        where: { name: name.trim() },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Já existe um tipo de produto com o nome "${name.trim()}"`,
        });
      }

      // 3. Criar registro
      const productType = await ProductType.create({
        name: name.trim(),
        description: description ?? null,
        color: color ?? null,
        icon: icon ?? null,
        active: active ?? true,
      });

      return res.status(201).json({
        success: true,
        message: 'Tipo de produto criado com sucesso',
        productType,
      });
    } catch (error: any) {
      console.error('Erro ao criar tipo de produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar tipo de produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      // 1. Validar body
      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      // 2. Buscar registro
      const productType = await ProductType.findByPk(Number(id));
      if (!productType) {
        return res.status(404).json({
          success: false,
          error: 'Tipo de produto não encontrado',
        });
      }

      const { name, description, color, icon, active } = value;

      // 3. Verificar unicidade do novo nome (excluindo o próprio registro)
      if (name && name.trim() !== productType.name) {
        const duplicated = await ProductType.findOne({
          where: {
            name: name.trim(),
            id: { [Op.ne]: Number(id) },
          },
        });
        if (duplicated) {
          return res.status(409).json({
            success: false,
            error: `Já existe um tipo de produto com o nome "${name.trim()}"`,
          });
        }
        productType.name = name.trim();
      }

      if (description !== undefined) productType.description = description;
      if (color !== undefined)       productType.color       = color;
      if (icon !== undefined)        productType.icon        = icon;
      if (active !== undefined)      productType.active      = active;

      await productType.save();

      return res.json({
        success: true,
        message: 'Tipo de produto atualizado com sucesso',
        productType,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar tipo de produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar tipo de produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}