import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface StaffAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  employeeLevel?: string | null;
  active: boolean;
  emailVerified: boolean;
  lastLogin?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StaffCreationAttributes extends Optional<
  StaffAttributes,
  'id' | 'phone' | 'employeeLevel' | 'active' | 'emailVerified' | 'lastLogin'
> {}

class Staff extends Model<StaffAttributes, StaffCreationAttributes> implements StaffAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public phone!: string | null;
  public employeeLevel!: string | null;
  public active!: boolean;
  public emailVerified!: boolean;
  public lastLogin!: Date | null;

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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
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
  },
  {
    sequelize: coreDB,
    tableName: 'staff',
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ['email'], name: 'idx_staff_email' },
    ],
  }
);

export default Staff;
