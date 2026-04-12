import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface StaffRoleAttributes {
  id: number;
  staffId: number;
  roleId: number;
  assignedAt?: Date;
  assignedBy?: number;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StaffRoleCreationAttributes extends Optional<
  StaffRoleAttributes,
  'id' | 'assignedAt' | 'assignedBy' | 'expiresAt'
> {}

class UserRole
  extends Model<StaffRoleAttributes, StaffRoleCreationAttributes>
  implements StaffRoleAttributes
{
  public id!: number;
  public staffId!: number;
  public roleId!: number;
  public assignedAt!: Date;
  public assignedBy!: number;
  public expiresAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserRole.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    staffId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'staff', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    roleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    assignedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'staff_roles',
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ['staffId', 'roleId'] },
      { fields: ['staffId'] },
      { fields: ['roleId'] },
    ],
  }
);

export default UserRole;
