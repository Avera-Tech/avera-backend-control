# Exemplos de Uso do Sistema RBAC

Este documento contém exemplos práticos de como usar o sistema RBAC no backend.

## 1. Criar uma Rota Protegida por Permissão

```typescript
import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';

const router = Router();

/**
 * Apenas usuários com permissão 'users:create' podem acessar
 */
router.post('/users', 
  authenticateToken,
  checkPermissions(['users:create']),
  async (req, res) => {
    // Criar usuário
    res.json({ message: 'Usuário criado' });
  }
);

/**
 * Usuário precisa ter PELO MENOS UMA das permissões listadas
 */
router.get('/reports',
  authenticateToken,
  checkPermissions(['reports:read', 'reports:export'], false), // false = OR
  async (req, res) => {
    // Retornar relatórios
    res.json({ reports: [] });
  }
);

/**
 * Usuário precisa ter TODAS as permissões listadas
 */
router.delete('/users/:id',
  authenticateToken,
  checkPermissions(['users:delete', 'users:manage'], true), // true = AND
  async (req, res) => {
    // Deletar usuário
    res.json({ message: 'Usuário deletado' });
  }
);

export default router;
```

## 2. Criar uma Rota Protegida por Role

```typescript
import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkRoles } from '../core/middleware/checkPermissions';

const router = Router();

/**
 * Apenas administradores podem acessar
 */
router.delete('/system/reset',
  authenticateToken,
  checkRoles(['admin']),
  async (req, res) => {
    // Reset do sistema
    res.json({ message: 'Sistema resetado' });
  }
);

/**
 * Admin OU Manager podem acessar
 */
router.get('/dashboard',
  authenticateToken,
  checkRoles(['admin', 'manager'], false), // false = OR
  async (req, res) => {
    // Dashboard
    res.json({ stats: {} });
  }
);

export default router;
```

## 3. Atribuir Role a um Usuário (Programaticamente)

```typescript
import UserRole from '../core/rbac/models/UserRole.model';
import Role from '../core/rbac/models/Role.model';

/**
 * Atribuir role 'admin' ao usuário
 */
async function assignAdminRole(userId: number): Promise<void> {
  // Buscar role admin
  const adminRole = await Role.findOne({ where: { slug: 'admin' } });
  
  if (!adminRole) {
    throw new Error('Role admin não encontrada');
  }

  // Criar relacionamento
  await UserRole.create({
    userId,
    roleId: adminRole.id,
    assignedBy: 1, // ID do admin que está atribuindo
  });
}

/**
 * Atribuir role com data de expiração
 */
async function assignTemporaryRole(
  userId: number, 
  roleSlug: string, 
  daysUntilExpire: number
): Promise<void> {
  const role = await Role.findOne({ where: { slug: roleSlug } });
  
  if (!role) {
    throw new Error(`Role ${roleSlug} não encontrada`);
  }

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysUntilExpire);

  await UserRole.create({
    userId,
    roleId: role.id,
    expiresAt: expirationDate,
  });
}
```

## 4. Criar Novas Permissões e Roles

```typescript
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import RolePermission from '../core/rbac/models/RolePermission.model';

/**
 * Criar nova permissão
 */
async function createPermission(): Promise<void> {
  await Permission.create({
    name: 'Exportar Dados',
    slug: 'data:export',
    resource: 'data',
    action: 'export',
    description: 'Permite exportar dados do sistema',
    active: true,
  });
}

/**
 * Criar nova role
 */
async function createRole(): Promise<void> {
  const role = await Role.create({
    name: 'Analista',
    slug: 'analyst',
    description: 'Acesso a relatórios e análises',
    active: true,
  });

  // Buscar permissões
  const permissions = await Permission.findAll({
    where: {
      slug: ['reports:read', 'reports:create', 'data:export'],
    },
  });

  // Atribuir permissões à role
  for (const permission of permissions) {
    await RolePermission.create({
      roleId: role.id,
      permissionId: permission.id,
    });
  }
}
```

## 5. Verificar Permissões em Services/Controllers

```typescript
import User from '../core/auth/models/User.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';
import { Op } from 'sequelize';

/**
 * Verifica se usuário tem uma permissão específica
 */
async function userHasPermission(
  userId: number, 
  permissionSlug: string
): Promise<boolean> {
  const userRoles = await UserRole.findAll({
    where: {
      userId,
      [Op.or]: [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } },
      ],
    },
    include: [{ model: Role, as: 'role', where: { active: true } }],
  });

  if (!userRoles.length) return false;

  const roleIds = userRoles.map((ur) => ur.roleId);

  const rolePermissions = await RolePermission.findAll({
    where: { roleId: { [Op.in]: roleIds } },
    include: [
      {
        model: Permission,
        as: 'permission',
        where: { slug: permissionSlug, active: true },
      },
    ],
  });

  return rolePermissions.length > 0;
}

/**
 * Retorna todas as permissões do usuário
 */
async function getUserPermissions(userId: number): Promise<string[]> {
  const userRoles = await UserRole.findAll({
    where: {
      userId,
      [Op.or]: [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } },
      ],
    },
    include: [{ model: Role, as: 'role', where: { active: true } }],
  });

  if (!userRoles.length) return [];

  const roleIds = userRoles.map((ur) => ur.roleId);

  const rolePermissions = await RolePermission.findAll({
    where: { roleId: { [Op.in]: roleIds } },
    include: [
      {
        model: Permission,
        as: 'permission',
        where: { active: true },
      },
    ],
  });

  return rolePermissions.map((rp: any) => rp.permission.slug);
}
```

## 6. Exemplo Completo de Controller com RBAC

```typescript
import { Request, Response } from 'express';
import User from '../core/auth/models/User.model';
import { Op } from 'sequelize';

class UserController {
  /**
   * Listar usuários
   * Requer: users:list
   */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'active', 'createdAt'],
        where: { active: true },
      });

      return res.json({
        success: true,
        users,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar usuários',
      });
    }
  }

  /**
   * Criar usuário
   * Requer: users:create
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body;

      const user = await User.create({
        name,
        email,
        password,
        active: true,
        emailVerified: false,
      });

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar usuário',
      });
    }
  }

  /**
   * Deletar usuário
   * Requer: users:delete
   */
  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      await user.destroy();

      return res.json({
        success: true,
        message: 'Usuário deletado com sucesso',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao deletar usuário',
      });
    }
  }
}

export default UserController;
```

## 7. Estrutura de Permissões Recomendada

```
Formato: resource:action

Exemplos:
- users:create
- users:read
- users:update
- users:delete
- users:list
- users:manage (todas as ações)

- reports:read
- reports:create
- reports:export
- reports:manage

- products:create
- products:update
- products:delete
- products:list

- orders:create
- orders:read
- orders:update
- orders:cancel

- settings:view
- settings:update
- settings:manage

- dashboard:view
- analytics:view
```

## 8. Hierarquia de Roles Sugerida

```
1. admin (Superadmin)
   - Todas as permissões
   - Gerenciamento total do sistema

2. manager (Gerente)
   - Permissões moderadas
   - Criação e edição de recursos
   - Visualização de relatórios

3. user (Usuário)
   - Permissões básicas
   - Visualização própria
   - Ações limitadas

4. guest (Visitante)
   - Apenas leitura
   - Visualização de informações públicas
```
