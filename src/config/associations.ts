/**
 * Arquivo de configuração das associações entre models
 * Este arquivo deve ser importado após todos os models serem carregados
 */

import User from '../core/auth/models/User.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';

/**
 * Configura todas as associações entre os models
 */
export const setupAssociations = (): void => {
  /**
   * User <-> Role (Many-to-Many através de UserRole)
   */
  User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles',
  });

  Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users',
  });

  /**
   * UserRole pertence a User e Role
   */
  UserRole.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  UserRole.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  /**
   * Role <-> Permission (Many-to-Many através de RolePermission)
   */
  Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions',
  });

  Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles',
  });

  /**
   * RolePermission pertence a Role e Permission
   */
  RolePermission.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  RolePermission.belongsTo(Permission, {
    foreignKey: 'permissionId',
    as: 'permission',
  });

  console.log('✅ Associações entre models configuradas');
};
