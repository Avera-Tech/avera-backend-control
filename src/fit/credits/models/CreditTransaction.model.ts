import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

export type TransactionReason = 'purchase' | 'consume' | 'refund' | 'adjustment' | 'expiration';

interface CreditTransactionAttributes {
  id: number;
  studentCreditId: number;
  userId: number;
  delta: number;
  reason: TransactionReason;
  referenceId?: number;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreditTransactionCreationAttributes
  extends Optional<CreditTransactionAttributes, 'id' | 'referenceId' | 'note'> {}

class CreditTransaction
  extends Model<CreditTransactionAttributes, CreditTransactionCreationAttributes>
  implements CreditTransactionAttributes
{
  public id!: number;
  public studentCreditId!: number;
  public userId!: number;
  public delta!: number;
  public reason!: TransactionReason;
  public referenceId!: number;
  public note!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CreditTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    studentCreditId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'user_credits', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.ENUM('purchase', 'consume', 'refund', 'adjustment', 'expiration'),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'credit_transactions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'],           name: 'idx_credit_transactions_user_id' },
      { fields: ['student_credit_id'], name: 'idx_credit_transactions_credit_id' },
      { fields: ['reason'],            name: 'idx_credit_transactions_reason' },
    ],
  }
);

export default CreditTransaction;
