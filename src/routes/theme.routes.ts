import { Router, Request, Response } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import Theme from '../master/models/Theme.model';
import Joi from 'joi';

const router = Router();

const colorHex = Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional();

const themeSchema = Joi.object({
  name:            Joi.string().max(100).optional(),
  primaryColor:    colorHex,
  secondaryColor:  colorHex,
  accentColor:     colorHex,
  backgroundColor: colorHex,
  textColor:       colorHex,
  logo:            Joi.string().uri().allow('', null).optional(),
  favicon:         Joi.string().uri().allow('', null).optional(),
});

/** GET /api/theme — retorna o tema atual do tenant */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const slug = req.headers['x-client-id'] as string;
    const theme = await Theme.findOne({ where: { slug } });

    return res.json({
      success: true,
      configured: theme !== null,
      theme: theme ?? null,
    });
  } catch (err: any) {
    console.error('[theme] GET error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao buscar tema' });
  }
});

/** PUT /api/theme — cria ou atualiza o tema do tenant */
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const slug = req.headers['x-client-id'] as string;

    const { error, value } = themeSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: error.details.map(d => d.message).join('; ') });
    }

    const existing = await Theme.findOne({ where: { slug } });

    if (existing) {
      await existing.update(value);
      return res.json({ success: true, theme: existing });
    }

    const theme = await Theme.create({
      slug,
      name:            value.name            ?? slug,
      primaryColor:    value.primaryColor    ?? '#3B82F6',
      secondaryColor:  value.secondaryColor  ?? '#6c757d',
      accentColor:     value.accentColor     ?? '#F59E0B',
      backgroundColor: value.backgroundColor ?? '#ffffff',
      textColor:       value.textColor       ?? '#212529',
      logo:            value.logo            ?? undefined,
      favicon:         value.favicon         ?? undefined,
      active:          true,
      isDefault:       false,
    });

    return res.status(201).json({ success: true, theme });
  } catch (err: any) {
    console.error('[theme] PUT error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao salvar tema' });
  }
});

export default router;
