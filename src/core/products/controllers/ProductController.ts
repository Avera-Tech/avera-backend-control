import { Request, Response } from 'express';
import Joi from 'joi';

type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

const RECURRING_INTERVALS: RecurringInterval[] = [
  'weekly', 'monthly', 'quarterly', 'semiannual', 'annual',
];

const createSchema = Joi.object({
  productTypeId: Joi.number().integer().positive().required().messages({
    'any.required': 'productTypeId é obrigatório',
    'number.base': 'productTypeId deve ser um número',
  }),
  name: Joi.string().max(100).required().messages({
    'any.required': 'Nome é obrigatório',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
  }),
  description: Joi.string().allow('', null).optional(),
  credits: Joi.number().integer().min(1).required().messages({
    'any.required': 'Quantidade de créditos é obrigatória',
    'number.min': 'Deve ter no mínimo 1 crédito',
  }),
  value: Joi.number().precision(2).min(0).required().messages({
    'any.required': 'Valor é obrigatório',
    'number.min': 'Valor não pode ser negativo',
  }),
  validityDays: Joi.number().integer().min(1).required().messages({
    'any.required': 'Validade em dias é obrigatória',
    'number.min': 'Validade deve ser de no mínimo 1 dia',
  }),
  purchaseLimit: Joi.number().integer().min(1).allow(null).optional().messages({
    'number.min': 'Limite de compras deve ser no mínimo 1',
  }),
  recurring: Joi.boolean().default(false),
  recurringInterval: Joi.when('recurring', {
    is: true,
    then: Joi.string()
      .valid(...RECURRING_INTERVALS)
      .required()
      .messages({
        'any.required': 'recurringInterval é obrigatório quando recurring = true',
        'any.only': `recurringInterval deve ser um dos valores: ${RECURRING_INTERVALS.join(', ')}`,
      }),
    otherwise: Joi.string().valid(...RECURRING_INTERVALS).allow(null).optional(),
  }),
  active: Joi.boolean().default(true),
});

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().allow('', null).optional(),
  credits: Joi.number().integer().min(1).optional(),
  value: Joi.number().precision(2).min(0).optional(),
  validityDays: Joi.number().integer().min(1).optional(),
  purchaseLimit: Joi.number().integer().min(1).allow(null).optional(),
  recurring: Joi.boolean().optional(),
  recurringInterval: Joi.when('recurring', {
    is: true,
    then: Joi.string()
      .valid(...RECURRING_INTERVALS)
      .required()
      .messages({
        'any.required': 'recurringInterval é obrigatório quando recurring = true',
        'any.only': `recurringInterval deve ser um dos valores: ${RECURRING_INTERVALS.join(', ')}`,
      }),
    otherwise: Joi.string().valid(...RECURRING_INTERVALS).allow(null).optional(),
  }),
  active: Joi.boolean().optional(),
})
  .min(1)
  .messages({ 'object.min': 'Informe ao menos um campo para atualizar' });

const DEFAULT_PAGE     = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE     = 100;

export class ProductController {

  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const { Product, ProductType } = req.tenantDb;
      const page    = Math.max(1, parseInt(req.query.page    as string) || DEFAULT_PAGE);
      const perPage = Math.min(
        MAX_PER_PAGE,
        Math.max(1, parseInt(req.query.perPage as string) || DEFAULT_PER_PAGE),
      );
      const offset = (page - 1) * perPage;

      const where: any = {};
      if (req.query.active !== undefined) {
        where.active = req.query.active === 'true';
      }
      if (req.query.productTypeId) {
        where.productTypeId = parseInt(req.query.productTypeId as string);
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        limit: perPage,
        offset,
        order: [['name', 'ASC']],
        include: [
          {
            model: ProductType,
            as: 'productType',
            attributes: ['id', 'name', 'color'],
          },
        ],
      });

      const totalPages = Math.ceil(count / perPage);

      return res.json({
        success: true,
        pagination: {
          total: count,
          page,
          perPage,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        products,
      });
    } catch (error: any) {
      console.error('Erro ao listar produtos:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar produtos',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { Product, ProductType } = req.tenantDb;
      const { id } = req.params;
      const product = await Product.findByPk(Number(id), {
        include: [{ model: ProductType, as: 'productType', attributes: ['id', 'name', 'color'] }],
      });
      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado' });
      }
      return res.json({ success: true, product });
    } catch (error: any) {
      console.error('Erro ao buscar produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map((d) => d.message).join('; '),
        });
      }

      const { Product, ProductType } = req.tenantDb;
      const {
        productTypeId, name, description,
        credits, value: productValue, validityDays,
        purchaseLimit, recurring, recurringInterval, active,
      } = value as any;

      const productType = await ProductType.findOne({
        where: { id: productTypeId, active: true },
      });
      if (!productType) {
        return res.status(404).json({
          success: false,
          error: 'Tipo de produto não encontrado ou inativo',
        });
      }

      const product = await Product.create({
        productTypeId,
        name:              name.trim(),
        description:       description ?? null,
        credits,
        value:             productValue,
        validityDays,
        purchaseLimit:     purchaseLimit ?? null,
        recurring,
        recurringInterval: recurring ? recurringInterval : null,
        active,
      });

      const result = await Product.findByPk(product.id, {
        include: [{ model: ProductType, as: 'productType', attributes: ['id', 'name', 'color'] }],
      });

      return res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        product: result,
      });
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if ('productTypeId' in req.body) {
        return res.status(400).json({
          success: false,
          error: 'productTypeId não pode ser alterado após a criação do produto',
        });
      }

      const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map((d) => d.message).join('; '),
        });
      }

      const { Product, ProductType } = req.tenantDb;
      const product = await Product.findByPk(Number(id));
      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado' });
      }

      const {
        name, description, credits, value: productValue,
        validityDays, purchaseLimit, recurring, recurringInterval, active,
      } = value;

      if (name          !== undefined) product.name          = name.trim();
      if (description   !== undefined) product.description   = description;
      if (credits        !== undefined) product.credits        = credits;
      if (productValue  !== undefined) product.value         = productValue;
      if (validityDays  !== undefined) product.validityDays  = validityDays;
      if (purchaseLimit !== undefined) product.purchaseLimit = purchaseLimit;
      if (active        !== undefined) product.active        = active;

      if (recurring !== undefined) {
        product.recurring = recurring;
        product.recurringInterval = recurring
          ? (recurringInterval ?? product.recurringInterval)
          : null as any;
      } else if (recurringInterval !== undefined) {
        product.recurringInterval = recurringInterval;
      }

      await product.save();

      const result = await Product.findByPk(product.id, {
        include: [{ model: ProductType, as: 'productType', attributes: ['id', 'name', 'color'] }],
      });

      return res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        product: result,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const { Product } = req.tenantDb;
      const { id } = req.params;
      const product = await Product.findByPk(Number(id));
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado',
        });
      }
      await product.destroy();
      return res.json({ success: true, message: 'Produto removido com sucesso' });
    } catch (error: any) {
      console.error('Erro ao remover produto:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao deletar produto',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}
