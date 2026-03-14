import { Request, Response, NextFunction } from 'express';
import Employee from '../students/models/Students.model';
import Role from '../rbac/models/Role.model';
import Permission from '../rbac/models/Permission.model';
import UserRole from '../rbac/models/UserRole.model';
import RolePermission from '../rbac/models/RolePermission.model';
import { Op } from 'sequelize';

/**
 * Middleware para verificar se o usuário tem uma ou mais permissões específicas
 *
 * @param requiredPermissions - Array de slugs de permissões (ex: ['employees:create'])
 * @param requireAll - Se true, exige TODAS as permissões. Se false, exige pelo menos UMA.
 */
export const checkPermissions = (
  requiredPermissions: string[],
  requireAll: boolean = true
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.userId;

      // Buscar roles do funcionário (ativas e não expiradas)
      const userRoles = await UserRole.findAll({
        where: {
          userId,
          [Op.or]: [
            { expiresAt: { [Op.eq]: null } },
            { expiresAt: { [Op.gt]: new Date() } },
          ] as any,
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

      // Buscar permissões das roles
      const roleIds = userRoles.map((ur) => ur.roleId);

      const rolePermissions = await RolePermission.findAll({
        where: { roleId: { [Op.in]: roleIds } },
        include: [
          {
            model: Permission,
            as: 'permission',
            where: { active: true },
            required: true,
          },
        ],
      });

      const userPermissionSlugs = rolePermissions.map((rp: any) => rp.permission.slug);

      // Verificar permissões
      let hasPermission = false;
      if (requireAll) {
        hasPermission = requiredPermissions.every((p) => userPermissionSlugs.includes(p));
      } else {
        hasPermission = requiredPermissions.some((p) => userPermissionSlugs.includes(p));
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          requiredPermissions,
          message: requireAll
            ? 'Você não possui todas as permissões necessárias'
            : 'Você não possui nenhuma das permissões necessárias',
        });
      }

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
 * Middleware para verificar se o usuário tem uma ou mais roles específicas
 *
 * @param requiredRoles - Array de slugs de roles (ex: ['admin', 'manager'])
 * @param requireAll - Se true, exige TODAS as roles. Se false, exige pelo menos UMA.
 */
export const checkRoles = (
  requiredRoles: string[],
  requireAll: boolean = false
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.userId;

      const userRoles = await UserRole.findAll({
        where: {
          userId,
          [Op.or]: [
            { expiresAt: { [Op.eq]: null } },
            { expiresAt: { [Op.gt]: new Date() } },
          ] as any,
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

      const userRoleSlugs = userRoles.map((ur: any) => ur.role.slug);

      let hasRole = false;
      if (requireAll) {
        hasRole = requiredRoles.every((r) => userRoleSlugs.includes(r));
      } else {
        hasRole = requiredRoles.some((r) => userRoleSlugs.includes(r));
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