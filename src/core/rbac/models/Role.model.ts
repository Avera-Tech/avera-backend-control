import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface RoleAttributes {
  id: number;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'description' | 'active'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Identificador único para uso em código (ex: admin, manager, user)',
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
    tableName: 'roles',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
    ],
  }
);

export default Role;
