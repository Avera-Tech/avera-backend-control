import { Model, Optional } from 'sequelize';

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

export default WaitingList;
