import { Model, DataTypes, Optional } from 'sequelize';
import masterDB from '../../config/database.master';

interface ThemeAttributes {
  id: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logo?: string;
  favicon?: string;
  customCSS?: string;
  active: boolean;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ThemeCreationAttributes extends Optional<ThemeAttributes, 'id' | 'logo' | 'favicon' | 'customCSS' | 'active' | 'isDefault'> {}

class Theme extends Model<ThemeAttributes, ThemeCreationAttributes> implements ThemeAttributes {
  public id!: number;
  public name!: string;
  public primaryColor!: string;
  public secondaryColor!: string;
  public accentColor!: string;
  public backgroundColor!: string;
  public textColor!: string;
  public logo!: string;
  public favicon!: string;
  public customCSS!: string;
  public active!: boolean;
  public isDefault!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Theme.init(
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
    primaryColor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#007bff',
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#6c757d',
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    accentColor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#28a745',
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    backgroundColor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#ffffff',
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    textColor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#212529',
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL ou caminho do logo',
    },
    favicon: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL ou caminho do favicon',
    },
    customCSS: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'CSS customizado para sobrescrever estilos',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Apenas um tema pode ser o padrão',
    },
  },
  {
    sequelize: masterDB,
    tableName: 'themes',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  }
);

export default Theme;
