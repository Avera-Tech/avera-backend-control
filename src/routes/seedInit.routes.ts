import { Router, Request, Response } from 'express';
import TenantConfig from '../master/models/TenantConfig.model';
import { getTenantDb } from '../config/tenantConnectionManager';

const router = Router();

// POST /api/seed/init/:clientId
// Popula o banco do tenant com dados iniciais (roles, permissions, role_permissions).
// Não requer X-Client-Id — resolve o tenant internamente pelo clientId da URL.
// TODO: adicionar autenticação antes de ir para produção
router.post('/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;

  const config = await TenantConfig.findOne({ where: { clientId, isActive: true } });
  if (!config) {
    return res.status(404).json({ success: false, error: `Tenant '${clientId}' não encontrado ou inativo` });
  }

  const tenantDb = getTenantDb({
    clientId: config.clientId,
    dbHost:   config.dbHost,
    dbPort:   config.dbPort,
    dbUser:   config.dbUser,
    dbPass:   config.dbPass,
    dbName:   config.dbName,
  });

  const { Role, Permission, RolePermission } = tenantDb;
  const results: Record<string, string> = {};

  try {
    const rolesData = [
      { name: 'Administrador', slug: 'admin',    description: 'Acesso total ao sistema', active: true },
      { name: 'Empregado',     slug: 'employee', description: 'Acesso administrativo: clientes, turmas, financeiro', active: true },
      { name: 'Professor',     slug: 'teacher',  description: 'Acesso às aulas e fichas dos clientes', active: true },
    ];

    for (const role of rolesData) {
      await Role.findOrCreate({ where: { slug: role.slug }, defaults: role });
    }
    results['roles'] = `✅ ${rolesData.length} roles inseridas`;

    const permissionsData = [
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

    for (const perm of permissionsData) {
      await Permission.findOrCreate({ where: { slug: perm.slug }, defaults: perm });
    }
    results['permissions'] = `✅ ${permissionsData.length} permissões inseridas`;

    const adminRole    = await Role.findOne({ where: { slug: 'admin' } });
    const employeeRole = await Role.findOne({ where: { slug: 'employee' } });
    const teacherRole  = await Role.findOne({ where: { slug: 'teacher' } });
    const allPerms     = await Permission.findAll();
    const permMap      = Object.fromEntries(allPerms.map((p) => [p.slug, p.id]));

    if (adminRole) {
      for (const perm of allPerms) {
        await RolePermission.findOrCreate({
          where:    { roleId: adminRole.id, permissionId: perm.id },
          defaults: { roleId: adminRole.id, permissionId: perm.id },
        });
      }
      results['role_permissions:admin'] = '✅ todas as permissões atribuídas ao admin';
    }

    const employeeSlugs = [
      'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
      'staff:list', 'staff:read', 'staff:create', 'staff:update', 'staff:delete',
      'classes:list', 'classes:read', 'classes:create', 'classes:update', 'classes:delete',
      'financial:read', 'financial:manage', 'reports:read', 'reports:export', 'dashboard:read',
    ];
    if (employeeRole) {
      for (const slug of employeeSlugs) {
        if (permMap[slug]) {
          await RolePermission.findOrCreate({
            where:    { roleId: employeeRole.id, permissionId: permMap[slug] },
            defaults: { roleId: employeeRole.id, permissionId: permMap[slug] },
          });
        }
      }
      results['role_permissions:employee'] = '✅ permissões atribuídas ao employee';
    }

    const teacherSlugs = [
      'staff:list', 'staff:read', 'users:list', 'users:read',
      'classes:list', 'classes:read', 'classes:create', 'classes:update', 'dashboard:read',
    ];
    if (teacherRole) {
      for (const slug of teacherSlugs) {
        if (permMap[slug]) {
          await RolePermission.findOrCreate({
            where:    { roleId: teacherRole.id, permissionId: permMap[slug] },
            defaults: { roleId: teacherRole.id, permissionId: permMap[slug] },
          });
        }
      }
      results['role_permissions:teacher'] = '✅ permissões atribuídas ao teacher';
    }

    return res.status(201).json({ success: true, clientId, message: 'Seed concluído com sucesso', results });

  } catch (error: any) {
    console.error(`[seed/init] Erro para ${clientId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao executar seed',
      message: error.message,
      hint: error?.parent?.sqlMessage ?? undefined,
    });
  }
});

export default router;
