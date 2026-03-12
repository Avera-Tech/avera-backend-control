import { Model, DataTypes, Optional } from 'sequelize';
import masterDB from '../../config/database.master';

interface AppConfigAttributes {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AppConfigCreationAttributes extends Optional<AppConfigAttributes, 'id' | 'description' | 'active'> {}

class AppConfig extends Model<AppConfigAttributes, AppConfigCreationAttributes> implements AppConfigAttributes {
  public id!: number;
  public key!: string;
  public value!: string;
  public type!: 'string' | 'number' | 'boolean' | 'json';
  public category!: string;
  public description!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AppConfig.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Chave única da configuração (ex: app_name, primary_color)',
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Valor da configuração (pode ser JSON para objetos complexos)',
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      allowNull: false,
      defaultValue: 'string',
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Categoria da configuração (ex: theme, features, general)',
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
    sequelize: masterDB,
    tableName: 'app_configs',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['key'],
      },
      {
        fields: ['category'],
      },
    ],
  }
);

export default AppConfig;
