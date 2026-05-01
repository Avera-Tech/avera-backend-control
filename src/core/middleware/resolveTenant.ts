import { Request, Response, NextFunction } from 'express';
import TenantConfig from '../../master/models/TenantConfig.model';
import { getTenantDb } from '../../config/tenantConnectionManager';

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;

    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Header X-Client-Id obrigatório' });
    }

    const config = await TenantConfig.findOne({ where: { clientId } });

    if (!config) {
      return res.status(404).json({ success: false, error: 'Tenant não encontrado' });
    }

    if (!config.isActive) {
      return res.status(402).json({ success: false, error: 'Plano inativo' });
    }

    if (config.planExpiresAt < new Date()) {
      return res.status(402).json({ success: false, error: 'Plano expirado' });
    }

    req.tenantDb = getTenantDb({
      clientId: config.clientId,
      dbHost: config.dbHost,
      dbPort: config.dbPort,
      dbUser: config.dbUser,
      dbPass: config.dbPass,
      dbName: config.dbName,
    });

    return next();
  } catch {
    return res.status(500).json({ success: false, error: 'Erro ao resolver tenant' });
  }
}
