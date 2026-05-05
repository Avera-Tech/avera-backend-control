import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';
import { authenticateToken } from '../core/middleware/authenticateToken';

const router = Router();

const createSchema = Joi.object({
  name:  Joi.string().max(100).required(),
  color: Joi.string().max(20).allow('', null).optional(),
  icon:  Joi.string().max(100).allow('', null).optional(),
});

const updateSchema = Joi.object({
  name:   Joi.string().max(100).optional(),
  color:  Joi.string().max(20).allow('', null).optional(),
  icon:   Joi.string().max(100).allow('', null).optional(),
  active: Joi.boolean().optional(),
}).min(1);

/** GET /api/modalities */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { Modality } = req.tenantDb;
    const modalities = await Modality.findAll({ where: { active: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, modalities });
  } catch (err: any) {
    console.error('[modalities] GET error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar modalidades' });
  }
});

/** POST /api/modalities */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { Modality } = req.tenantDb;
    const existing = await Modality.findOne({ where: { name: value.name.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, error: `Modalidade "${value.name.trim()}" já existe` });
    }

    const modality = await Modality.create({
      name:  value.name.trim(),
      color: value.color ?? null,
      icon:  value.icon  ?? null,
    });
    return res.status(201).json({ success: true, modality });
  } catch (err: any) {
    console.error('[modalities] POST error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao criar modalidade' });
  }
});

/** PATCH /api/modalities/:id */
router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { Modality } = req.tenantDb;
    const modality = await Modality.findByPk(Number(req.params.id));
    if (!modality) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });

    if (value.name && value.name.trim() !== modality.name) {
      const dup = await Modality.findOne({ where: { name: value.name.trim(), id: { [Op.ne]: modality.id } } });
      if (dup) return res.status(409).json({ success: false, error: `Nome "${value.name.trim()}" já em uso` });
      modality.name = value.name.trim();
    }
    if (value.color  !== undefined) modality.color  = value.color;
    if (value.icon   !== undefined) modality.icon   = value.icon;
    if (value.active !== undefined) modality.active = value.active;
    await modality.save();
    return res.json({ success: true, modality });
  } catch (err: any) {
    console.error('[modalities] PATCH error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar modalidade' });
  }
});

/** DELETE /api/modalities/:id — soft delete */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { Modality } = req.tenantDb;
    const modality = await Modality.findByPk(Number(req.params.id));
    if (!modality) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });
    await modality.update({ active: false });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[modalities] DELETE error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao remover modalidade' });
  }
});

export default router;
