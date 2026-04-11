import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

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

UserLevel.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Cor em hex para o frontend (ex: #FF5733)',
    },
    numberOfClasses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Número de aulas para atingir este nível',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'user_levels',
    timestamps: true,
    underscored: false,
  }
);

export default UserLevel;
