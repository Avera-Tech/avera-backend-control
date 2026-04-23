import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface UserGuardianAttributes {
  id: number;
  studentId: number;
  guardianUserId?: number | null;
  name?: string | null;
  phone?: string | null;
  document?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserGuardianCreationAttributes
  extends Optional<
    UserGuardianAttributes,
    'id' | 'guardianUserId' | 'name' | 'phone' | 'document'
  > {}

class UserGuardian
  extends Model<UserGuardianAttributes, UserGuardianCreationAttributes>
  implements UserGuardianAttributes
{
  public id!: number;
  public studentId!: number;
  public guardianUserId!: number | null;
  public name!: string | null;
  public phone!: string | null;
  public document!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserGuardian.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    guardianUserId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    document: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: 'CPF',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'user_guardians',
    timestamps: true,
    underscored: false,
  }
);

export default UserGuardian;
