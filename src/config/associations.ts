import User from '../core/users/models/User.model';
import Staff from '../core/staff/models/Staff.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';
import Product from '../core/products/models/Product.model';
import ProductType from '../core/products/models/ProductType.model';
import StudentCredit from '../core/credits/models/StudentCredit.model';
import CreditTransaction from '../core/credits/models/CreditTransaction.model';
import ClientUser from '../modules/user/models/User.model';
import UserLevel from '../modules/user/models/UserLevel.model';

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

  Staff.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasOne(Staff, { foreignKey: 'userId', as: 'staffProfile' });

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
  StudentCredit.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  StudentCredit.hasMany(CreditTransaction, { foreignKey: 'studentCreditId', as: 'transactions' });
  CreditTransaction.belongsTo(StudentCredit, { foreignKey: 'studentCreditId', as: 'credit' });

  // ClientUser (clientes/alunos) <-> UserLevel
  ClientUser.belongsTo(UserLevel, { foreignKey: 'levelId', as: 'level' });
  UserLevel.hasMany(ClientUser, { foreignKey: 'levelId', as: 'users' });

  // ClientUser <-> créditos
  ClientUser.hasMany(StudentCredit, { foreignKey: 'clientId', as: 'credits' });
  StudentCredit.belongsTo(ClientUser, { foreignKey: 'clientId', as: 'client' });
  CreditTransaction.belongsTo(ClientUser, { foreignKey: 'clientId', as: 'client' });

  console.log('✅ Associações configuradas');
};