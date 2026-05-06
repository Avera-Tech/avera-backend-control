import { Router, Request, Response } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import TenantConfig from '../master/models/TenantConfig.model';
import CompanyAddress from '../master/models/CompanyAddress.model';
import Joi from 'joi';

const router = Router();

/** PATCH /api/company/name — atualiza o nome da empresa no master DB */
router.patch('/name', authenticateToken, async (req: Request, res: Response) => {
  try {
    const slug = req.headers['x-client-id'] as string;

    const { error, value } = Joi.object({
      company_name: Joi.string().min(2).max(100).required(),
    }).validate(req.body);

    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const tenant = await TenantConfig.findOne({ where: { slug } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant não encontrado' });
    }

    await tenant.update({ company_name: value.company_name.trim() });

    return res.json({ success: true, company_name: tenant.company_name });
  } catch (err: any) {
    console.error('[company] PATCH /name error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar nome da empresa' });
  }
});

const addressSchema = Joi.object({
  zip_code:     Joi.string().min(8).max(9).required(),
  street:       Joi.string().max(200).required(),
  number:       Joi.string().max(20).required(),
  complement:   Joi.string().max(100).allow('', null).optional(),
  neighborhood: Joi.string().max(100).required(),
  city:         Joi.string().max(120).required(),
  state:        Joi.string().length(2).required(),
});

/** GET /api/company/address */
router.get('/address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const slug    = req.headers['x-client-id'] as string;
    const address = await CompanyAddress.findOne({ where: { slug } });
    return res.json({ success: true, address: address ?? null });
  } catch (err: any) {
    console.error('[company] GET /address error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao buscar endereço' });
  }
});

/** PATCH /api/company/address — upsert */
router.patch('/address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const slug = req.headers['x-client-id'] as string;

    const { error, value } = addressSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const existing = await CompanyAddress.findOne({ where: { slug } });
    if (existing) {
      await existing.update(value);
      return res.json({ success: true, address: existing });
    }

    const address = await CompanyAddress.create({ slug, ...value });
    return res.status(201).json({ success: true, address });
  } catch (err: any) {
    console.error('[company] PATCH /address error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao salvar endereço' });
  }
});

export default router;
