import { DataTypes, Model, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';
import User from '../../../core/users/models/User.model';

export type ExternalPlatform = 'wellhub' | 'totalpass';
export type CheckinStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

interface ExternalCheckinAttributes {
  id: number;
  platform: ExternalPlatform;
  externalUserId: string;   // gympass_id / totalpass_id
  userId?: number;          // FK para User (null se ainda não vinculado)
  externalName?: string;    // Nome vindo do webhook
  externalEmail?: string;   // Email vindo do webhook
  planType?: string;        // Gold, Platinum, etc.
  gymId?: string;           // ID do estabelecimento na plataforma
  status: CheckinStatus;
  autoAccepted: boolean;
  rawPayload?: string;      // JSON cru do webhook (para auditoria)
  validatedAt?: Date;       // Quando foi validado na API da Wellhub
  expiresAt?: Date;         // Expiração do check-in (30min)
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExternalCheckinCreationAttributes
  extends Optional<
    ExternalCheckinAttributes,
    'id' | 'userId' | 'externalName' | 'externalEmail' | 'planType' | 'gymId'
    | 'rawPayload' | 'validatedAt' | 'expiresAt' | 'autoAccepted'
  > {}

class ExternalCheckin
  extends Model<ExternalCheckinAttributes, ExternalCheckinCreationAttributes>
  implements ExternalCheckinAttributes
{
  public id!: number;
  public platform!: ExternalPlatform;
  public externalUserId!: string;
  public userId?: number;
  public externalName?: string;
  public externalEmail?: string;
  public planType?: string;
  public gymId?: string;
  public status!: CheckinStatus;
  public autoAccepted!: boolean;
  public rawPayload?: string;
  public validatedAt?: Date;
  public expiresAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExternalCheckin.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    platform: {
      type: DataTypes.ENUM('wellhub', 'totalpass'),
      allowNull: false,
    },
    externalUserId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'gympass_id ou id equivalente na plataforma',
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: User, key: 'id' },
      comment: 'Null quando user ainda não está vinculado — vínculo manual pelo operador',
    },
    externalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    externalEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    planType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Plano do usuário na plataforma (Gold, Platinum, etc.)',
    },
    gymId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID do estabelecimento na plataforma parceira',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
    },
    autoAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    rawPayload: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Payload JSON cru do webhook para auditoria',
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Quando a validação foi enviada à API da Wellhub',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiração do check-in (normalmente 30min após criação)',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'external_checkins',
    timestamps: true,
    indexes: [
      { fields: ['platform', 'externalUserId'] },
      { fields: ['status'] },
      { fields: ['userId'] },
      { fields: ['createdAt'] },
    ],
  }
);

ExternalCheckin.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ExternalCheckin.sync({ alter: true }); // Rodar uma vez para criar a tabela

export default ExternalCheckin;