import { Router, Request, Response } from 'express';
import ExternalCheckin from '../models/ExternalCheckin.model';
import IntegrationConfig from '../models/IntegrationConfig.model';
import {
  validateWellhubSignature,
  getWellhubConfig,
  processWellhubCheckin,
  manuallyAcceptCheckin,
  manuallyRejectCheckin,
  WellhubCheckinPayload,
} from '../services/wellhubService';

const router = Router();

// ─── WEBHOOK ─────────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/wellhub/checkin
 *
 * Endpoint público chamado pela Wellhub quando um usuário faz check-in.
 * NÃO deve ter autenticação JWT — a segurança é feita pela assinatura HMAC.
 *
 * Requisito: precisa do body cru (raw buffer) para validar a assinatura.
 * No app.ts, adicionar antes do express.json():
 *   app.use('/api/webhooks', express.raw({ type: 'application/json' }));
 */
router.post('/wellhub/checkin', async (req: Request, res: Response) => {
  try {
    // O body deve chegar como Buffer (express.raw) nesta rota
    const rawBody = req.body instanceof Buffer
      ? req.body.toString('utf8')
      : JSON.stringify(req.body);

    // 1. Busca configuração da integração
    const config = await getWellhubConfig();
    if (!config) {
      console.warn('[Wellhub Webhook] Integração não configurada ou inativa');
      // Responde 200 para a Wellhub não ficar reenviando (mas não processa)
      return res.status(200).json({ received: true });
    }

    // 2. Valida assinatura HMAC-SHA1
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

    // 3. Parse do payload
    const payload: WellhubCheckinPayload = JSON.parse(rawBody);

    if (!payload.gympass_id) {
      return res.status(400).json({ error: 'gympass_id é obrigatório' });
    }

    // 4. Processa o check-in (busca user, cria registro, valida se autoAccept=true)
    // IMPORTANTE: responder em < 1s para a Wellhub não considerar timeout.
    // Por isso respondemos antes e processamos de forma assíncrona.
    res.status(200).json({ received: true });

    // Processamento assíncrono após o response
    processWellhubCheckin(payload, rawBody, config).catch((err) => {
      console.error('[Wellhub Webhook] Erro no processamento:', err);
    });

  } catch (err: any) {
    console.error('[Wellhub Webhook] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── GERENCIAMENTO DE CHECK-INS ───────────────────────────────────────────────

/**
 * GET /api/integrations/checkins
 * Lista check-ins externos com filtros opcionais.
 */
router.get('/checkins', async (req: Request, res: Response) => {
  try {
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

/**
 * POST /api/integrations/checkins/:id/accept
 * Aceita manualmente um check-in pendente (valida na API da Wellhub).
 */
router.post('/checkins/:id/accept', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await manuallyAcceptCheckin(id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Integrations] Erro ao aceitar check-in:', err);
    return res.status(500).json({ success: false, message: 'Erro ao aceitar check-in' });
  }
});

/**
 * POST /api/integrations/checkins/:id/reject
 * Rejeita manualmente um check-in pendente.
 */
router.post('/checkins/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await manuallyRejectCheckin(id);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Integrations] Erro ao rejeitar check-in:', err);
    return res.status(500).json({ success: false, message: 'Erro ao rejeitar check-in' });
  }
});

/**
 * POST /api/integrations/checkins/accept-all
 * Aceita todos os check-ins pendentes de uma vez.
 */
router.post('/checkins/accept-all', async (req: Request, res: Response) => {
  try {
    const { platform } = req.body;

    const where: any = { status: 'pending' };
    if (platform) where.platform = platform;

    const pending = await ExternalCheckin.findAll({ where });

    const results = await Promise.allSettled(
      pending.map((c) => manuallyAcceptCheckin(c.id))
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

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

/**
 * GET /api/integrations/config
 * Lista configurações de todas as integrações.
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const configs = await IntegrationConfig.findAll({
      attributes: ['id', 'platform', 'gymId', 'autoAccept', 'active', 'lastSyncAt'],
      // Nunca retorna apiKey e secretKey na listagem
    });

    return res.status(200).json({ success: true, data: configs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar configurações' });
  }
});

/**
 * PUT /api/integrations/config/:platform
 * Salva ou atualiza configuração de uma integração.
 * Body: { apiKey, gymId, secretKey, autoAccept, active }
 */
router.put('/config/:platform', async (req: Request, res: Response) => {
  try {
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