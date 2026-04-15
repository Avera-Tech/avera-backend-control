import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import RolePermission from '../core/rbac/models/RolePermission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import Staff from '../core/staff/models/Staff.model';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Guard helper
// ─────────────────────────────────────────────────────────────────────────────
function guardSeedKey(req: Request, res: Response): boolean {
  const seedKey = req.headers['x-seed-key'];
  if (seedKey !== process.env.SYNC_SECRET_KEY) {
    res.status(401).json({ success: false, error: 'Chave inválida' });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/seed
// Popula roles e permissões do sistema (CT - Avera)
// ⚠️  Usar apenas na primeira instalação
// Header: x-seed-key: <SYNC_SECRET_KEY>
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  if (!guardSeedKey(req, res)) return;

  const results: Record<string, string> = {};

  try {
    // ── 1. Roles ─────────────────────────────────────────────────────────────
    const rolesData = [
      { name: 'Administrador', slug: 'admin', description: 'Acesso total ao sistema da Avera CT', active: true },
      { name: 'Empregado', slug: 'employee', description: 'Acesso administrativo: clientes, turmas, financeiro', active: true },
      { name: 'Professor', slug: 'teacher', description: 'Acesso às aulas e fichas dos clientes', active: true },
    ];

    for (const role of rolesData) {
      await Role.findOrCreate({ where: { slug: role.slug }, defaults: role });
    }

    results['roles'] = `✅ ${rolesData.length} roles inseridas`;

    // ── 2. Permissions ────────────────────────────────────────────────────────
    const permissionsData = [
      // Usuários
      { name: 'Listar usuários', slug: 'users:list', resource: 'users', action: 'list', active: true },
      { name: 'Ver usuário', slug: 'users:read', resource: 'users', action: 'read', active: true },
      { name: 'Criar usuário', slug: 'users:create', resource: 'users', action: 'create', active: true },
      { name: 'Editar usuário', slug: 'users:update', resource: 'users', action: 'update', active: true },
      { name: 'Deletar usuário', slug: 'users:delete', resource: 'users', action: 'delete', active: true },
      // Staff
      { name: 'Listar staff', slug: 'staff:list', resource: 'staff', action: 'list', active: true },
      { name: 'Ver staff', slug: 'staff:read', resource: 'staff', action: 'read', active: true },
      { name: 'Criar staff', slug: 'staff:create', resource: 'staff', action: 'create', active: true },
      { name: 'Editar staff', slug: 'staff:update', resource: 'staff', action: 'update', active: true },
      { name: 'Deletar staff', slug: 'staff:delete', resource: 'staff', action: 'delete', active: true },
      // Alunos
      { name: 'Listar usuários', slug: 'users:list', resource: 'users', action: 'list', active: true },
      { name: 'Ver usuário', slug: 'users:read', resource: 'users', action: 'read', active: true },
      { name: 'Criar usuário', slug: 'users:create', resource: 'users', action: 'create', active: true },
      { name: 'Editar usuário', slug: 'users:update', resource: 'users', action: 'update', active: true },
      { name: 'Deletar usuário', slug: 'users:delete', resource: 'users', action: 'delete', active: true },
      // Aulas
      { name: 'Listar aulas', slug: 'classes:list', resource: 'classes', action: 'list', active: true },
      { name: 'Ver aula', slug: 'classes:read', resource: 'classes', action: 'read', active: true },
      { name: 'Criar aula', slug: 'classes:create', resource: 'classes', action: 'create', active: true },
      { name: 'Editar aula', slug: 'classes:update', resource: 'classes', action: 'update', active: true },
      { name: 'Deletar aula', slug: 'classes:delete', resource: 'classes', action: 'delete', active: true },
      // Financeiro
      { name: 'Ver financeiro', slug: 'financial:read', resource: 'financial', action: 'read', active: true },
      { name: 'Gerenciar financeiro', slug: 'financial:manage', resource: 'financial', action: 'manage', active: true },
      // Relatórios
      { name: 'Ver relatórios', slug: 'reports:read', resource: 'reports', action: 'read', active: true },
      { name: 'Exportar relatórios', slug: 'reports:export', resource: 'reports', action: 'export', active: true },
      // Dashboard
      { name: 'Ver dashboard', slug: 'dashboard:read', resource: 'dashboard', action: 'read', active: true },
      // Tipos de Produtos
      { name: 'Listar tipos de produto', slug: 'products:list', resource: 'products', action: 'list', active: true },
      { name: 'Criar tipo de produto', slug: 'products:create', resource: 'products', action: 'create', active: true },
      { name: 'Editar tipo de produto', slug: 'products:update', resource: 'products', action: 'update', active: true },
      // Locais (Places)
      { name: 'Listar locais', slug: 'places:list', resource: 'places', action: 'list', active: true },
      { name: 'Criar local', slug: 'places:create', resource: 'places', action: 'create', active: true },
      { name: 'Editar local', slug: 'places:update', resource: 'places', action: 'update', active: true },
    ];

    for (const perm of permissionsData) {
      await Permission.findOrCreate({ where: { slug: perm.slug }, defaults: perm });
    }

    results['permissions'] = `✅ ${permissionsData.length} permissões inseridas`;

    // ── 3. Role-Permissions ───────────────────────────────────────────────────
    const adminRole = await Role.findOne({ where: { slug: 'admin' } });
    const employeeRole = await Role.findOne({ where: { slug: 'employee' } });
    const teacherRole = await Role.findOne({ where: { slug: 'teacher' } });
    const allPerms = await Permission.findAll();

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

    // Employee → tudo exceto gerenciar usuários
    if (employeeRole) {
      const employeeSlugs = [
        'users:list', 'users:read',
        'staff:list', 'staff:read', 'staff:create', 'staff:update', 'staff:delete',
        'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
        'classes:list', 'classes:read', 'classes:create', 'classes:update', 'classes:delete',
        'financial:read', 'financial:manage',
        'reports:read', 'reports:export',
        'dashboard:read',
      ];
      for (const slug of employeeSlugs) {
        if (permMap[slug]) {
          await RolePermission.findOrCreate({
            where: { roleId: employeeRole.id, permissionId: permMap[slug] },
            defaults: { roleId: employeeRole.id, permissionId: permMap[slug] },
          });
        }
      }
      results['role_permissions:employee'] = `✅ permissões atribuídas ao employee`;
    }

    // Teacher → aulas e leitura de clientes
    if (teacherRole) {
      const teacherSlugs = [
        'staff:list', 'staff:read',
        'users:list', 'users:read',
        'classes:list', 'classes:read', 'classes:create', 'classes:update',
        'dashboard:read',
      ];
      for (const slug of teacherSlugs) {
        if (permMap[slug]) {
          await RolePermission.findOrCreate({
            where: { roleId: teacherRole.id, permissionId: permMap[slug] },
            defaults: { roleId: teacherRole.id, permissionId: permMap[slug] },
          });
        }
      }
      results['role_permissions:teacher'] = `✅ permissões atribuídas ao teacher`;
    }

    return res.status(201).json({
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/seed/admin
// Cria o usuário administrador inicial
// ⚠️  Execute após POST /api/seed
// Header: x-seed-key: <SYNC_SECRET_KEY>
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin', async (req: Request, res: Response) => {
  if (!guardSeedKey(req, res)) return;

  try {
    const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@averact.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2025';
    const adminName     = process.env.ADMIN_NAME     || 'Administrador Avera';

    // Verificar se já existe (checa pelo email no staff)
    const existingStaff = await Staff.findOne({ where: { email: adminEmail } });
    if (existingStaff) {
      return res.status(200).json({
        success: true,
        message: `Admin '${adminEmail}' já existe`,
      });
    }

    // Buscar role admin (depende do seed principal ter rodado)
    const adminRole = await Role.findOne({ where: { slug: 'admin' } });
    if (!adminRole) {
      return res.status(400).json({
        success: false,
        error: 'Role admin não encontrada. Execute POST /api/seed primeiro.',
      });
    }

    const hashed = await bcrypt.hash(adminPassword, 12);

    const staff = await Staff.create({
      name: adminName,
      email: adminEmail,
      password: hashed,
      active: true,
      emailVerified: true,
    });

    await UserRole.create({ staffId: staff.id, roleId: adminRole.id });

    return res.status(201).json({
      success: true,
      message: 'Admin criado com sucesso',
      staff: { id: staff.id, name: staff.name, email: staff.email },
      note: '⚠️ Altere a senha após o primeiro acesso',
    });

  } catch (error: any) {
    console.error('Erro ao criar admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao criar admin',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;