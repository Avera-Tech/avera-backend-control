// src/core/places/controllers/PlaceController.ts

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';
import Place from '../models/Place.model';

// ─── Schemas de Validação ─────────────────────────────────────────────────────

const createSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  address: Joi.string().max(200).allow('', null).optional().messages({
    'string.max': 'Endereço deve ter no máximo 200 caracteres',
  }),
  active: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  address: Joi.string().max(200).allow('', null).optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Informe ao menos um campo para atualizar',
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class PlaceController {

  static async list(_req: Request, res: Response): Promise<Response> {
    try {
      const places = await Place.findAll({
        order: [['name', 'ASC']],
      });

      return res.json({
        success: true,
        total: places.length,
        places,
      });
    } catch (error: any) {
      console.error('Erro ao listar locais:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar locais',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const { name, address, active } = value;

      const existing = await Place.findOne({ where: { name: name.trim() } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Já existe um local com o nome "${name.trim()}"`,
        });
      }

      const place = await Place.create({
        name: name.trim(),
        address: address ?? null,
        active: active ?? true,
      });

      return res.status(201).json({
        success: true,
        message: 'Local criado com sucesso',
        place,
      });
    } catch (error: any) {
      console.error('Erro ao criar local:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar local',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const place = await Place.findByPk(Number(id));
      if (!place) {
        return res.status(404).json({
          success: false,
          error: 'Local não encontrado',
        });
      }

      const { name, address, active } = value;

      if (name && name.trim() !== place.name) {
        const duplicated = await Place.findOne({
          where: { name: name.trim(), id: { [Op.ne]: Number(id) } },
        });
        if (duplicated) {
          return res.status(409).json({
            success: false,
            error: `Já existe um local com o nome "${name.trim()}"`,
          });
        }
        place.name = name.trim();
      }

      if (address !== undefined) place.address = address;
      if (active !== undefined)  place.active  = active;

      await place.save();

      return res.json({
        success: true,
        message: 'Local atualizado com sucesso',
        place,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar local:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar local',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}
