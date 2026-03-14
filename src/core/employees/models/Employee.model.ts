import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface EmployeeAttributes {
  id: number;
  // ── Auth ───────────────────────────────────────
  email: string;
  password: string;
  active: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  // ── Básico (compartilhado) ─────────────────────
  name: string;
  cpf?: string;
  phone?: string;
  birthday?: Date;
  // ── Profissional ───────────────────────────────
  position?: string;
  // ── Endereço (compartilhado) ───────────────────
  zipCode?: string;
  state?: string;
  city?: string;
  address?: string;
  // ── Timestamps ─────────────────────────────────
  createdAt?: Date;
  updatedAt?: Date;
}

interface EmployeeCreationAttributes extends Optional<
  EmployeeAttributes,
  | 'id'
  | 'active'
  | 'emailVerified'
  | 'lastLogin'
  | 'cpf'
  | 'phone'
  | 'birthday'
  | 'position'
  | 'zipCode'
  | 'state'
  | 'city'
  | 'address'
> {}

class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public active!: boolean;
  public emailVerified!: boolean;
  public lastLogin!: Date;
  public name!: string;
  public cpf!: string;
  public phone!: string;
  public birthday!: Date;
  public position!: string;
  public zipCode!: string;
  public state!: string;
  public city!: string;
  public address!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Employee.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    // ── Auth ──────────────────────────────────────
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ── Básico ────────────────────────────────────
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: true,
      unique: true,
      comment: 'Formato: 000.000.000-00',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // ── Profissional ──────────────────────────────
    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Cargo do funcionário',
    },
    // ── Endereço ──────────────────────────────────
    zipCode: {
      type: DataTypes.STRING(9),
      allowNull: true,
      comment: 'Formato: 00000-000',
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Rua, número, complemento',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'users',
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ['email'] },
    ],
  }
);

export default Employee;