import { Request, Response, NextFunction } from 'express';
import TenantConfig from '../../master/models/TenantConfig.model';

export async function checkTenantStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await TenantConfig.findOne();

    if (!config) {
      return res.status(503).json({
        success: false,
        error: 'Tenant não configurado',
      });
    }

    if (!config.isActive) {
      return res.status(402).json({
        success: false,
        error: 'Plano inativo',
      });
    }

    if (config.planExpiresAt < new Date()) {
      return res.status(402).json({
        success: false,
        error: 'Plano expirado',
      });
    }

    next();
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar status do tenant',
    });
  }
}
