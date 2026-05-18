import { TenantDb } from '../../../config/tenantModels';
import { validateWellhubBooking } from './bookingApiService';

export interface WellhubBookingUser {
  unique_token: string;
  name?: string;
  email?: string;
}

export interface WellhubBookingSlot {
  id: number;
  gym_id: number;
  class_id: number;
  booking_number: string;
}

export interface WellhubBookingEventData {
  user: WellhubBookingUser;
  slot: WellhubBookingSlot;
  timestamp: number;
  event_id: string;
}

export interface WellhubBookingPayload {
  event_type: string;
  event_data: WellhubBookingEventData;
}

async function findUserByWellhubToken(token: string, email: string | undefined, db: TenantDb) {
  const allUsers = await db.ClientUser.findAll({
    where: { active: true },
    attributes: ['id', 'name', 'email', 'notes'],
  });

  const byToken = allUsers.find((u) => {
    try {
      return JSON.parse(u.notes || '{}').wellhub_id === token;
    } catch {
      return false;
    }
  });
  if (byToken) return byToken;

  if (email) {
    const byEmail = await db.ClientUser.findOne({ where: { email, active: true } });
    if (byEmail) {
      const meta = JSON.parse(byEmail.notes || '{}');
      meta.wellhub_id = token;
      await byEmail.update({ notes: JSON.stringify(meta) });
      return byEmail;
    }
  }

  return null;
}

async function handleBookingRequested(
  payload: WellhubBookingPayload,
  rawBody: string,
  db: TenantDb,
): Promise<void> {
  const { event_data, event_type } = payload;
  const { user, slot } = event_data;

  const existing = await db.BookingReservation.findOne({ where: { eventId: event_data.event_id } });
  if (existing) {
    console.log(`[Wellhub Booking] Evento duplicado ignorado: ${event_data.event_id}`);
    return;
  }

  const matchedUser = await findUserByWellhubToken(user.unique_token, user.email, db);

  await db.BookingReservation.create({
    eventId:        event_data.event_id,
    eventType:      event_type,
    bookingNumber:  slot.booking_number,
    slotId:         slot.id,
    classId:        slot.class_id,
    gymId:          slot.gym_id,
    externalUserId: user.unique_token,
    externalName:   user.name,
    externalEmail:  user.email,
    userId:         matchedUser?.id,
    status:         'pending',
    rawPayload:     rawBody,
  });

  console.log(`[Wellhub Booking] Reserva criada: ${slot.booking_number} (usuário: ${matchedUser?.id ?? 'não vinculado'})`);
}

async function handleBookingCancellation(
  payload: WellhubBookingPayload,
  status: 'cancelled' | 'late-cancelled',
  db: TenantDb,
): Promise<void> {
  const { slot } = payload.event_data;

  const reservation = await db.BookingReservation.findOne({
    where: { bookingNumber: slot.booking_number },
    order: [['createdAt', 'DESC']],
  });

  if (!reservation) {
    console.warn(`[Wellhub Booking] Reserva não encontrada para cancelamento: ${slot.booking_number}`);
    return;
  }

  await reservation.update({ status, eventType: payload.event_type });
  console.log(`[Wellhub Booking] Reserva ${slot.booking_number} atualizada para: ${status}`);
}

export async function processWellhubBookingEvent(
  payload: WellhubBookingPayload,
  rawBody: string,
  db: TenantDb,
): Promise<void> {
  const { event_type } = payload;

  switch (event_type) {
    case 'booking-requested':
      await handleBookingRequested(payload, rawBody, db);
      break;
    case 'booking-cancellation':
      await handleBookingCancellation(payload, 'cancelled', db);
      break;
    case 'booking-late-cancellation':
      await handleBookingCancellation(payload, 'late-cancelled', db);
      break;
    default:
      console.log(`[Wellhub Booking] Evento desconhecido ignorado: ${event_type}`);
  }
}

export async function confirmBookingReservation(reservationId: number, db: TenantDb) {
  const reservation = await db.BookingReservation.findByPk(reservationId);
  if (!reservation) return { success: false, error: 'Reserva não encontrada' };
  if (reservation.status !== 'pending') return { success: false, error: `Reserva já está com status: ${reservation.status}` };

  const config = await db.IntegrationConfig.findOne({ where: { platform: 'wellhub', active: true } });
  if (!config) return { success: false, error: 'Integração Wellhub não configurada ou inativa' };

  try {
    await validateWellhubBooking(config.gymId, reservation.bookingNumber, reservation.classId, config.apiKey, 2);
  } catch (err: any) {
    console.error('[Wellhub Booking] Falha ao confirmar reserva na API:', err.message);
    return { success: false, error: `Erro ao comunicar com Wellhub: ${err.message}` };
  }

  await reservation.update({ status: 'confirmed', confirmedAt: new Date() });
  return { success: true, message: 'Reserva confirmada e notificada ao Wellhub' };
}

export async function rejectBookingReservation(reservationId: number, db: TenantDb, reason?: string) {
  const reservation = await db.BookingReservation.findByPk(reservationId);
  if (!reservation) return { success: false, error: 'Reserva não encontrada' };
  if (reservation.status !== 'pending') return { success: false, error: `Reserva já está com status: ${reservation.status}` };

  const config = await db.IntegrationConfig.findOne({ where: { platform: 'wellhub', active: true } });
  if (!config) return { success: false, error: 'Integração Wellhub não configurada ou inativa' };

  try {
    await validateWellhubBooking(config.gymId, reservation.bookingNumber, reservation.classId, config.apiKey, 3, reason);
  } catch (err: any) {
    console.error('[Wellhub Booking] Falha ao rejeitar reserva na API:', err.message);
    return { success: false, error: `Erro ao comunicar com Wellhub: ${err.message}` };
  }

  await reservation.update({ status: 'rejected' });
  return { success: true, message: 'Reserva rejeitada e notificada ao Wellhub' };
}
