import { Model, Optional } from 'sequelize';

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

export default CreditTransaction;
