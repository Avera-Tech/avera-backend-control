import { Model, Optional } from 'sequelize';

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


// IntegrationConfig.sync({ alter: true }); // Rodar uma vez para criar a tabela

export default IntegrationConfig;