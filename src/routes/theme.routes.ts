import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { authenticateToken } from '../core/middleware/authenticateToken';
import Theme from '../master/models/Theme.model';
import Joi from 'joi';

const router = Router();

// ── Multer ──────────────────────────────────────────────────────────────────

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads', 'themes');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const slug = (req.headers['x-client-id'] as string) || 'default';
    const dir  = path.join(UPLOADS_ROOT, slug);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    // fieldname será 'logo' ou 'favicon' — sobrescreve o arquivo anterior
    cb(null, `${file.fieldname}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(png|jpeg|jpg|gif|svg\+xml|x-icon|vnd.microsoft.icon|webp)$/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Somente imagens são permitidas'));
  },
});

// ── Validação ───────────────────────────────────────────────────────────────

const colorHex = Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional();

const themeSchema = Joi.object({
  name:            Joi.string().max(100).optional(),
  primaryColor:    colorHex,
  secondaryColor:  colorHex,
  accentColor:     colorHex,
  backgroundColor: colorHex,
  textColor:       colorHex,
  logo:            Joi.string().allow('', null).optional(),
  favicon:         Joi.string().allow('', null).optional(),
});

// ── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/theme */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const slug  = req.headers['x-client-id'] as string;
    const theme = await Theme.findOne({ where: { slug } });
    return res.json({ success: true, configured: theme !== null, theme: theme ?? null });
  } catch (err: any) {
    console.error('[theme] GET error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao buscar tema' });
  }
});

/** PUT /api/theme — upsert de cores e URLs */
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

/** POST /api/theme/upload/:field — upload de logo ou favicon */
router.post(
  '/upload/:field',
  authenticateToken,
  (req: Request, res: Response, next) => {
    const field = req.params.field;
    if (field !== 'logo' && field !== 'favicon') {
      return res.status(400).json({ success: false, error: 'Campo inválido. Use logo ou favicon.' });
    }
    upload.single(field)(req, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      }

      const slug     = req.headers['x-client-id'] as string;
      const backendUrl = process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
      const fileUrl  = `${backendUrl}/uploads/themes/${slug}/${req.file.filename}`;

      // Atualiza a coluna logo ou favicon no tema do tenant (upsert)
      const [theme] = await Theme.findOrCreate({
        where:    { slug },
        defaults: {
          slug,
          name:            slug,
          primaryColor:    '#3B82F6',
          secondaryColor:  '#6c757d',
          accentColor:     '#F59E0B',
          backgroundColor: '#ffffff',
          textColor:       '#212529',
          active:          true,
          isDefault:       false,
        },
      });

      await theme.update({ [req.params.field]: fileUrl });

      return res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.error('[theme] upload error:', err);
      return res.status(500).json({ success: false, error: 'Erro ao fazer upload' });
    }
  }
);

export default router;
