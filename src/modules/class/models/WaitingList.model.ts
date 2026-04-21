import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface WaitingListAttributes {
  id: number;
  class_id: number;
  user_id: number;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WaitingListCreationAttributes
  extends Optional<WaitingListAttributes, 'id'> {}

class WaitingList
  extends Model<WaitingListAttributes, WaitingListCreationAttributes>
  implements WaitingListAttributes
{
  public id!: number;
  public class_id!: number;
  public user_id!: number;
  public order!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WaitingList.init(
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
    order: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'waiting_list',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['class_id', 'user_id'],
        name: 'uq_waiting_list_class_user',
      },
    ],
  }
);

export default WaitingList;
