import { Sequelize, Model, DataTypes, Optional } from 'sequelize';
import type { RecurringInterval } from '../core/products/models/Product.model';

// ─── Role ─────────────────────────────────────────────────────────────────────

interface RoleAttr {
  id: number; name: string; slug: string; description?: string; active: boolean;
  createdAt?: Date; updatedAt?: Date;
}
interface RoleCreate extends Optional<RoleAttr, 'id' | 'description' | 'active'> {}

function initRole(seq: Sequelize) {
  class Role extends Model<RoleAttr, RoleCreate> implements RoleAttr {
    public id!: number; public name!: string; public slug!: string;
    public description!: string; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Role.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'roles', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['slug'] }] });
  return Role;
}

// ─── Permission ───────────────────────────────────────────────────────────────

interface PermAttr {
  id: number; name: string; slug: string; resource: string; action: string;
  description?: string; active: boolean; createdAt?: Date; updatedAt?: Date;
}
interface PermCreate extends Optional<PermAttr, 'id' | 'description' | 'active'> {}

function initPermission(seq: Sequelize) {
  class Permission extends Model<PermAttr, PermCreate> implements PermAttr {
    public id!: number; public name!: string; public slug!: string;
    public resource!: string; public action!: string;
    public description!: string; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Permission.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    resource: { type: DataTypes.STRING(50), allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'permissions', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['slug'] }, { fields: ['resource'] }, { fields: ['action'] }] });
  return Permission;
}

// ─── RolePermission ───────────────────────────────────────────────────────────

interface RolePermAttr {
  id: number; roleId: number; permissionId: number; createdAt?: Date; updatedAt?: Date;
}
interface RolePermCreate extends Optional<RolePermAttr, 'id'> {}

function initRolePermission(seq: Sequelize) {
  class RolePermission extends Model<RolePermAttr, RolePermCreate> implements RolePermAttr {
    public id!: number; public roleId!: number; public permissionId!: number;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  RolePermission.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    permissionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'permissions', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  }, { sequelize: seq, tableName: 'role_permissions', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['roleId', 'permissionId'] }, { fields: ['roleId'] }, { fields: ['permissionId'] }] });
  return RolePermission;
}

// ─── UserRole (staff_roles) ───────────────────────────────────────────────────

interface StaffRoleAttr {
  id: number; staffId: number; roleId: number; assignedAt?: Date;
  assignedBy?: number; expiresAt?: Date; createdAt?: Date; updatedAt?: Date;
}
interface StaffRoleCreate extends Optional<StaffRoleAttr, 'id' | 'assignedAt' | 'assignedBy' | 'expiresAt'> {}

function initUserRole(seq: Sequelize) {
  class UserRole extends Model<StaffRoleAttr, StaffRoleCreate> implements StaffRoleAttr {
    public id!: number; public staffId!: number; public roleId!: number;
    public assignedAt!: Date; public assignedBy!: number; public expiresAt!: Date;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  UserRole.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    staffId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'staff', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    assignedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize: seq, tableName: 'staff_roles', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['staffId', 'roleId'] }, { fields: ['staffId'] }, { fields: ['roleId'] }] });
  return UserRole;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

interface StaffAttr {
  id: number; name: string; email: string; password: string;
  phone?: string | null; employeeLevel?: string | null; active: boolean;
  emailVerified: boolean; lastLogin?: Date | null; createdAt?: Date; updatedAt?: Date;
}
interface StaffCreate extends Optional<StaffAttr, 'id' | 'phone' | 'employeeLevel' | 'active' | 'emailVerified' | 'lastLogin'> {}

function initStaff(seq: Sequelize) {
  class Staff extends Model<StaffAttr, StaffCreate> implements StaffAttr {
    public id!: number; public name!: string; public email!: string; public password!: string;
    public phone!: string | null; public employeeLevel!: string | null; public active!: boolean;
    public emailVerified!: boolean; public lastLogin!: Date | null;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Staff.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    employeeLevel: { type: DataTypes.STRING(50), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastLogin: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize: seq, tableName: 'staff', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['email'], name: 'idx_staff_email' }] });
  return Staff;
}

