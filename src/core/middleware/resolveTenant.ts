import { Request, Response, NextFunction } from 'express';
import TenantConfig from '../../master/models/TenantConfig.model';
import { getTenantDb } from '../../config/tenantConnectionManager';

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;

    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Header X-Client-Id obrigatório' });
    }

    const tenant = await TenantConfig.findOne({ where: { slug: clientId } });

    if (!tenant) {
      console.warn(`[resolveTenant] Tenant não encontrado: ${clientId}`);
      return res.status(404).json({ success: false, error: 'Tenant não encontrado' });
    }

    if (tenant.status !== 'active') {
      return res.status(402).json({ success: false, error: 'Plano inativo ou suspenso' });
    }

    if (!tenant.db_name || !tenant.db_password) {
      return res.status(503).json({ success: false, error: 'Banco do tenant não provisionado' });
    }

    if (tenant.trial_ends_at && tenant.trial_ends_at < new Date()) {
      return res.status(402).json({ success: false, error: 'Trial expirado' });
    }

    console.log(`[resolveTenant] slug=${clientId} → db=${tenant.db_name}`);

    req.tenantDb = getTenantDb({
      clientId:  tenant.slug,
      dbHost:    process.env.DB_MASTER_HOST!,
      dbPort:    Number(process.env.DB_TENANT_PORT) || 3306,
      dbUser:    tenant.db_name,
      dbPass:    tenant.db_password,
      dbName:    tenant.db_name,
    });

    return next();
  } catch (err) {
    console.error('[resolveTenant] Erro:', err);
    return res.status(500).json({ success: false, error: 'Erro ao resolver tenant' });
  }
}
