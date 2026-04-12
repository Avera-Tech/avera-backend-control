import { Router, Request, Response } from 'express';

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

export default router;