// ─── OtpCode ──────────────────────────────────────────────────────────────────

interface OtpAttr {
  id: number; staffId: number; purpose: 'reset_password';
  codeHash: string; expiresAt: Date; attempts: number; createdAt?: Date; updatedAt?: Date;
}
interface OtpCreate extends Optional<OtpAttr, 'id' | 'attempts'> {}

function initOtpCode(seq: Sequelize) {
  class OtpCode extends Model<OtpAttr, OtpCreate> implements OtpAttr {
    public id!: number; public staffId!: number; public purpose!: 'reset_password';
    public codeHash!: string; public expiresAt!: Date; public attempts!: number;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  OtpCode.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    staffId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'staff', key: 'id' }, onDelete: 'CASCADE' },
    purpose: { type: DataTypes.ENUM('reset_password'), allowNull: false },
    codeHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, { sequelize: seq, tableName: 'otp_codes', timestamps: true, underscored: false,
    indexes: [{ fields: ['staffId'] }, { fields: ['purpose'] }] });
  return OtpCode;
}

// ─── UserLevel ────────────────────────────────────────────────────────────────

interface UserLevelAttr {
  id: number; name: string; color?: string | null; numberOfClasses?: number | null;
  active: boolean; createdAt?: Date; updatedAt?: Date;
}
interface UserLevelCreate extends Optional<UserLevelAttr, 'id' | 'color' | 'numberOfClasses' | 'active'> {}

function initUserLevel(seq: Sequelize) {
  class UserLevel extends Model<UserLevelAttr, UserLevelCreate> implements UserLevelAttr {
    public id!: number; public name!: string; public color!: string | null;
    public numberOfClasses!: number | null; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  UserLevel.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    color: { type: DataTypes.STRING(20), allowNull: true },
    numberOfClasses: { type: DataTypes.INTEGER, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'user_levels', timestamps: true, underscored: false });
  return UserLevel;
}

// ─── ClientUser ───────────────────────────────────────────────────────────────

interface ClientUserAttr {
  id: number; name: string; email: string; password?: string | null;
  phone?: string | null; document?: string | null; birthday?: Date | null;
  height?: number | null; weight?: number | null; levelId?: number | null;
  address?: string | null; city?: string | null; state?: string | null;
  zipCode?: string | null; active: boolean; createdAt?: Date; updatedAt?: Date;
}
interface ClientUserCreate extends Optional<ClientUserAttr,
  'id' | 'password' | 'phone' | 'document' | 'birthday' | 'height' | 'weight' |
  'levelId' | 'address' | 'city' | 'state' | 'zipCode' | 'active'> {}

function initClientUser(seq: Sequelize) {
  class ClientUser extends Model<ClientUserAttr, ClientUserCreate> implements ClientUserAttr {
    public id!: number; public name!: string; public email!: string;
    public password!: string | null; public phone!: string | null; public document!: string | null;
    public birthday!: Date | null; public height!: number | null; public weight!: number | null;
    public levelId!: number | null; public address!: string | null; public city!: string | null;
    public state!: string | null; public zipCode!: string | null; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  ClientUser.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    document: { type: DataTypes.STRING(14), allowNull: true },
    birthday: { type: DataTypes.DATEONLY, allowNull: true },
    height: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    levelId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true,
      references: { model: 'user_levels', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    address: { type: DataTypes.STRING(200), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(2), allowNull: true },
    zipCode: { type: DataTypes.STRING(10), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'users', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['email'] }] });
  return ClientUser;
}

// ─── UserGuardian ─────────────────────────────────────────────────────────────

interface UserGuardianAttr {
  id: number; studentId: number; guardianUserId?: number | null;
  name?: string | null; phone?: string | null; document?: string | null;
  createdAt?: Date; updatedAt?: Date;
}
interface UserGuardianCreate extends Optional<UserGuardianAttr, 'id' | 'guardianUserId' | 'name' | 'phone' | 'document'> {}

