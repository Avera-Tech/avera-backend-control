import { Model, DataTypes, Optional } from 'sequelize';
import masterDB from '../../config/database.master';

interface FeatureAttributes {
  id: number;
  name: string;
  slug: string;
  description?: string;
  enabled: boolean;
  category: string;
  config?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FeatureCreationAttributes extends Optional<FeatureAttributes, 'id' | 'description' | 'enabled' | 'config'> {}

class Feature extends Model<FeatureAttributes, FeatureCreationAttributes> implements FeatureAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string;
  public enabled!: boolean;
  public category!: string;
  public config!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Feature.init(
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
      comment: 'Identificador único (ex: user_management, reports, analytics)',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Se a funcionalidade está habilitada no sistema',
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Categoria da feature (ex: core, addon, integration)',
    },
    config: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Configurações JSON específicas da feature',
    },
  },
  {
    sequelize: masterDB,
    tableName: 'features',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['category'],
      },
    ],
  }
);

export default Feature;
