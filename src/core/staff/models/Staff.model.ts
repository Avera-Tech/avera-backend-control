import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

/**
 * Funcionário interno: credenciais e dados de perfil na tabela `staff`,
 * com FK para `users` (login/RBAC). Campos espelham o esquema relacional (nome, email, senha, etc.).
 */
interface StaffAttributes {
  id: number;
  userId: number;
  name?: string | null;
  email: string;
  password: string;
  phone?: string | null;
  employeeLevel?: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StaffCreationAttributes extends Optional<
  StaffAttributes,
  'id' | 'name' | 'phone' | 'employeeLevel' | 'active'
> {}

class Staff extends Model<StaffAttributes, StaffCreationAttributes> implements StaffAttributes {
  public id!: number;
  public userId!: number;
  public name!: string | null;
  public email!: string;
  public password!: string;
  public phone!: string | null;
  public employeeLevel!: string | null;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Staff.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'FK users.id — RBAC e sessão usam este usuário',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    employeeLevel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Nível / cargo do colaborador (employee_level)',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'staff',
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ['userId'], name: 'idx_staff_user_id' },
      { unique: true, fields: ['email'], name: 'idx_staff_email' },
    ],
  }
);

export default Staff;
