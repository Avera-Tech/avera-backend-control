import { DataTypes, Model, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

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

Transaction.init(
  {
    transactionId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    transactionType: {
      type: DataTypes.INTEGER, // 1 = crédito, 2 = débito
      allowNull: false,
    },
    transactionCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chargeId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    closed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    customerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerDocument: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    discountType: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    discountPercent: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    discountAmount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'transactions',
    timestamps: true,
  }
);

export default Transaction;