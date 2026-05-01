import { Model, Optional } from 'sequelize';

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



// ExternalCheckin.sync({ alter: true }); // Rodar uma vez para criar a tabela

export default ExternalCheckin;