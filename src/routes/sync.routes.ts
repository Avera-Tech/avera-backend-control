import { Router, Request, Response } from 'express';

const router = Router();

const TABLE_ORDER = [
  'roles', 'permissions', 'role_permissions', 'staff', 'otp_codes', 'staff_roles',
  'user_levels', 'users', 'user_guardians', 'product_types', 'products',
  'places', 'product_type_places', 'classes', 'class_students', 'waiting_list',
  'user_credits', 'credit_transactions', 'items', 'transactions',
  'external_checkins', 'integration_configs',
];

router.post('/', async (req: Request, res: Response) => {
  if (req.headers['x-sync-key'] !== process.env.SYNC_SECRET_KEY) {
    return res.status(401).json({ success: false, error: 'Chave de sincronização inválida' });
  }

  const { tenantDb } = req;
  const modelByTable: Record<string, any> = {
    roles:               tenantDb.Role,
    permissions:         tenantDb.Permission,
    role_permissions:    tenantDb.RolePermission,
    staff:               tenantDb.Staff,
    otp_codes:           tenantDb.OtpCode,
    staff_roles:         tenantDb.UserRole,
    user_levels:         tenantDb.UserLevel,
    users:               tenantDb.ClientUser,
    user_guardians:      tenantDb.UserGuardian,
    product_types:       tenantDb.ProductType,
    products:            tenantDb.Product,
    places:              tenantDb.Place,
    product_type_places: tenantDb.ProductTypePlace,
    classes:             tenantDb.Class,
    class_students:      tenantDb.ClassStudent,
    waiting_list:        tenantDb.WaitingList,
    user_credits:        tenantDb.StudentCredit,
    credit_transactions: tenantDb.CreditTransaction,
    items:               tenantDb.Item,
    transactions:        tenantDb.Transaction,
    external_checkins:   tenantDb.ExternalCheckin,
    integration_configs: tenantDb.IntegrationConfig,
  };

  const results: Record<string, string> = {};

  for (const tableName of TABLE_ORDER) {
    const model = modelByTable[tableName];
    if (!model) { results[tableName] = '⏭️  pulado'; continue; }
    try {
      await model.sync({ alter: true });
      results[tableName] = '✅ sincronizado';
    } catch (error: any) {
      results[tableName] = `❌ erro: ${error.message}`;
    }
  }

  return res.status(200).json({ success: true, message: 'Sincronização concluída', results });
});

export default router;
