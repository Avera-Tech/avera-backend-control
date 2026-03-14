import { DataTypes, Model, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface IntegrationConfigAttributes {
  id: number;
  platform: 'wellhub' | 'totalpass';
  apiKey: string;
  gymId: string;
  secretKey: string;             // Para validação de assinatura HMAC do webhook
  autoAccept: boolean;
  active: boolean;
  lastSyncAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IntegrationConfigCreationAttributes
  extends Optional<IntegrationConfigAttributes, 'id' | 'autoAccept' | 'active' | 'lastSyncAt'> {}

class IntegrationConfig
  extends Model<IntegrationConfigAttributes, IntegrationConfigCreationAttributes>
  implements IntegrationConfigAttributes
{
  public id!: number;
  public platform!: 'wellhub' | 'totalpass';
  public apiKey!: string;
  public gymId!: string;
  public secretKey!: string;
  public autoAccept!: boolean;
  public active!: boolean;
  public lastSyncAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

IntegrationConfig.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    platform: {
      type: DataTypes.ENUM('wellhub', 'totalpass'),
      allowNull: false,
      unique: true,
    },
    apiKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'API Key obtida via Tech Sales da plataforma',
    },
    gymId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'ID do estabelecimento na plataforma parceira',
    },
    secretKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Secret para validação HMAC-SHA1 do webhook (X-Gympass-Signature)',
    },
    autoAccept: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'integration_configs',
    indexes: [{ unique: true, fields: ['platform'] }],
  }
);

// IntegrationConfig.sync({ alter: true }); // Rodar uma vez para criar a tabela

export default IntegrationConfig;