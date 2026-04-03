import { Router, Request, Response } from 'express';
import User from '../core/users/models/User.model';
import Student from '../core/students/models/Students.model';
import OtpCode from '../core/auth/models/OtpCode.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';
import ProductType from '../core/products/models/ProductType.model';
import Product from '../core/products/models/Product.model';

const router = Router();

/**
 * POST /api/sync
 * Sincroniza todos os models com o banco de dados usando alter: true
 * ⚠️  Usar apenas em desenvolvimento ou deploy controlado
 */
router.post('/', async (req: Request, res: Response) => {
  const syncKey = req.headers['x-sync-key'];

  if (syncKey !== process.env.SYNC_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Chave de sincronização inválida',
    });
  }

  const results: Record<string, string> = {};

  const models = [
    { name: 'users', model: User },
    { name: 'students', model: Student },
    { name: 'otp_codes', model: OtpCode },
    { name: 'roles', model: Role },
    { name: 'permissions', model: Permission },
    { name: 'user_roles', model: UserRole },
    { name: 'role_permissions', model: RolePermission },
    { name: 'product_types', model: ProductType },
    { name: 'products', model: Product },
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