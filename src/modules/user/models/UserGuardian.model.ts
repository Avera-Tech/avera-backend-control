import { Model, Optional } from 'sequelize';

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

export default UserGuardian;
