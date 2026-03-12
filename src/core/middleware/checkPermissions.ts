import { Request, Response, NextFunction } from 'express';
import User from '../auth/models/User.model';
import Role from '../rbac/models/Role.model';
import Permission from '../rbac/models/Permission.model';
import UserRole from '../rbac/models/UserRole.model';
import RolePermission from '../rbac/models/RolePermission.model';
import { Op } from 'sequelize';

/**
 * Middleware para verificar se o usuário tem uma ou mais permissões específicas
 * 
 * @param requiredPermissions - Array de slugs de permissões (ex: ['users:create', 'users:read'])
 * @param requireAll - Se true, exige todas as permissões. Se false, exige pelo menos uma
 * 
 * @example
 * router.post('/users', authenticate, checkPermissions(['users:create']), createUser);
 * router.get('/reports', authenticate, checkPermissions(['reports:read', 'reports:export'], false), getReports);
 */
export const checkPermissions = (
  requiredPermissions: string[],
  requireAll: boolean = true
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // 1. Verificar se o usuário está autenticado
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.userId;

      // 2. Buscar roles do usuário (apenas roles ativas e não expiradas)
      const userRoles = await UserRole.findAll({
        where: {
          userId,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
          ],
        },
        include: [
          {
            model: Role,
            as: 'role',
            where: { active: true },
            required: true,
          },
        ],
      });

      if (!userRoles || userRoles.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Usuário sem permissões atribuídas',
        });
      }

      // 3. Buscar todas as permissões dessas roles
      const roleIds = userRoles.map((ur) => ur.roleId);

      const rolePermissions = await RolePermission.findAll({
        where: {
          roleId: { [Op.in]: roleIds },
        },
        include: [
          {
            model: Permission,
            as: 'permission',
            where: { active: true },
            required: true,
          },
        ],
      });

      // 4. Extrair slugs das permissões que o usuário possui
      const userPermissionSlugs = rolePermissions.map(
        (rp: any) => rp.permission.slug
      );

      // 5. Verificar se o usuário tem as permissões necessárias
      let hasPermission = false;

      if (requireAll) {
        // Exige TODAS as permissões
        hasPermission = requiredPermissions.every((perm) =>
          userPermissionSlugs.includes(perm)
        );
      } else {
        // Exige PELO MENOS UMA permissão
        hasPermission = requiredPermissions.some((perm) =>
          userPermissionSlugs.includes(perm)
        );
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Permissão negada',
          requiredPermissions,
          message: requireAll
            ? 'Você não possui todas as permissões necessárias'
            : 'Você não possui nenhuma das permissões necessárias',
        });
      }

      // 6. Usuário tem permissão, continuar
      next();
    } catch (error: any) {
      console.error('Erro ao verificar permissões:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar permissões',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
};

/**
 * Middleware para verificar se o usuário tem uma role específica
 * 
 * @param requiredRoles - Array de slugs de roles (ex: ['admin', 'manager'])
 * @param requireAll - Se true, exige todas as roles. Se false, exige pelo menos uma
 * 
 * @example
 * router.delete('/users/:id', authenticate, checkRoles(['admin']), deleteUser);
 * router.get('/dashboard', authenticate, checkRoles(['admin', 'manager'], false), getDashboard);
 */
export const checkRoles = (
  requiredRoles: string[],
  requireAll: boolean = false
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // 1. Verificar se o usuário está autenticado
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.userId;

      // 2. Buscar roles do usuário
      const userRoles = await UserRole.findAll({
        where: {
          userId,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
          ],
        },
        include: [
          {
            model: Role,
            as: 'role',
            where: { active: true },
            required: true,
          },
        ],
      });

      if (!userRoles || userRoles.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Usuário sem roles atribuídas',
        });
      }

      // 3. Extrair slugs das roles
      const userRoleSlugs = userRoles.map((ur: any) => ur.role.slug);

      // 4. Verificar se o usuário tem as roles necessárias
      let hasRole = false;

      if (requireAll) {
        // Exige TODAS as roles
        hasRole = requiredRoles.every((role) => userRoleSlugs.includes(role));
      } else {
        // Exige PELO MENOS UMA role
        hasRole = requiredRoles.some((role) => userRoleSlugs.includes(role));
      }

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          requiredRoles,
          message: requireAll
            ? 'Você não possui todas as roles necessárias'
            : 'Você não possui nenhuma das roles necessárias',
        });
      }

      // 5. Usuário tem role, continuar
      next();
    } catch (error: any) {
      console.error('Erro ao verificar roles:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar roles',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
};
