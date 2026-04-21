import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

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

ClassStudent.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'classes', key: 'id' },
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('enrolled', 'cancelled', 'attended', 'missed'),
      allowNull: false,
      defaultValue: 'enrolled',
    },
    checkin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    checkin_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'class_students',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['class_id', 'user_id'],
        name: 'uq_class_students_class_user',
      },
    ],
  }
);

export default ClassStudent;
