import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface PermissionAttributes {
  id: number;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id' | 'description' | 'active'> {}

class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public resource!: string;
  public action!: string;
  public description!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Formato: resource:action (ex: users:create, reports:read)',
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Recurso ao qual a permissão se aplica (ex: users, products, reports)',
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Ação permitida (ex: create, read, update, delete, list)',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'permissions',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['resource'],
      },
      {
        fields: ['action'],
      },
    ],
  }
);

export default Permission;
