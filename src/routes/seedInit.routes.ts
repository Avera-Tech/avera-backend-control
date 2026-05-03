import { Router, Request, Response } from 'express';
import TenantConfig from '../master/models/TenantConfig.model';
import { getTenantDb, TenantDb } from '../config/tenantConnectionManager';

const router = Router();

const ROLES_DATA = [
  { name: 'Administrador', slug: 'admin',    description: 'Acesso total ao sistema', active: true },
  { name: 'Empregado',     slug: 'employee', description: 'Acesso administrativo: clientes, turmas, financeiro', active: true },
  { name: 'Professor',     slug: 'teacher',  description: 'Acesso às aulas e fichas dos clientes', active: true },
];

const PERMISSIONS_DATA = [
  { name: 'Listar usuários',         slug: 'users:list',       resource: 'users',     action: 'list',    active: true },
  { name: 'Ver usuário',             slug: 'users:read',       resource: 'users',     action: 'read',    active: true },
  { name: 'Criar usuário',           slug: 'users:create',     resource: 'users',     action: 'create',  active: true },
  { name: 'Editar usuário',          slug: 'users:update',     resource: 'users',     action: 'update',  active: true },
  { name: 'Deletar usuário',         slug: 'users:delete',     resource: 'users',     action: 'delete',  active: true },
  { name: 'Listar staff',            slug: 'staff:list',       resource: 'staff',     action: 'list',    active: true },
  { name: 'Ver staff',               slug: 'staff:read',       resource: 'staff',     action: 'read',    active: true },
  { name: 'Criar staff',             slug: 'staff:create',     resource: 'staff',     action: 'create',  active: true },
  { name: 'Editar staff',            slug: 'staff:update',     resource: 'staff',     action: 'update',  active: true },
  { name: 'Deletar staff',           slug: 'staff:delete',     resource: 'staff',     action: 'delete',  active: true },
  { name: 'Listar aulas',            slug: 'classes:list',     resource: 'classes',   action: 'list',    active: true },
  { name: 'Ver aula',                slug: 'classes:read',     resource: 'classes',   action: 'read',    active: true },
  { name: 'Criar aula',              slug: 'classes:create',   resource: 'classes',   action: 'create',  active: true },
  { name: 'Editar aula',             slug: 'classes:update',   resource: 'classes',   action: 'update',  active: true },
  { name: 'Deletar aula',            slug: 'classes:delete',   resource: 'classes',   action: 'delete',  active: true },
  { name: 'Ver financeiro',          slug: 'financial:read',   resource: 'financial', action: 'read',    active: true },
  { name: 'Gerenciar financeiro',    slug: 'financial:manage', resource: 'financial', action: 'manage',  active: true },
  { name: 'Ver relatórios',          slug: 'reports:read',     resource: 'reports',   action: 'read',    active: true },
  { name: 'Exportar relatórios',     slug: 'reports:export',   resource: 'reports',   action: 'export',  active: true },
  { name: 'Ver dashboard',           slug: 'dashboard:read',   resource: 'dashboard', action: 'read',    active: true },
  { name: 'Listar tipos de produto', slug: 'products:list',    resource: 'products',  action: 'list',    active: true },
  { name: 'Criar tipo de produto',   slug: 'products:create',  resource: 'products',  action: 'create',  active: true },
  { name: 'Editar tipo de produto',  slug: 'products:update',  resource: 'products',  action: 'update',  active: true },
  { name: 'Deletar produto',         slug: 'products:delete',  resource: 'products',  action: 'delete',  active: true },
  { name: 'Listar locais',           slug: 'places:list',      resource: 'places',    action: 'list',    active: true },
  { name: 'Criar local',             slug: 'places:create',    resource: 'places',    action: 'create',  active: true },
  { name: 'Editar local',            slug: 'places:update',    resource: 'places',    action: 'update',  active: true },
];

