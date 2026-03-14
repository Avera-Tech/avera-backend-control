import Employee from '../core/employees/models/Employee.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';

export const setupAssociations = (): void => {
  // Employee <-> Role (Many-to-Many via UserRole)
  Employee.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles',
  });

  Role.belongsToMany(Employee, {
    through: UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'employees',
  });

  UserRole.belongsTo(Employee, { foreignKey: 'userId', as: 'employee' });
  UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

  // Role <-> Permission (Many-to-Many via RolePermission)
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

  RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

  console.log('✅ Associações configuradas');
};