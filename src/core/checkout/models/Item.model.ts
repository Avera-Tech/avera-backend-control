import { DataTypes, Model, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

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

Item.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    itemCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'concluído',
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'items',
    timestamps: true,
  }
);

export default Item;