function initUserGuardian(seq: Sequelize) {
  class UserGuardian extends Model<UserGuardianAttr, UserGuardianCreate> implements UserGuardianAttr {
    public id!: number; public studentId!: number; public guardianUserId!: number | null;
    public name!: string | null; public phone!: string | null; public document!: string | null;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  UserGuardian.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    guardianUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true,
      references: { model: 'users', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    name: { type: DataTypes.STRING(100), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    document: { type: DataTypes.STRING(14), allowNull: true },
  }, { sequelize: seq, tableName: 'user_guardians', timestamps: true, underscored: false });
  return UserGuardian;
}

// ─── Modality ─────────────────────────────────────────────────────────────────

interface ModalityAttr {
  id: number; name: string; description?: string; color?: string; icon?: string;
  active: boolean; createdAt?: Date; updatedAt?: Date;
}
interface ModalityCreate extends Optional<ModalityAttr, 'id' | 'description' | 'color' | 'icon' | 'active'> {}

function initModality(seq: Sequelize) {
  class Modality extends Model<ModalityAttr, ModalityCreate> implements ModalityAttr {
    public id!: number; public name!: string; public description!: string;
    public color!: string; public icon!: string; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Modality.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    color: { type: DataTypes.STRING(20), allowNull: true },
    icon: { type: DataTypes.STRING(100), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'modalities', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['name'], name: 'uq_modalities_name' },
      { fields: ['active'], name: 'idx_modalities_active' }] });
  return Modality;
}

// ─── ProductType ──────────────────────────────────────────────────────────────

interface ProductTypeAttr {
  id: number; name: string; description?: string; color?: string; icon?: string;
  active: boolean; createdAt?: Date; updatedAt?: Date;
}
interface ProductTypeCreate extends Optional<ProductTypeAttr, 'id' | 'description' | 'color' | 'icon' | 'active'> {}

function initProductType(seq: Sequelize) {
  class ProductType extends Model<ProductTypeAttr, ProductTypeCreate> implements ProductTypeAttr {
    public id!: number; public name!: string; public description!: string;
    public color!: string; public icon!: string; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  ProductType.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    color: { type: DataTypes.STRING(20), allowNull: true },
    icon: { type: DataTypes.STRING(100), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'product_types', timestamps: true, underscored: false,
    indexes: [{ unique: true, fields: ['name'], name: 'uq_product_types_name' },
      { fields: ['active'], name: 'idx_product_types_active' }] });
  return ProductType;
}

// ─── Product ──────────────────────────────────────────────────────────────────

interface ProductAttr {
  id: number; productTypeId: number; modalityId?: number | null; name: string; description?: string;
  credits: number; value: number; validityDays: number; purchaseLimit?: number;
  recurring: boolean; recurringInterval?: RecurringInterval; active: boolean;
  createdAt?: Date; updatedAt?: Date;
}
interface ProductCreate extends Optional<ProductAttr, 'id' | 'modalityId' | 'description' | 'purchaseLimit' | 'recurring' | 'recurringInterval' | 'active'> {}

function initProduct(seq: Sequelize) {
  class Product extends Model<ProductAttr, ProductCreate> implements ProductAttr {
    public id!: number; public productTypeId!: number; public modalityId!: number | null;
    public name!: string; public description!: string; public credits!: number; public value!: number;
    public validityDays!: number; public purchaseLimit!: number; public recurring!: boolean;
    public recurringInterval!: RecurringInterval; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Product.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    productTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'product_types', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    modalityId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true,
      references: { model: 'modalities', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    credits: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    validityDays: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    purchaseLimit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    recurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    recurringInterval: { type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'semiannual', 'annual'), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'products', timestamps: true, underscored: false,
    indexes: [{ fields: ['productTypeId'], name: 'idx_products_product_type_id' },
      { fields: ['modalityId'], name: 'idx_products_modality_id' },
      { fields: ['active'], name: 'idx_products_active' }] });
  return Product;
}

// ─── Place ────────────────────────────────────────────────────────────────────

