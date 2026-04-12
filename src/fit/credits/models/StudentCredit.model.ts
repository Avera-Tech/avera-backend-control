import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

export type CreditStatus = 'active' | 'expired' | 'exhausted';

interface StudentCreditAttributes {
  id: number;
  userId: number;
  productId: number;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  status: CreditStatus;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StudentCreditCreationAttributes
  extends Optional<StudentCreditAttributes, 'id' | 'usedCredits' | 'availableCredits' | 'status'> {}

class StudentCredit
  extends Model<StudentCreditAttributes, StudentCreditCreationAttributes>
  implements StudentCreditAttributes
{
  public id!: number;
  public userId!: number;
  public productId!: number;
  public totalCredits!: number;
  public usedCredits!: number;
  public availableCredits!: number;
  public status!: CreditStatus;
  public expiresAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentCredit.init(
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
      onUpdate: 'CASCADE',
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    totalCredits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    usedCredits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    availableCredits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'exhausted'),
      allowNull: false,
      defaultValue: 'active',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'user_credits',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'],                          name: 'idx_user_credits_user_id' },
      { fields: ['product_id'],                       name: 'idx_user_credits_product_id' },
      { fields: ['status'],                           name: 'idx_user_credits_status' },
      { fields: ['expires_at'],                       name: 'idx_user_credits_expires_at' },
      { fields: ['user_id', 'status', 'expires_at'],  name: 'idx_user_credits_fefo' },
    ],
  }
);

export default StudentCredit;
