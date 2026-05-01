import { Router, Request, Response } from 'express';
import TenantConfig from '../master/models/TenantConfig.model';
import { encrypt } from '../utils/crypto';
import { evictTenant } from '../config/tenantConnectionManager';

const router = Router();

function guardSyncKey(req: Request, res: Response): boolean {
  if (req.headers['x-sync-key'] !== process.env.SYNC_SECRET_KEY) {
    res.status(401).json({ success: false, error: 'Chave de sincronização inválida' });
    return false;
  }
  return true;
}

router.post('/', async (req: Request, res: Response) => {
  if (!guardSyncKey(req, res)) return;

  const {
    clientId, planName, isActive, planExpiresAt,
    trialEndsAt, suspendedAt,
    dbHost, dbPort, dbUser, dbPass, dbName,
  } = req.body;

  if (!clientId || !planName || isActive === undefined || !planExpiresAt ||
      !dbHost || !dbUser || !dbPass || !dbName) {
    return res.status(400).json({
      success: false,
      error: 'Campos obrigatórios: clientId, planName, isActive, planExpiresAt, dbHost, dbUser, dbPass, dbName',
    });
  }

  try {
    const encryptedPass = encrypt(String(dbPass));

    await TenantConfig.upsert({
      clientId,
      planName,
      isActive,
      planExpiresAt: new Date(planExpiresAt),
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
      suspendedAt: suspendedAt ? new Date(suspendedAt) : null,
      dbHost: String(dbHost),
      dbPort: Number(dbPort ?? 3306),
      dbUser: String(dbUser),
      dbPass: encryptedPass,
      dbName: String(dbName),
    });

    evictTenant(clientId);

    return res.status(200).json({ success: true, message: 'Configuração do tenant atualizada' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