interface PlaceAttr {
  id: number; name: string; address?: string; active: boolean;
  createdAt?: Date; updatedAt?: Date;
}
interface PlaceCreate extends Optional<PlaceAttr, 'id' | 'address' | 'active'> {}

function initPlace(seq: Sequelize) {
  class Place extends Model<PlaceAttr, PlaceCreate> implements PlaceAttr {
    public id!: number; public name!: string; public address!: string; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Place.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.STRING(200), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'places', timestamps: true, underscored: false,
    indexes: [{ fields: ['active'], name: 'idx_places_active' }] });
  return Place;
}

// ─── ProductTypePlace ─────────────────────────────────────────────────────────

function initProductTypePlace(seq: Sequelize) {
  class ProductTypePlace extends Model {}
  ProductTypePlace.init({
    productTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true,
      references: { model: 'product_types', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    placeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true,
      references: { model: 'places', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  }, { sequelize: seq, tableName: 'product_type_places', timestamps: false });
  return ProductTypePlace;
}

// ─── Class ────────────────────────────────────────────────────────────────────

interface ClassAttr {
  id: number; staff_id: number; modality_id?: number | null; product_type_id?: number | null; place_id?: number | null;
  date: string; time: string; limit: number; spots_taken: number; has_commission: boolean;
  kickback_rule?: string | null; kickback?: number | null; active: boolean;
  createdAt?: Date; updatedAt?: Date;
}
interface ClassCreate extends Optional<ClassAttr, 'id' | 'modality_id' | 'product_type_id' | 'place_id' | 'spots_taken' | 'has_commission' | 'kickback_rule' | 'kickback' | 'active'> {}

function initClass(seq: Sequelize) {
  class Class extends Model<ClassAttr, ClassCreate> implements ClassAttr {
    public id!: number; public staff_id!: number; public modality_id!: number | null;
    public product_type_id!: number | null; public place_id!: number | null;
    public date!: string; public time!: string;
    public limit!: number; public spots_taken!: number; public has_commission!: boolean;
    public kickback_rule!: string | null; public kickback!: number | null; public active!: boolean;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Class.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    staff_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'staff', key: 'id' } },
    modality_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null,
      references: { model: 'modalities', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
    product_type_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null, references: { model: 'product_types', key: 'id' } },
    place_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'places', key: 'id' } },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.TIME, allowNull: false },
    limit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    spots_taken: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    has_commission: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    kickback_rule: { type: DataTypes.STRING(50), allowNull: true },
    kickback: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize: seq, tableName: 'classes', timestamps: true });
  return Class;
}

// ─── ClassStudent ─────────────────────────────────────────────────────────────

type EnrollmentStatus = 'enrolled' | 'cancelled' | 'attended' | 'missed';

interface ClassStudentAttr {
  id: number; class_id: number; user_id: number; status: EnrollmentStatus;
  checkin: boolean; checkin_at?: Date | null; transaction_id?: number | null;
  createdAt?: Date; updatedAt?: Date;
}
interface ClassStudentCreate extends Optional<ClassStudentAttr, 'id' | 'status' | 'checkin' | 'checkin_at' | 'transaction_id'> {}

function initClassStudent(seq: Sequelize) {
  class ClassStudent extends Model<ClassStudentAttr, ClassStudentCreate> implements ClassStudentAttr {
    public id!: number; public class_id!: number; public user_id!: number;
    public status!: EnrollmentStatus; public checkin!: boolean;
    public checkin_at!: Date | null; public transaction_id!: number | null;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  ClassStudent.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    class_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'classes', key: 'id' } },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
    status: { type: DataTypes.ENUM('enrolled', 'cancelled', 'attended', 'missed'), allowNull: false, defaultValue: 'enrolled' },
    checkin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    checkin_at: { type: DataTypes.DATE, allowNull: true },
    transaction_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, { sequelize: seq, tableName: 'class_students', timestamps: true,
    indexes: [{ unique: true, fields: ['class_id', 'user_id'], name: 'uq_class_students_class_user' }] });
  return ClassStudent;
}

