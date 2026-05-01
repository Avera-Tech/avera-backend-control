import { Model, Optional } from 'sequelize';

interface OtpCodeAttributes {
  id: number;
  staffId: number;
  purpose: 'reset_password';
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OtpCodeCreationAttributes extends Optional<OtpCodeAttributes, 'id' | 'attempts'> {}

class OtpCode
  extends Model<OtpCodeAttributes, OtpCodeCreationAttributes>
  implements OtpCodeAttributes
{
  public id!: number;
  public staffId!: number;
  public purpose!: 'reset_password';
  public codeHash!: string;
  public expiresAt!: Date;
  public attempts!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default OtpCode;
