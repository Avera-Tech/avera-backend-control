import { Model, Optional } from 'sequelize';

interface UserLevelAttributes {
  id: number;
  name: string;
  color?: string | null;
  numberOfClasses?: number | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserLevelCreationAttributes
  extends Optional<UserLevelAttributes, 'id' | 'color' | 'numberOfClasses' | 'active'> {}

class UserLevel
  extends Model<UserLevelAttributes, UserLevelCreationAttributes>
  implements UserLevelAttributes
{
  public id!: number;
  public name!: string;
  public color!: string | null;
  public numberOfClasses!: number | null;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default UserLevel;