// ─── WaitingList ──────────────────────────────────────────────────────────────

interface WaitingListAttr {
  id: number; class_id: number; user_id: number; order: number;
  createdAt?: Date; updatedAt?: Date;
}
interface WaitingListCreate extends Optional<WaitingListAttr, 'id'> {}

function initWaitingList(seq: Sequelize) {
  class WaitingList extends Model<WaitingListAttr, WaitingListCreate> implements WaitingListAttr {
    public id!: number; public class_id!: number; public user_id!: number; public order!: number;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  WaitingList.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    class_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'classes', key: 'id' } },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
    order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  }, { sequelize: seq, tableName: 'waiting_list', timestamps: true,
    indexes: [{ unique: true, fields: ['class_id', 'user_id'], name: 'uq_waiting_list_class_user' }] });
  return WaitingList;
}

// ─── StudentCredit ────────────────────────────────────────────────────────────

export type CreditStatus = 'active' | 'expired' | 'exhausted';

interface StudentCreditAttr {
  id: number; userId: number; productId: number; totalCredits: number;
  usedCredits: number; availableCredits: number; status: CreditStatus;
  expiresAt: Date; createdAt?: Date; updatedAt?: Date;
}
interface StudentCreditCreate extends Optional<StudentCreditAttr, 'id' | 'usedCredits' | 'availableCredits' | 'status'> {}

function initStudentCredit(seq: Sequelize) {
  class StudentCredit extends Model<StudentCreditAttr, StudentCreditCreate> implements StudentCreditAttr {
    public id!: number; public userId!: number; public productId!: number;
    public totalCredits!: number; public usedCredits!: number;
    public availableCredits!: number; public status!: CreditStatus; public expiresAt!: Date;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  StudentCredit.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'products', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    totalCredits: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    usedCredits: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    availableCredits: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'expired', 'exhausted'), allowNull: false, defaultValue: 'active' },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize: seq, tableName: 'user_credits', timestamps: true, underscored: true,
    indexes: [
      { fields: ['user_id'], name: 'idx_user_credits_user_id' },
      { fields: ['product_id'], name: 'idx_user_credits_product_id' },
      { fields: ['status'], name: 'idx_user_credits_status' },
      { fields: ['expires_at'], name: 'idx_user_credits_expires_at' },
      { fields: ['user_id', 'status', 'expires_at'], name: 'idx_user_credits_fefo' },
    ] });
  return StudentCredit;
}

// ─── CreditTransaction ────────────────────────────────────────────────────────

export type TransactionReason = 'purchase' | 'consume' | 'refund' | 'adjustment' | 'expiration';

interface CreditTransactionAttr {
  id: number; studentCreditId: number; userId: number; delta: number;
  reason: TransactionReason; referenceId?: number; note?: string;
  createdAt?: Date; updatedAt?: Date;
}
interface CreditTransactionCreate extends Optional<CreditTransactionAttr, 'id' | 'referenceId' | 'note'> {}

function initCreditTransaction(seq: Sequelize) {
  class CreditTransaction extends Model<CreditTransactionAttr, CreditTransactionCreate> implements CreditTransactionAttr {
    public id!: number; public studentCreditId!: number; public userId!: number;
    public delta!: number; public reason!: TransactionReason;
    public referenceId!: number; public note!: string;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  CreditTransaction.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    studentCreditId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'user_credits', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    delta: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.ENUM('purchase', 'consume', 'refund', 'adjustment', 'expiration'), allowNull: false },
    referenceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
  }, { sequelize: seq, tableName: 'credit_transactions', timestamps: true, underscored: true,
    indexes: [
      { fields: ['user_id'], name: 'idx_credit_transactions_user_id' },
      { fields: ['student_credit_id'], name: 'idx_credit_transactions_credit_id' },
      { fields: ['reason'], name: 'idx_credit_transactions_reason' },
    ] });
  return CreditTransaction;
}

// ─── Item (checkout) ──────────────────────────────────────────────────────────

