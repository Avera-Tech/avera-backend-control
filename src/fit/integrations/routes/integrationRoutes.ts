import { Router, Request, Response } from 'express';
import { getTenantDb } from '../../../config/tenantConnectionManager';
import TenantConfig from '../../../master/models/TenantConfig.model';
import {
  validateWellhubSignature,
  getWellhubConfig,
  processWellhubCheckin,
  manuallyAcceptCheckin,
  manuallyRejectCheckin,
  WellhubCheckinPayload,
} from '../services/wellhubService';

const router = Router();

// ─── PUBLIC WEBHOOK ───────────────────────────────────────────────────────────
// POST /api/webhooks/wellhub/:clientId/checkin
// Called by Wellhub — no X-Client-Id or JWT auth.
// clientId in the URL identifies the tenant (configure this URL in Wellhub dashboard).

router.post('/wellhub/:clientId/checkin', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const rawBody = req.body instanceof Buffer
      ? req.body.toString('utf8')
      : JSON.stringify(req.body);

    const tenantConfig = await TenantConfig.findOne({ where: { clientId } });
    if (!tenantConfig) {
      console.warn(`[Wellhub Webhook] Tenant '${clientId}' não encontrado`);
      return res.status(200).json({ received: true });
    }

    const db = getTenantDb({
      clientId: tenantConfig.clientId,
      dbHost: tenantConfig.dbHost,
      dbPort: tenantConfig.dbPort,
      dbUser: tenantConfig.dbUser,
      dbPass: tenantConfig.dbPass,
      dbName: tenantConfig.dbName,
    });

    const config = await getWellhubConfig(db);
    if (!config) {
      console.warn('[Wellhub Webhook] Integração não configurada ou inativa');
      return res.status(200).json({ received: true });
    }

    const signature = req.headers['x-gympass-signature'] as string;
    if (!signature) {
      console.warn('[Wellhub Webhook] Header X-Gympass-Signature ausente');
      return res.status(401).json({ error: 'Assinatura ausente' });
    }

    const isValid = validateWellhubSignature(rawBody, signature, config.secretKey);
    if (!isValid) {
      console.warn('[Wellhub Webhook] Assinatura inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const payload: WellhubCheckinPayload = JSON.parse(rawBody);

    if (!payload.gympass_id) {
      return res.status(400).json({ error: 'gympass_id é obrigatório' });
    }

    res.status(200).json({ received: true });

    processWellhubCheckin(payload, rawBody, config, db).catch((err) => {
      console.error('[Wellhub Webhook] Erro no processamento:', err);
    });

    return;
  } catch (err: any) {
    console.error('[Wellhub Webhook] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── TENANT-AUTHENTICATED ROUTES ─────────────────────────────────────────────

router.get('/checkins', async (req: Request, res: Response) => {
  try {
    const { ExternalCheckin } = req.tenantDb;
    const { platform, status, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const checkins = await ExternalCheckin.findAndCountAll({
      where,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      total: checkins.count,
      data: checkins.rows,
    });
  } catch (err: any) {
    console.error('[Integrations] Erro ao listar check-ins:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar check-ins' });
  }
});

router.post('/checkins/:id/accept', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await manuallyAcceptCheckin(id, req.tenantDb);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Integrations] Erro ao aceitar check-in:', err);
    return res.status(500).json({ success: false, message: 'Erro ao aceitar check-in' });
  }
});

router.post('/checkins/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await manuallyRejectCheckin(id, req.tenantDb);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Integrations] Erro ao rejeitar check-in:', err);
    return res.status(500).json({ success: false, message: 'Erro ao rejeitar check-in' });
  }
});

router.post('/checkins/accept-all', async (req: Request, res: Response) => {
  try {
    const { ExternalCheckin } = req.tenantDb;
    const { platform } = req.body;

    const where: any = { status: 'pending' };
    if (platform) where.platform = platform;

    const pending = await ExternalCheckin.findAll({ where });

    const results = await Promise.allSettled(
      pending.map((c) => manuallyAcceptCheckin(c.id, req.tenantDb))
    );

    const accepted = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    return res.status(200).json({
      success: true,
      message: `${accepted} de ${pending.length} check-ins aceitos com sucesso`,
      total: pending.length,
      accepted,
    });
  } catch (err: any) {
    console.error('[Integrations] Erro no accept-all:', err);
    return res.status(500).json({ success: false, message: 'Erro ao aceitar check-ins' });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const { IntegrationConfig } = req.tenantDb;
    const configs = await IntegrationConfig.findAll({
      attributes: ['id', 'platform', 'gymId', 'autoAccept', 'active', 'lastSyncAt'],
    });

    return res.status(200).json({ success: true, data: configs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar configurações' });
  }
});

router.put('/config/:platform', async (req: Request, res: Response) => {
  try {
    const { IntegrationConfig } = req.tenantDb;
    const { platform } = req.params;
    const { apiKey, gymId, secretKey, autoAccept, active } = req.body;

    if (!['wellhub', 'totalpass'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plataforma inválida' });
    }

    if (!apiKey || !gymId || !secretKey) {
      return res.status(400).json({
        success: false,
        message: 'apiKey, gymId e secretKey são obrigatórios',
      });
    }

    const [config, created] = await IntegrationConfig.upsert({
      platform: platform as 'wellhub' | 'totalpass',
      apiKey,
      gymId,
      secretKey,
      autoAccept: autoAccept ?? true,
      active: active ?? false,
    });

    return res.status(200).json({
      success: true,
      message: created ? 'Integração criada' : 'Integração atualizada',
      data: {
        platform: config.platform,
        gymId: config.gymId,
        autoAccept: config.autoAccept,
        active: config.active,
      },
    });
  } catch (err: any) {
    console.error('[Integrations] Erro ao salvar config:', err);
    return res.status(500).json({ success: false, message: 'Erro ao salvar configuração' });
  }
});

export default router;
