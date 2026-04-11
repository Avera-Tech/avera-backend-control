import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

export type TransactionReason = 'purchase' | 'consume' | 'refund' | 'adjustment' | 'expiration';

interface CreditTransactionAttributes {
  id: number;
  studentCreditId: number;
  clientId: number;
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
  public clientId!: number;
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
      references: { model: 'student_credits', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Lote de créditos afetado pela transação',
    },
    clientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Desnormalizado para facilitar queries de histórico por cliente',
    },
    delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Variação de créditos — positivo para entrada, negativo para consumo',
    },
    reason: {
      type: DataTypes.ENUM('purchase', 'consume', 'refund', 'adjustment', 'expiration'),
      allowNull: false,
      comment: 'Motivo da transação',
    },
    referenceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: 'ID de referência externa — ex: id da aula consumida, id do pedido',
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Observação livre para auditoria',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'credit_transactions',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['clientId'],         name: 'idx_credit_transactions_client_id' },
      { fields: ['studentCreditId'],  name: 'idx_credit_transactions_credit_id' },
      { fields: ['reason'],           name: 'idx_credit_transactions_reason' },
    ],
  }
);

export default CreditTransaction;