interface ItemAttr {
  id: number; itemId: number; transactionId: string; itemCode: string;
  description: string; quantity: number; amount: number; balance: number;
  status: string; studentId: number;
}
interface ItemCreate extends Optional<ItemAttr, 'id'> {}

function initItem(seq: Sequelize) {
  class Item extends Model<ItemAttr, ItemCreate> implements ItemAttr {
    public id!: number; public itemId!: number; public transactionId!: string;
    public itemCode!: string; public description!: string; public quantity!: number;
    public amount!: number; public balance!: number; public status!: string; public studentId!: number;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Item.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    itemId: { type: DataTypes.INTEGER, allowNull: false },
    transactionId: { type: DataTypes.STRING, allowNull: false },
    itemCode: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    balance: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'concluído' },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
  }, { sequelize: seq, tableName: 'items', timestamps: true });
  return Item;
}

// ─── Transaction (checkout) ───────────────────────────────────────────────────

interface TransactionAttr {
  transactionId: string; status: string; transactionType: number;
  transactionCode: string; chargeId: string; balance: number; amount: number;
  currency: string; payment_method: string; closed: boolean; customerId: string;
  studentId: number; customerName: string; customerEmail: string;
  customerDocument: string; productTypeId?: number; discountType?: number;
  discountPercent?: number; discountAmount?: number; closedAt: Date; paidAt?: Date;
}
interface TransactionCreate extends Optional<TransactionAttr,
  'transactionId' | 'productTypeId' | 'discountType' | 'discountPercent' | 'discountAmount' | 'paidAt'> {}

