import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface UserRoleAttributes {
  id: number;
  userId: number;
  roleId: number;
  assignedAt?: Date;
  assignedBy?: number;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserRoleCreationAttributes extends Optional<UserRoleAttributes, 'id' | 'assignedAt' | 'assignedBy' | 'expiresAt'> {}

class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
  public id!: number;
  public userId!: number;
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
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    roleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
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
      comment: 'ID do usuário que atribuiu esta role',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de expiração da role (opcional)',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'user_roles',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'roleId'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['roleId'],
      },
    ],
  }
);

export default UserRole;
