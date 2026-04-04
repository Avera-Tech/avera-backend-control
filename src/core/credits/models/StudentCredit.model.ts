import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

export type CreditStatus = 'active' | 'expired' | 'exhausted';

interface StudentCreditAttributes {
  id: number;
  studentId: number;
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
  public studentId!: number;
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
    studentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'students', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'FK para a tabela students',
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Produto que originou este lote — não permite excluir produto com lotes ativos',
    },
    totalCredits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Total de créditos concedidos na compra',
    },
    usedCredits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: 'Créditos já consumidos neste lote',
    },
    availableCredits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Créditos ainda disponíveis — totalCredits - usedCredits',
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'exhausted'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'active = com saldo; exhausted = zerado; expired = vencido sem consumir tudo',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Data de expiração — calculada em createdAt + product.validityDays',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'student_credits',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['studentId'],          name: 'idx_student_credits_student_id' },
      { fields: ['productId'],          name: 'idx_student_credits_product_id' },
      { fields: ['status'],             name: 'idx_student_credits_status' },
      { fields: ['expiresAt'],          name: 'idx_student_credits_expires_at' },
      { fields: ['studentId', 'status', 'expiresAt'], name: 'idx_student_credits_fefo' },
    ],
  }
);

export default StudentCredit;