function initTransaction(seq: Sequelize) {
  class Transaction extends Model<TransactionAttr, TransactionCreate> implements TransactionAttr {
    public transactionId!: string; public status!: string; public transactionType!: number;
    public transactionCode!: string; public chargeId!: string; public balance!: number;
    public amount!: number; public currency!: string; public payment_method!: string;
    public closed!: boolean; public customerId!: string; public studentId!: number;
    public customerName!: string; public customerEmail!: string; public customerDocument!: string;
    public productTypeId!: number; public discountType!: number; public discountPercent!: number;
    public discountAmount!: number; public closedAt!: Date; public paidAt!: Date;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  Transaction.init({
    transactionId: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    transactionType: { type: DataTypes.INTEGER, allowNull: false },
    transactionCode: { type: DataTypes.STRING, allowNull: false },
    chargeId: { type: DataTypes.STRING, allowNull: false },
    balance: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    closed: { type: DataTypes.BOOLEAN, allowNull: false },
    customerId: { type: DataTypes.STRING, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    customerName: { type: DataTypes.STRING, allowNull: false },
    customerEmail: { type: DataTypes.STRING, allowNull: false },
    customerDocument: { type: DataTypes.STRING, allowNull: false },
    productTypeId: { type: DataTypes.INTEGER, allowNull: true },
    discountType: { type: DataTypes.INTEGER, allowNull: true },
    discountPercent: { type: DataTypes.INTEGER, allowNull: true },
    discountAmount: { type: DataTypes.INTEGER, allowNull: true },
    closedAt: { type: DataTypes.DATE, allowNull: false },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize: seq, tableName: 'transactions', timestamps: true });
  return Transaction;
}

// ─── ExternalCheckin ──────────────────────────────────────────────────────────

type ExternalPlatform = 'wellhub' | 'totalpass';
type CheckinStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

interface ExternalCheckinAttr {
  id: number; platform: ExternalPlatform; externalUserId: string;
  userId?: number; externalName?: string; externalEmail?: string;
  planType?: string; gymId?: string; status: CheckinStatus; autoAccepted: boolean;
  rawPayload?: string; validatedAt?: Date; expiresAt?: Date; createdAt?: Date; updatedAt?: Date;
}
interface ExternalCheckinCreate extends Optional<ExternalCheckinAttr,
  'id' | 'userId' | 'externalName' | 'externalEmail' | 'planType' | 'gymId' |
  'rawPayload' | 'validatedAt' | 'expiresAt' | 'autoAccepted'> {}

function initExternalCheckin(seq: Sequelize) {
  class ExternalCheckin extends Model<ExternalCheckinAttr, ExternalCheckinCreate> implements ExternalCheckinAttr {
    public id!: number; public platform!: ExternalPlatform; public externalUserId!: string;
    public userId?: number; public externalName?: string; public externalEmail?: string;
    public planType?: string; public gymId?: string; public status!: CheckinStatus;
    public autoAccepted!: boolean; public rawPayload?: string;
    public validatedAt?: Date; public expiresAt?: Date;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  ExternalCheckin.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    platform: { type: DataTypes.ENUM('wellhub', 'totalpass'), allowNull: false },
    externalUserId: { type: DataTypes.STRING(100), allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'users', key: 'id' } },
    externalName: { type: DataTypes.STRING(255), allowNull: true },
    externalEmail: { type: DataTypes.STRING(255), allowNull: true },
    planType: { type: DataTypes.STRING(50), allowNull: true },
    gymId: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'), allowNull: false, defaultValue: 'pending' },
    autoAccepted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    rawPayload: { type: DataTypes.TEXT, allowNull: true },
    validatedAt: { type: DataTypes.DATE, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize: seq, tableName: 'external_checkins', timestamps: true,
    indexes: [{ fields: ['platform', 'externalUserId'] }, { fields: ['status'] },
      { fields: ['userId'] }, { fields: ['createdAt'] }] });
  return ExternalCheckin;
}

// ─── IntegrationConfig ────────────────────────────────────────────────────────

interface IntegrationConfigAttr {
  id: number; platform: 'wellhub' | 'totalpass'; apiKey: string; gymId: string;
  secretKey: string; autoAccept: boolean; active: boolean; lastSyncAt?: Date;
  createdAt?: Date; updatedAt?: Date;
}
interface IntegrationConfigCreate extends Optional<IntegrationConfigAttr, 'id' | 'autoAccept' | 'active' | 'lastSyncAt'> {}

function initIntegrationConfig(seq: Sequelize) {
  class IntegrationConfig extends Model<IntegrationConfigAttr, IntegrationConfigCreate> implements IntegrationConfigAttr {
    public id!: number; public platform!: 'wellhub' | 'totalpass'; public apiKey!: string;
    public gymId!: string; public secretKey!: string; public autoAccept!: boolean;
    public active!: boolean; public lastSyncAt?: Date;
    public readonly createdAt!: Date; public readonly updatedAt!: Date;
  }
  IntegrationConfig.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    platform: { type: DataTypes.ENUM('wellhub', 'totalpass'), allowNull: false, unique: true },
    apiKey: { type: DataTypes.STRING(500), allowNull: false },
    gymId: { type: DataTypes.STRING(100), allowNull: false },
    secretKey: { type: DataTypes.STRING(500), allowNull: false },
    autoAccept: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastSyncAt: { type: DataTypes.DATE, allowNull: true },
  }, { sequelize: seq, tableName: 'integration_configs',
    indexes: [{ unique: true, fields: ['platform'] }] });
  return IntegrationConfig;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTenantModels(sequelize: Sequelize) {
  const Role              = initRole(sequelize);
  const Permission        = initPermission(sequelize);
  const RolePermission    = initRolePermission(sequelize);
  const UserRole          = initUserRole(sequelize);
  const Staff             = initStaff(sequelize);
  const OtpCode           = initOtpCode(sequelize);
  const ClientUser        = initClientUser(sequelize);
  const Modality          = initModality(sequelize);
  const UserLevel         = initUserLevel(sequelize);
  const UserGuardian      = initUserGuardian(sequelize);
  const ProductType       = initProductType(sequelize);
  const Product           = initProduct(sequelize);
  const Place             = initPlace(sequelize);
  const ProductTypePlace  = initProductTypePlace(sequelize);
  const Class             = initClass(sequelize);
  const ClassStudent      = initClassStudent(sequelize);
  const WaitingList       = initWaitingList(sequelize);
  const StudentCredit     = initStudentCredit(sequelize);
  const CreditTransaction = initCreditTransaction(sequelize);
  const Item              = initItem(sequelize);
  const Transaction       = initTransaction(sequelize);
  const ExternalCheckin   = initExternalCheckin(sequelize);
  const IntegrationConfig = initIntegrationConfig(sequelize);

  // ── Associations ────────────────────────────────────────────────────────────

  // Staff ↔ Role (many-to-many through UserRole)
  Staff.belongsToMany(Role, { through: UserRole, foreignKey: 'staffId', otherKey: 'roleId', as: 'roles' });
  Role.belongsToMany(Staff, { through: UserRole, foreignKey: 'roleId', otherKey: 'staffId', as: 'staffMembers' });
  UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  UserRole.belongsTo(Staff, { foreignKey: 'staffId', as: 'staff' });

  // Role ↔ Permission (many-to-many through RolePermission)
  Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId', as: 'permissions' });
  Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId', as: 'roles' });
  RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

  // ProductType ↔ Place (many-to-many through ProductTypePlace)
  ProductType.belongsToMany(Place, { through: ProductTypePlace, foreignKey: 'productTypeId', otherKey: 'placeId', as: 'places' });
  Place.belongsToMany(ProductType, { through: ProductTypePlace, foreignKey: 'placeId', otherKey: 'productTypeId', as: 'productTypes' });

  // Product → ProductType, Modality
  Product.belongsTo(ProductType, { foreignKey: 'productTypeId', as: 'productType' });
  ProductType.hasMany(Product, { foreignKey: 'productTypeId', as: 'products' });
  Product.belongsTo(Modality, { foreignKey: 'modalityId', as: 'modality' });

  // Class → Staff, Modality, ProductType, Place
  Class.belongsTo(Staff, { foreignKey: 'staff_id', as: 'teacher' });
  Class.belongsTo(Modality, { foreignKey: 'modality_id', as: 'modality' });
  Class.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'productType' });
  Class.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });
  Class.hasMany(ClassStudent, { foreignKey: 'class_id', as: 'enrollments' });

  // ClassStudent → Class, ClientUser
  ClassStudent.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
  ClassStudent.belongsTo(ClientUser, { foreignKey: 'user_id', as: 'student' });

  // WaitingList → Class, ClientUser, ProductType, Place
  WaitingList.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
  WaitingList.belongsTo(ClientUser, { foreignKey: 'user_id', as: 'student' });

  // ClientUser → UserLevel, UserGuardian
  ClientUser.belongsTo(UserLevel, { foreignKey: 'levelId', as: 'level' });
  UserLevel.hasMany(ClientUser, { foreignKey: 'levelId', as: 'users' });
  ClientUser.hasMany(UserGuardian, { foreignKey: 'studentId', as: 'guardians' });
  UserGuardian.belongsTo(ClientUser, { foreignKey: 'studentId', as: 'student' });
  UserGuardian.belongsTo(ClientUser, { foreignKey: 'guardianUserId', as: 'guardianUser' });

  // StudentCredit → ClientUser, Product
  StudentCredit.belongsTo(ClientUser, { foreignKey: 'userId', as: 'user' });
  StudentCredit.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  ClientUser.hasMany(StudentCredit, { foreignKey: 'userId', as: 'credits' });

  // CreditTransaction → StudentCredit
  CreditTransaction.belongsTo(StudentCredit, { foreignKey: 'studentCreditId', as: 'credit' });

  // ExternalCheckin → ClientUser
  ExternalCheckin.belongsTo(ClientUser, { foreignKey: 'userId', as: 'user' });

  return {
    sequelize,
    Role, Permission, RolePermission, UserRole,
    Staff, OtpCode,
    ClientUser, UserLevel, UserGuardian,
    Modality,
    ProductType, Product, Place, ProductTypePlace,
    Class, ClassStudent, WaitingList,
    StudentCredit, CreditTransaction,
    Item, Transaction,
    ExternalCheckin, IntegrationConfig,
  };
}

export type TenantDb = ReturnType<typeof createTenantModels>;
