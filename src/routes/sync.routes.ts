import { Router, Request, Response } from 'express';

// ── Modelos sem dependências externas (criar primeiro) ──
import User         from '../core/users/models/User.model';
import OtpCode      from '../core/auth/models/OtpCode.model';
import Role         from '../core/rbac/models/Role.model';
import Permission   from '../core/rbac/models/Permission.model';

// ── Modelos que dependem dos anteriores ──
import UserRole         from '../core/rbac/models/UserRole.model';
import RolePermission   from '../core/rbac/models/RolePermission.model';
import ProductType      from '../core/products/models/ProductType.model';
import Product          from '../core/products/models/Product.model';
import Staff            from '../core/staff/models/Staff.model';

// ── Módulo de clientes ──
import UserLevel    from '../modules/user/models/UserLevel.model';
import ClientUser   from '../modules/user/models/User.model';

// ── Modelos que dependem de clients + products (criar por último) ──
import StudentCredit     from '../core/credits/models/StudentCredit.model';
import CreditTransaction from '../core/credits/models/CreditTransaction.model';

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

  // A ordem IMPORTA — tabelas pai devem vir antes das filhas
  const models = [
    { name: 'users',               model: User },
    { name: 'otp_codes',           model: OtpCode },
    { name: 'roles',               model: Role },
    { name: 'permissions',         model: Permission },
    { name: 'user_roles',          model: UserRole },
    { name: 'role_permissions',    model: RolePermission },
    { name: 'staff',               model: Staff },
    { name: 'product_types',       model: ProductType },
    { name: 'products',            model: Product },
    { name: 'user_levels',         model: UserLevel },
    { name: 'clients',             model: ClientUser },
    { name: 'student_credits',     model: StudentCredit },
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
