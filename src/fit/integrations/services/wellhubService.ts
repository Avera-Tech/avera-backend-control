import crypto from 'crypto';
import User from '../../../core/users/models/User.model';
import ExternalCheckin from '../models/ExternalCheckin.model';
import IntegrationConfig from '../models/IntegrationConfig.model';

// ─── Tipos do payload do webhook Wellhub ────────────────────────────────────

export interface WellhubCheckinPayload {
  gympass_id: string;    // ID único do usuário Wellhub
  gym_id: string;        // ID do estabelecimento
  name?: string;         // Nome do usuário (opcional, conforme acordo com Wellhub)
  email?: string;        // Email do usuário (opcional)
  plan_type?: string;    // Tipo de plano (Gold, Platinum, etc.)
  checkin_id?: string;   // ID do check-in na Wellhub
}

export interface WellhubValidationResult {
  success: boolean;
  checkinId?: number;
  userId?: number;
  isNewUser?: boolean;
  message?: string;
  error?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const WELLHUB_ACCESS_CONTROL_URL = 'https://api.partners.gympass.com/access/v1/validate';
const CHECKIN_EXPIRATION_MINUTES = 30;

// ─── Funções ─────────────────────────────────────────────────────────────────

/**
 * Valida a assinatura HMAC-SHA1 do webhook da Wellhub.
 * A Wellhub envia o header X-Gympass-Signature.
 * Spec: HMAC-SHA1 do body cru em uppercase hex.
 */
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

/**
 * Busca configuração ativa da integração Wellhub no banco.
 */
export async function getWellhubConfig(): Promise<IntegrationConfig | null> {
  return IntegrationConfig.findOne({
    where: { platform: 'wellhub', active: true },
  });
}

/**
 * Busca um User pelo wellhub_id armazenado no campo `notes` como JSON.
 *
 * Estratégia temporária enquanto não há coluna dedicada (ex: externalIds).
 * Formato em notes: { "wellhub_id": "12345" }
 *
 * Fluxo:
 *  1. Varre users ativos buscando wellhub_id em `notes`
 *  2. Se não achar, tenta pelo email e vincula o id automaticamente
 *  3. Se não achar, retorna null — operador vincula manualmente
 */
async function findUserByWellhubId(
  payload: WellhubCheckinPayload
): Promise<{ user: User | null; isNew: boolean }> {
  // 1. Busca pelo wellhub_id em notes
  const allUsers = await User.findAll({
    where: { active: true },
    attributes: ['id', 'name', 'email', 'notes'],
  });

  const existing = allUsers.find((u) => {
    try {
      const meta = JSON.parse(u.notes || '{}');
      return meta.wellhub_id === payload.gympass_id;
    } catch {
      return false;
    }
  });

  if (existing) {
    return { user: existing, isNew: false };
  }

  // 2. Tenta pelo email
  if (payload.email) {
    const byEmail = await User.findOne({
      where: { email: payload.email, active: true },
    });

    if (byEmail) {
      const meta = JSON.parse(byEmail.notes || '{}');
      meta.wellhub_id = payload.gympass_id;
      await byEmail.update({ notes: JSON.stringify(meta) });
      return { user: byEmail, isNew: false };
    }
  }

  // 3. User não encontrado — check-in fica pending para vínculo manual
  return { user: null, isNew: true };
}

/**
 * Chama a Access Control API da Wellhub para confirmar o check-in.
 * Deve ser feita em até 30 minutos após o check-in do usuário no app.
 */
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

/**
 * Fluxo principal: processa um check-in recebido via webhook.
 *
 * 1. Busca User pelo wellhub_id (campo notes) ou email
 * 2. Cria registro ExternalCheckin com status pending
 * 3. Se autoAccept=true → chama Access Control API → status accepted
 * 4. Atualiza lastSyncAt da configuração
 */
export async function processWellhubCheckin(
  payload: WellhubCheckinPayload,
  rawBody: string,
  config: IntegrationConfig
): Promise<WellhubValidationResult> {
  const expiresAt = new Date(Date.now() + CHECKIN_EXPIRATION_MINUTES * 60 * 1000);

  const { user, isNew } = await findUserByWellhubId(payload);

  const checkinRecord = await ExternalCheckin.create({
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

/**
 * Aceite manual de um check-in pendente.
 * Chama a API da Wellhub e atualiza o status.
 */
export async function manuallyAcceptCheckin(
  checkinId: number
): Promise<WellhubValidationResult> {
  const checkin = await ExternalCheckin.findByPk(checkinId);

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

  const config = await getWellhubConfig();
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

/**
 * Rejeita manualmente um check-in pendente (sem chamar a API da Wellhub).
 */
export async function manuallyRejectCheckin(
  checkinId: number
): Promise<WellhubValidationResult> {
  const checkin = await ExternalCheckin.findByPk(checkinId);

  if (!checkin) {
    return { success: false, error: 'Check-in não encontrado' };
  }

  if (checkin.status !== 'pending') {
    return { success: false, error: `Check-in já está com status: ${checkin.status}` };
  }

  await checkin.update({ status: 'rejected' });
  return { success: true, checkinId, message: 'Check-in rejeitado' };
}