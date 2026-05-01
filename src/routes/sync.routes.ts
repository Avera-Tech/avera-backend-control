import { Router, Request, Response } from 'express';

import TenantConfig from '../master/models/TenantConfig.model';
import Role            from '../core/rbac/models/Role.model';
import Permission      from '../core/rbac/models/Permission.model';
import Staff           from '../core/staff/models/Staff.model';
import OtpCode         from '../core/auth/models/OtpCode.model';
import UserRole        from '../core/rbac/models/UserRole.model';
import RolePermission  from '../core/rbac/models/RolePermission.model';
import ProductType     from '../core/products/models/ProductType.model';
import Product         from '../core/products/models/Product.model';
import UserLevel       from '../modules/user/models/UserLevel.model';
import ClientUser      from '../modules/user/models/User.model';
import UserGuardian    from '../modules/user/models/UserGuardian.model';
import StudentCredit   from '../fit/credits/models/StudentCredit.model';
import CreditTransaction from '../fit/credits/models/CreditTransaction.model';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const syncKey = req.headers['x-sync-key'];

  if (syncKey !== process.env.SYNC_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Chave de sincronização inválida',
    });
  }

  const results: Record<string, string> = {};

  // Ordem importa — pais antes dos filhos
  const models = [
    { name: 'roles',              model: Role },
    { name: 'permissions',        model: Permission },
    { name: 'role_permissions',   model: RolePermission },
    { name: 'staff',              model: Staff },
    { name: 'otp_codes',          model: OtpCode },
    { name: 'staff_roles',        model: UserRole },
    { name: 'product_types',      model: ProductType },
    { name: 'products',           model: Product },
    { name: 'user_levels',        model: UserLevel },
    { name: 'users',              model: ClientUser },
    { name: 'user_guardians',     model: UserGuardian },
    { name: 'user_credits',       model: StudentCredit },
    { name: 'credit_transactions', model: CreditTransaction },
  ];

  for (const { name, model } of models) {
    try {
      await (model as any).sync({ alter: true });
      results[name] = '✅ sincronizado';
    } catch (error: any) {
      results[name] = `❌ erro: ${error.message}`;
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Sincronização concluída',
    results,
  });
});

router.post('/tenant-config', async (req: Request, res: Response) => {
  const syncKey = req.headers['x-sync-key'];

  if (syncKey !== process.env.SYNC_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Chave de sincronização inválida',
    });
  }

  const { clientId, planName, isActive, planExpiresAt, trialEndsAt, suspendedAt } = req.body;

  if (!clientId || !planName || isActive === undefined || !planExpiresAt) {
    return res.status(400).json({
      success: false,
      error: 'Campos obrigatórios: clientId, planName, isActive, planExpiresAt',
    });
  }

  try {
    await TenantConfig.upsert({
      clientId,
      planName,
      isActive,
      planExpiresAt: new Date(planExpiresAt),
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
      suspendedAt: suspendedAt ? new Date(suspendedAt) : null,
    });

    return res.status(200).json({
      success: true,
      message: 'Configuração do tenant atualizada',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
