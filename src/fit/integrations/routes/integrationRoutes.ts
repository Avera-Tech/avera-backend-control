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
import {
  processWellhubBookingEvent,
  confirmBookingReservation,
  rejectBookingReservation,
  WellhubBookingPayload,
} from '../services/bookingService';
import {
  createWellhubClass,
  listWellhubClasses,
  updateWellhubClass,
  createWellhubSlot,
  listWellhubSlots,
  patchWellhubSlot,
  deleteWellhubSlot,
} from '../services/bookingApiService';
import type {
  CreateClassPayload,
  UpdateClassPayload,
  CreateSlotPayload,
  PatchSlotPayload,
} from '../services/bookingApiService';

const router = Router();

// ─── PUBLIC WEBHOOK ───────────────────────────────────────────────────────────
// POST /api/webhooks/wellhub/:clientId
// Single endpoint for all Wellhub events (checkin + booking).
// clientId in the URL identifies the tenant (configure this URL in Wellhub dashboard).
// Event type is detected from the payload: presence of `event_type` = booking event.

router.post('/wellhub/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const rawBody = req.body instanceof Buffer
      ? req.body.toString('utf8')
      : JSON.stringify(req.body);

    const tenantConfig = await TenantConfig.findOne({ where: { slug: clientId } });
    if (!tenantConfig) {
      console.warn(`[Wellhub Webhook] Tenant '${clientId}' não encontrado`);
      return res.status(200).json({ received: true });
    }

    if (!tenantConfig.db_name || !tenantConfig.db_password) {
      console.warn(`[Wellhub Webhook] Banco do tenant '${clientId}' não provisionado`);
      return res.status(200).json({ received: true });
    }

    const db = getTenantDb({
      clientId: tenantConfig.slug,
      dbHost:   process.env.DB_MASTER_HOST!,
      dbPort:   Number(process.env.DB_TENANT_PORT) || 3306,
      dbUser:   tenantConfig.db_name,
      dbPass:   tenantConfig.db_password,
      dbName:   tenantConfig.db_name,
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

    const payload = JSON.parse(rawBody);

    // Booking event: payload contains event_type (e.g. "booking-requested")
    if (payload.event_type) {
      res.status(200).json({ received: true });
      processWellhubBookingEvent(payload as WellhubBookingPayload, rawBody, db).catch((err) => {
        console.error('[Wellhub Webhook] Erro no processamento do booking:', err);
      });
      return;
    }

    // Checkin event: payload contains gympass_id
    if (!payload.gympass_id) {
      return res.status(400).json({ error: 'Payload inválido: gympass_id ou event_type são obrigatórios' });
    }

    res.status(200).json({ received: true });

    processWellhubCheckin(payload as WellhubCheckinPayload, rawBody, config, db).catch((err) => {
      console.error('[Wellhub Webhook] Erro no processamento do checkin:', err);
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

// ─── BOOKING RESERVATIONS ─────────────────────────────────────────────────────

router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const { BookingReservation } = req.tenantDb;
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const reservations = await BookingReservation.findAndCountAll({
      where,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      order: [['createdAt', 'DESC']],
      include: [{ association: 'user', attributes: ['id', 'name', 'email', 'phone'], required: false }],
    });

    return res.status(200).json({ success: true, total: reservations.count, data: reservations.rows });
  } catch (err: any) {
    console.error('[Integrations] Erro ao listar reservas:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar reservas' });
  }
});

router.post('/bookings/:id/confirm', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await confirmBookingReservation(id, req.tenantDb);
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    return res.status(200).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Integrations] Erro ao confirmar reserva:', err);
    return res.status(500).json({ success: false, message: 'Erro ao confirmar reserva' });
  }
});

router.post('/bookings/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await rejectBookingReservation(id, req.tenantDb);
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    return res.status(200).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Integrations] Erro ao rejeitar reserva:', err);
    return res.status(500).json({ success: false, message: 'Erro ao rejeitar reserva' });
  }
});

// ─── BOOKING API — CLASSES ────────────────────────────────────────────────────

async function getWellhubApiConfig(req: Request, res: Response) {
  const config = await req.tenantDb.IntegrationConfig.findOne({ where: { platform: 'wellhub', active: true } });
  if (!config) {
    res.status(400).json({ success: false, message: 'Integração Wellhub não configurada ou inativa' });
    return null;
  }
  return config;
}

router.get('/booking/classes', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const data = await listWellhubClasses(config.gymId, config.apiKey);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.post('/booking/classes', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const payload = req.body as CreateClassPayload;
    const data = await createWellhubClass(config.gymId, config.apiKey, payload);
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.put('/booking/classes/:classId', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const classId = parseInt(req.params.classId);
    const payload = req.body as UpdateClassPayload;
    await updateWellhubClass(config.gymId, classId, config.apiKey, payload);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

// ─── BOOKING API — SLOTS ──────────────────────────────────────────────────────

router.get('/booking/classes/:classId/slots', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const classId = parseInt(req.params.classId);
    const { from, to } = req.query as { from?: string; to?: string };
    const data = await listWellhubSlots(config.gymId, classId, config.apiKey, from, to);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.post('/booking/classes/:classId/slots', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const classId = parseInt(req.params.classId);
    const payload = req.body as CreateSlotPayload;
    const data = await createWellhubSlot(config.gymId, classId, config.apiKey, payload);
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.patch('/booking/classes/:classId/slots/:slotId', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const classId = parseInt(req.params.classId);
    const slotId = parseInt(req.params.slotId);
    const payload = req.body as PatchSlotPayload;
    await patchWellhubSlot(config.gymId, classId, slotId, config.apiKey, payload);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.delete('/booking/classes/:classId/slots/:slotId', async (req: Request, res: Response) => {
  try {
    const config = await getWellhubApiConfig(req, res);
    if (!config) return;
    const classId = parseInt(req.params.classId);
    const slotId = parseInt(req.params.slotId);
    await deleteWellhubSlot(config.gymId, classId, slotId, config.apiKey);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const { IntegrationConfig } = req.tenantDb;
    const configs = await IntegrationConfig.findAll({
      attributes: ['id', 'platform', 'gymId', 'autoAccept', 'active', 'lastSyncAt'],
    });

    const clientId = req.headers['x-client-id'] as string;
    const tenant = await TenantConfig.findOne({ where: { slug: clientId }, attributes: ['control_api_url', 'slug'] });
    const baseUrl = tenant?.control_api_url ?? `${req.protocol}://${req.get('host')}`;

    const webhookUrls: Record<string, string> = {
      wellhub: `${baseUrl}/api/webhooks/wellhub/${clientId}`,
    };

    return res.status(200).json({ success: true, data: configs, webhookUrls });
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
