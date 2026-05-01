import { Model, Optional } from 'sequelize';

interface TransactionAttributes {
  transactionId: string;
  status: string;
  transactionType: number; // 1 = crédito, 2 = débito
  transactionCode: string;
  chargeId: string;
  balance: number;
  amount: number;
  currency: string;
  payment_method: string;
  closed: boolean;
  customerId: string;
  studentId: number;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  productTypeId?: number;
  discountType?: number;
  discountPercent?: number;
  discountAmount?: number;
  closedAt: Date;
  paidAt?: Date;
}

interface TransactionCreationAttributes
  extends Optional<
    TransactionAttributes,
    'transactionId' | 'productTypeId' | 'discountType' | 'discountPercent' | 'discountAmount' | 'paidAt'
  > {}

class Transaction
  extends Model<TransactionAttributes, TransactionCreationAttributes>
  implements TransactionAttributes
{
  public transactionId!: string;
  public status!: string;
  public transactionType!: number;
  public transactionCode!: string;
  public chargeId!: string;
  public balance!: number;
  public amount!: number;
  public currency!: string;
  public payment_method!: string;
  public closed!: boolean;
  public customerId!: string;
  public studentId!: number;
  public customerName!: string;
  public customerEmail!: string;
  public customerDocument!: string;
  public productTypeId!: number;
  public discountType!: number;
  public discountPercent!: number;
  public discountAmount!: number;
  public closedAt!: Date;
  public paidAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Transaction;