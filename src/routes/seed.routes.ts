import { Router, Request, Response } from 'express';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import RolePermission from '../core/rbac/models/RolePermission.model';

const router = Router();

/**
 * POST /api/seed
 * Popula os dados iniciais do sistema (roles e permissions)
 * ⚠️  Usar apenas na primeira instalação
 */
router.post('/', async (req: Request, res: Response) => {
  const seedKey = req.headers['x-seed-key'];

  if (seedKey !== process.env.SYNC_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Chave inválida',
    });
  }

  const results: Record<string, string> = {};

  try {
    // ── 1. Roles ────────────────────────────────────────────────────────────
    const rolesData = [
      { name: 'Administrador', slug: 'admin',   description: 'Acesso total ao sistema',    active: true },
      { name: 'Gerente',       slug: 'manager', description: 'Acesso de gerenciamento',    active: true },
      { name: 'Usuário',       slug: 'user',    description: 'Acesso básico',              active: true },
      { name: 'Visitante',     slug: 'guest',   description: 'Apenas leitura',             active: true },
    ];

    for (const role of rolesData) {
      await Role.findOrCreate({ where: { slug: role.slug }, defaults: role });
    }

    results['roles'] = `✅ ${rolesData.length} roles inseridas`;

    // ── 2. Permissions ──────────────────────────────────────────────────────
    const permissionsData = [
      // Usuários
      { name: 'Listar usuários',    slug: 'users:list',    resource: 'users',    action: 'list',    active: true },
      { name: 'Ver usuário',        slug: 'users:read',    resource: 'users',    action: 'read',    active: true },
      { name: 'Criar usuário',      slug: 'users:create',  resource: 'users',    action: 'create',  active: true },
      { name: 'Editar usuário',     slug: 'users:update',  resource: 'users',    action: 'update',  active: true },
      { name: 'Deletar usuário',    slug: 'users:delete',  resource: 'users',    action: 'delete',  active: true },
      // Alunos
      { name: 'Listar alunos',      slug: 'students:list',   resource: 'students', action: 'list',   active: true },
      { name: 'Ver aluno',          slug: 'students:read',   resource: 'students', action: 'read',   active: true },
      { name: 'Criar aluno',        slug: 'students:create', resource: 'students', action: 'create', active: true },
      { name: 'Editar aluno',       slug: 'students:update', resource: 'students', action: 'update', active: true },
      { name: 'Deletar aluno',      slug: 'students:delete', resource: 'students', action: 'delete', active: true },
      // Relatórios
      { name: 'Ver relatórios',     slug: 'reports:read',   resource: 'reports',  action: 'read',   active: true },
      { name: 'Exportar relatórios',slug: 'reports:export', resource: 'reports',  action: 'export', active: true },
      // Dashboard
      { name: 'Ver dashboard',      slug: 'dashboard:read', resource: 'dashboard',action: 'read',   active: true },
    ];

    for (const perm of permissionsData) {
      await Permission.findOrCreate({ where: { slug: perm.slug }, defaults: perm });
    }

    results['permissions'] = `✅ ${permissionsData.length} permissões inseridas`;

    // ── 3. Role-Permissions ─────────────────────────────────────────────────
    const adminRole    = await Role.findOne({ where: { slug: 'admin' } });
    const managerRole  = await Role.findOne({ where: { slug: 'manager' } });
    const userRole     = await Role.findOne({ where: { slug: 'user' } });
    const guestRole    = await Role.findOne({ where: { slug: 'guest' } });
    const allPerms     = await Permission.findAll();

    const permMap = Object.fromEntries(allPerms.map((p) => [p.slug, p.id]));

    // Admin → todas as permissões
    if (adminRole) {
      for (const perm of allPerms) {
        await RolePermission.findOrCreate({
          where: { roleId: adminRole.id, permissionId: perm.id },
          defaults: { roleId: adminRole.id, permissionId: perm.id },
        });
      }
      results['role_permissions:admin'] = `✅ todas as permissões atribuídas ao admin`;
    }

    // Manager → tudo exceto deletar
    if (managerRole) {
      const managerSlugs = [
        'users:list', 'users:read', 'users:create', 'users:update',
        'students:list', 'students:read', 'students:create', 'students:update',
        'reports:read', 'reports:export', 'dashboard:read',
      ];
      for (const slug of managerSlugs) {
        if (permMap[slug]) {
          await RolePermission.findOrCreate({
            where: { roleId: managerRole.id, permissionId: permMap[slug] },
            defaults: { roleId: managerRole.id, permissionId: permMap[slug] },
          });
        }
      }
      results['role_permissions:manager'] = `✅ permissões atribuídas ao manager`;
    }

    // User → leitura básica
    if (userRole) {
      const userSlugs = ['students:list', 'students:read', 'dashboard:read'];
      for (const slug of userSlugs) {
        if (permMap[slug]) {
          await RolePermission.findOrCreate({
            where: { roleId: userRole.id, permissionId: permMap[slug] },
            defaults: { roleId: userRole.id, permissionId: permMap[slug] },
          });
        }
      }
      results['role_permissions:user'] = `✅ permissões atribuídas ao user`;
    }

    // Guest → só dashboard
    if (guestRole) {
      if (permMap['dashboard:read']) {
        await RolePermission.findOrCreate({
          where: { roleId: guestRole.id, permissionId: permMap['dashboard:read'] },
          defaults: { roleId: guestRole.id, permissionId: permMap['dashboard:read'] },
        });
      }
      results['role_permissions:guest'] = `✅ permissões atribuídas ao guest`;
    }

    return res.status(200).json({
      success: true,
      message: 'Seed concluído com sucesso',
      results,
    });

  } catch (error: any) {
    console.error('Erro no seed:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao executar seed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;