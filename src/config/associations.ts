import User from '../core/users/models/User.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';
import Product from '../core/products/models/Product.model';
import ProductType from '../core/products/models/ProductType.model';

export const setupAssociations = (): void => {
  // User <-> Role (Many-to-Many via UserRole)
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

  UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
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

  ProductType.hasMany(Product, { foreignKey: 'productTypeId', as: 'products' });
  Product.belongsTo(ProductType, { foreignKey: 'productTypeId', as: 'productType' });

  console.log('✅ Associações configuradas');
};