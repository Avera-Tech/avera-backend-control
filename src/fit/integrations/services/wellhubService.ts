import crypto from 'crypto';
import { TenantDb } from '../../../config/tenantModels';

export interface WellhubCheckinPayload {
  gympass_id: string;
  gym_id: string;
  name?: string;
  email?: string;
  plan_type?: string;
  checkin_id?: string;
}

export interface WellhubValidationResult {
  success: boolean;
  checkinId?: number;
  userId?: number;
  isNewUser?: boolean;
  message?: string;
  error?: string;
}

const WELLHUB_ACCESS_CONTROL_URL = 'https://api.partners.gympass.com/access/v1/validate';
const CHECKIN_EXPIRATION_MINUTES = 30;

export function validateWellhubSignature(
  rawBody: string,
  signature: string,
  secretKey: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha1', secretKey)
    .update(rawBody, 'utf8')
    .digest('hex')
    .toUpperCase();

  return crypto.timingSafeEqual(
    Buffer.from(signature.toUpperCase()),
    Buffer.from(expectedSignature)
  );
}

export async function getWellhubConfig(db: TenantDb): Promise<any> {
  return db.IntegrationConfig.findOne({
    where: { platform: 'wellhub', active: true },
  });
}

async function findUserByWellhubId(payload: WellhubCheckinPayload, db: TenantDb) {
  const allUsers = await db.ClientUser.findAll({
    where: { active: true },
    attributes: ['id', 'name', 'email', 'notes'],
  });

  const existing = allUsers.find((u) => {
    try {
      const meta = JSON.parse((u as any).notes || '{}');
      return meta.wellhub_id === payload.gympass_id;
    } catch {
      return false;
    }
  });

  if (existing) {
    return { user: existing, isNew: false };
  }

  if (payload.email) {
    const byEmail = await db.ClientUser.findOne({
      where: { email: payload.email, active: true },
    });

    if (byEmail) {
      const meta = JSON.parse((byEmail as any).notes || '{}');
      meta.wellhub_id = payload.gympass_id;
      await (byEmail as any).update({ notes: JSON.stringify(meta) });
      return { user: byEmail, isNew: false };
    }
  }

  return { user: null, isNew: true };
}

async function callWellhubAccessControlAPI(
  gympassId: string,
  gymId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(WELLHUB_ACCESS_CONTROL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        gympass_id: gympassId,
        gym_id: gymId,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 200) {
      return { success: true };
    }

    const body = await response.json().catch(() => ({}));
    return {
      success: false,
      error: `Wellhub API responded ${response.status}: ${JSON.stringify(body)}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function processWellhubCheckin(
  payload: WellhubCheckinPayload,
  rawBody: string,
  config: any,
  db: TenantDb
): Promise<WellhubValidationResult> {
  const expiresAt = new Date(Date.now() + CHECKIN_EXPIRATION_MINUTES * 60 * 1000);

  const { user, isNew } = await findUserByWellhubId(payload, db);

  const checkinRecord = await db.ExternalCheckin.create({
    platform: 'wellhub',
    externalUserId: payload.gympass_id,
    userId: user?.id ?? undefined,
    externalName: payload.name,
    externalEmail: payload.email,
    planType: payload.plan_type,
    gymId: payload.gym_id,
    status: 'pending',
    autoAccepted: false,
    rawPayload: rawBody,
    expiresAt,
  });

  if (config.autoAccept) {
    const apiResult = await callWellhubAccessControlAPI(
      payload.gympass_id,
      payload.gym_id || config.gymId,
      config.apiKey
    );

    if (apiResult.success) {
      await checkinRecord.update({
        status: 'accepted',
        autoAccepted: true,
        validatedAt: new Date(),
      });
    } else {
      console.error('[Wellhub] Falha ao validar na Access Control API:', apiResult.error);
    }
  }

  await config.update({ lastSyncAt: new Date() });

  return {
    success: true,
    checkinId: checkinRecord.id,
    userId: user?.id,
    isNewUser: isNew,
    message: config.autoAccept
      ? 'Check-in processado e validado automaticamente'
      : 'Check-in recebido e aguardando aprovação manual',
  };
}

export async function manuallyAcceptCheckin(checkinId: number, db: TenantDb): Promise<WellhubValidationResult> {
  const checkin = await db.ExternalCheckin.findByPk(checkinId);

  if (!checkin) {
    return { success: false, error: 'Check-in não encontrado' };
  }

  if (checkin.status !== 'pending') {
    return { success: false, error: `Check-in já está com status: ${checkin.status}` };
  }

  if (checkin.expiresAt && checkin.expiresAt < new Date()) {
    await checkin.update({ status: 'expired' });
    return { success: false, error: 'Check-in expirado (mais de 30 minutos)' };
  }

  const config = await getWellhubConfig(db);
  if (!config) {
    return { success: false, error: 'Integração Wellhub não configurada ou inativa' };
  }

  const apiResult = await callWellhubAccessControlAPI(
    checkin.externalUserId,
    checkin.gymId || config.gymId,
    config.apiKey
  );

  if (apiResult.success) {
    await checkin.update({ status: 'accepted', validatedAt: new Date() });
    return { success: true, checkinId, message: 'Check-in aceito e validado na Wellhub' };
  }

  return { success: false, error: apiResult.error };
}

export async function manuallyRejectCheckin(checkinId: number, db: TenantDb): Promise<WellhubValidationResult> {
  const checkin = await db.ExternalCheckin.findByPk(checkinId);

  if (!checkin) {
    return { success: false, error: 'Check-in não encontrado' };
  }

  if (checkin.status !== 'pending') {
    return { success: false, error: `Check-in já está com status: ${checkin.status}` };
  }

  await checkin.update({ status: 'rejected' });
  return { success: true, checkinId, message: 'Check-in rejeitado' };
}
