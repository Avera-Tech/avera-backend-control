import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface UserAttributes {
  id: number;
  // ── Básico ────────────────────────────────────────────
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  birthday?: Date;
  // ── Endereço ──────────────────────────────────────────
  zipCode?: string;
  state?: string;
  city?: string;
  address?: string;
  // ── Específico do usuário ─────────────────────────────
  userLevel?: string;
  frequency?: string;
  enrollmentDate?: Date;
  notes?: string;       // JSON: { "wellhub_id": "12345", ... }
  active: boolean;
  // ── Timestamps ────────────────────────────────────────
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<
  UserAttributes,
  | 'id'
  | 'cpf'
  | 'email'
  | 'phone'
  | 'birthday'
  | 'zipCode'
  | 'state'
  | 'city'
  | 'address'
  | 'userLevel'
  | 'frequency'
  | 'enrollmentDate'
  | 'notes'
  | 'active'
> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public cpf!: string;
  public email!: string;
  public phone!: string;
  public birthday!: Date;
  public zipCode!: string;
  public state!: string;
  public city!: string;
  public address!: string;
  public userLevel!: string;
  public frequency!: string;
  public enrollmentDate!: Date;
  public notes!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    // ── Básico ──────────────────────────────────────────
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // ── Endereço ────────────────────────────────────────
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
    // ── Específico do usuário ────────────────────────────
    userLevel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Nível do usuário (ex: iniciante, intermediário, avançado)',
    },
    frequency: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Frequência de treinos (ex: 2x, 3x por semana)',
    },
    enrollmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de matrícula',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON com dados extras. Ex: { "wellhub_id": "12345" }',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'users',
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ['email'] },
      { unique: true, fields: ['cpf'] },
    ],
  }
);

export default User;