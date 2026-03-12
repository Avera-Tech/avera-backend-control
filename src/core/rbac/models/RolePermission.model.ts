import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface RolePermissionAttributes {
  id: number;
  roleId: number;
  permissionId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id'> {}

class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
  public id!: number;
  public roleId!: number;
  public permissionId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RolePermission.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
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
    permissionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'role_permissions',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['roleId', 'permissionId'],
      },
      {
        fields: ['roleId'],
      },
      {
        fields: ['permissionId'],
      },
    ],
  }
);

export default RolePermission;
