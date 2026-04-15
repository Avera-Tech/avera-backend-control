import Staff from '../core/staff/models/Staff.model';
import Role from '../core/rbac/models/Role.model';
import Permission from '../core/rbac/models/Permission.model';
import UserRole from '../core/rbac/models/UserRole.model';
import RolePermission from '../core/rbac/models/RolePermission.model';
import Product from '../core/products/models/Product.model';
import ProductType from '../core/products/models/ProductType.model';
import Place from '../core/places/models/Place.model';
import ProductTypePlace from '../core/places/models/ProductTypePlace.model';
import StudentCredit from '../fit/credits/models/StudentCredit.model';
import CreditTransaction from '../fit/credits/models/CreditTransaction.model';
import ClientUser from '../modules/user/models/User.model';
import UserLevel from '../modules/user/models/UserLevel.model';

export const setupAssociations = (): void => {
  // Staff <-> Role (Many-to-Many via staff_roles)
  Staff.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'staffId',
    otherKey: 'roleId',
    as: 'roles',
  });

  Role.belongsToMany(Staff, {
    through: UserRole,
    foreignKey: 'roleId',
    otherKey: 'staffId',
    as: 'staff',
  });

  UserRole.belongsTo(Staff, { foreignKey: 'staffId', as: 'staff' });
  UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

  // Role <-> Permission (Many-to-Many via role_permissions)
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

  // Products
  ProductType.hasMany(Product, { foreignKey: 'productTypeId', as: 'products' });
  Product.belongsTo(ProductType, { foreignKey: 'productTypeId', as: 'productType' });

  // ProductType <-> Place (Many-to-Many via product_type_places)
  ProductType.belongsToMany(Place, {
    through: ProductTypePlace,
    foreignKey: 'productTypeId',
    otherKey: 'placeId',
    as: 'places',
  });
  Place.belongsToMany(ProductType, {
    through: ProductTypePlace,
    foreignKey: 'placeId',
    otherKey: 'productTypeId',
    as: 'productTypes',
  });

  // Credits
  StudentCredit.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  StudentCredit.hasMany(CreditTransaction, { foreignKey: 'studentCreditId', as: 'transactions' });
  CreditTransaction.belongsTo(StudentCredit, { foreignKey: 'studentCreditId', as: 'credit' });

  // ClientUser (alunos) <-> UserLevel
  ClientUser.belongsTo(UserLevel, { foreignKey: 'levelId', as: 'level' });
  UserLevel.hasMany(ClientUser, { foreignKey: 'levelId', as: 'users' });

  // ClientUser <-> créditos
  ClientUser.hasMany(StudentCredit, { foreignKey: 'userId', as: 'credits' });
  StudentCredit.belongsTo(ClientUser, { foreignKey: 'userId', as: 'user' });
  CreditTransaction.belongsTo(ClientUser, { foreignKey: 'userId', as: 'user' });

  console.log('✅ Associações configuradas');
};
