import { Model, Optional } from 'sequelize';

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

export default StudentCredit;
