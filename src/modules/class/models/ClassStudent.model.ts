import { Model, Optional } from 'sequelize';

type EnrollmentStatus = 'enrolled' | 'cancelled' | 'attended' | 'missed';

interface ClassStudentAttributes {
  id: number;
  class_id: number;
  user_id: number;
  status: EnrollmentStatus;
  checkin: boolean;
  checkin_at?: Date | null;
  transaction_id?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClassStudentCreationAttributes
  extends Optional<
    ClassStudentAttributes,
    'id' | 'status' | 'checkin' | 'checkin_at' | 'transaction_id'
  > {}

class ClassStudent
  extends Model<ClassStudentAttributes, ClassStudentCreationAttributes>
  implements ClassStudentAttributes
{
  public id!: number;
  public class_id!: number;
  public user_id!: number;
  public status!: EnrollmentStatus;
  public checkin!: boolean;
  public checkin_at!: Date | null;
  public transaction_id!: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default ClassStudent;