const ROLE_PERMISSION_SLUGS: Record<string, string[]> = {
  employee: [
    'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
    'staff:list', 'staff:read', 'staff:create', 'staff:update', 'staff:delete',
    'classes:list', 'classes:read', 'classes:create', 'classes:update', 'classes:delete',
    'financial:read', 'financial:manage', 'reports:read', 'reports:export', 'dashboard:read',
  ],
  teacher: [
    'staff:list', 'staff:read', 'users:list', 'users:read',
    'classes:list', 'classes:read', 'classes:create', 'classes:update', 'dashboard:read',
  ],
};

async function seedRoles(Role: any): Promise<void> {
  for (const role of ROLES_DATA) {
    await Role.findOrCreate({ where: { slug: role.slug }, defaults: role });
  }
}

async function seedPermissions(Permission: any): Promise<void> {
  for (const perm of PERMISSIONS_DATA) {
    await Permission.findOrCreate({ where: { slug: perm.slug }, defaults: perm });
  }
}

async function assignPermissionsToRole(
  RolePermission: any,
  roleId: number,
  permIds: number[],
): Promise<void> {
  for (const permissionId of permIds) {
    await RolePermission.findOrCreate({
      where:    { roleId, permissionId },
      defaults: { roleId, permissionId },
    });
  }
}

async function seedRolePermissions(
  Role: any,
  Permission: any,
  RolePermission: any,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const allPerms = await Permission.findAll();
  const permMap: Record<string, number> = Object.fromEntries(allPerms.map((p: any) => [p.slug, p.id]));

  const adminRole = await Role.findOne({ where: { slug: 'admin' } });
  if (adminRole) {
    await assignPermissionsToRole(RolePermission, adminRole.id, allPerms.map((p: any) => p.id));
    results['role_permissions:admin'] = '✅ todas as permissões atribuídas ao admin';
  }

  for (const [roleSlug, slugList] of Object.entries(ROLE_PERMISSION_SLUGS)) {
    const role = await Role.findOne({ where: { slug: roleSlug } });
    if (role) {
      const permIds = slugList.map((s) => permMap[s]).filter(Boolean);
      await assignPermissionsToRole(RolePermission, role.id, permIds);
      results[`role_permissions:${roleSlug}`] = `✅ permissões atribuídas ao ${roleSlug}`;
    }
  }

  return results;
}

// POST /api/seed/init/:clientId — proteger com SEED_SECRET_KEY antes de ir para produção
router.post('/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;

  try {
    const tenant = await TenantConfig.findOne({ where: { slug: clientId, status: 'active' } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: `Tenant '${clientId}' não encontrado ou inativo` });
    }

    if (!tenant.db_name || !tenant.db_password) {
      return res.status(503).json({ success: false, error: `Banco do tenant '${clientId}' não provisionado` });
    }

    const tenantDb: TenantDb = getTenantDb({
      clientId: tenant.slug,
      dbHost:   process.env.DB_MASTER_HOST!,
      dbPort:   Number(process.env.DB_TENANT_PORT) || 3306,
      dbUser:   tenant.db_name,
      dbPass:   tenant.db_password,
      dbName:   tenant.db_name,
    });

    await tenantDb.sequelize.sync({ force: false });

    const { Role, Permission, RolePermission } = tenantDb;

    await seedRoles(Role);
    await seedPermissions(Permission);
    const rolePermResults = await seedRolePermissions(Role, Permission, RolePermission);

    return res.status(201).json({
      success: true,
      clientId,
      message: 'Seed concluído com sucesso',
      results: {
        roles:       `✅ ${ROLES_DATA.length} roles inseridas`,
        permissions: `✅ ${PERMISSIONS_DATA.length} permissões inseridas`,
        ...rolePermResults,
      },
    });

  } catch (error: any) {
    console.error(`[seed/init] Erro para ${clientId}:`, error);
    return res.status(500).json({
      success: false,
      error:   'Erro ao executar seed',
      message: error.message,
      hint:    error?.parent?.sqlMessage ?? undefined,
    });
  }
});

export default router;
