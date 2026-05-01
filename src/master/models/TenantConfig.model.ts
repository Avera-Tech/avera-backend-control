import { Model, DataTypes, Optional } from 'sequelize';
import masterDB from '../../config/database.master';

interface TenantConfigAttributes {
  id: number;
  clientId: string;
  planName: string;
  isActive: boolean;
  planExpiresAt: Date;
  trialEndsAt?: Date | null;
  suspendedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TenantConfigCreationAttributes
  extends Optional<TenantConfigAttributes, 'id' | 'trialEndsAt' | 'suspendedAt'> {}

class TenantConfig
  extends Model<TenantConfigAttributes, TenantConfigCreationAttributes>
  implements TenantConfigAttributes
{
  public id!: number;
  public clientId!: string;
  public planName!: string;
  public isActive!: boolean;
  public planExpiresAt!: Date;
  public trialEndsAt!: Date | null;
  public suspendedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TenantConfig.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    clientId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    planName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    planExpiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: masterDB,
    tableName: 'tenant_config',
    timestamps: true,
    underscored: false,
  }
);

export default TenantConfig;
