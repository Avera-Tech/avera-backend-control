import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';

export const checkPermissions = (
  requiredPermissions: string[],
  requireAll: boolean = true
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user?.staffId && !req.user?.isMaster) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      if (req.user?.isMaster) return next();

      const { staffId } = req.user!;
      const { UserRole, Role, RolePermission, Permission } = req.tenantDb;

      const staffRoles = await UserRole.findAll({
        where: {
          staffId,
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

      if (!staffRoles.length) {
        return res.status(403).json({
          success: false,
          error: 'Usuário sem roles atribuídas',
        });
      }

      const roleIds = staffRoles.map((sr) => sr.roleId);

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

      const hasPermission = requireAll
        ? requiredPermissions.every((p) => userPermissionSlugs.includes(p))
        : requiredPermissions.some((p) => userPermissionSlugs.includes(p));

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

export const checkRoles = (
  requiredRoles: string[],
  requireAll: boolean = false
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user?.staffId && !req.user?.isMaster) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      if (req.user?.isMaster) return next();

      const { staffId } = req.user!;
      const { UserRole, Role } = req.tenantDb;

      const staffRoles = await UserRole.findAll({
        where: {
          staffId,
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

      if (!staffRoles.length) {
        return res.status(403).json({
          success: false,
          error: 'Usuário sem roles atribuídas',
        });
      }

      const userRoleSlugs = staffRoles.map((sr: any) => sr.role.slug);

      const hasRole = requireAll
        ? requiredRoles.every((r) => userRoleSlugs.includes(r))
        : requiredRoles.some((r) => userRoleSlugs.includes(r));

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
