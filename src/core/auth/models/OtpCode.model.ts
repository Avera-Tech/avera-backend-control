import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface OtpCodeAttributes {
  id: number;
  userId: number;
  purpose: 'signup' | 'reset_password';
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OtpCodeCreationAttributes extends Optional<OtpCodeAttributes, 'id' | 'attempts'> {}

class OtpCode extends Model<OtpCodeAttributes, OtpCodeCreationAttributes> implements OtpCodeAttributes {
  public id!: number;
  public userId!: number;
  public purpose!: 'signup' | 'reset_password';
  public codeHash!: string;
  public expiresAt!: Date;
  public attempts!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OtpCode.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    purpose: {
      type: DataTypes.ENUM('signup', 'reset_password'),
      allowNull: false,
    },
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'otp_codes',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['purpose'] },
    ],
  }
);

export default OtpCode;