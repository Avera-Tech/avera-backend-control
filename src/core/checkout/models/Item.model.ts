import { Model, Optional } from 'sequelize';

interface ItemAttributes {
  id: number;
  itemId: number;
  transactionId: string;
  itemCode: string;
  description: string;
  quantity: number;
  amount: number;
  balance: number;
  status: string; // 'concluído' | 'ativo' | 'cancelado'
  studentId: number;
}

interface ItemCreationAttributes extends Optional<ItemAttributes, 'id'> {}

class Item
  extends Model<ItemAttributes, ItemCreationAttributes>
  implements ItemAttributes
{
  public id!: number;
  public itemId!: number;
  public transactionId!: string;
  public itemCode!: string;
  public description!: string;
  public quantity!: number;
  public amount!: number;
  public balance!: number;
  public status!: string;
  public studentId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Item;