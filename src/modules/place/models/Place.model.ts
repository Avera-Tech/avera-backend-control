import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

interface PlaceAttributes {
  id: number;
  name: string;
  address?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlaceCreationAttributes
  extends Optional<PlaceAttributes, 'id' | 'address' | 'active'> {}

class Place
  extends Model<PlaceAttributes, PlaceCreationAttributes>
  implements PlaceAttributes
{
  public id!: number;
  public name!: string;
  public address!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Place.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'places',
    timestamps: true,
  }
);

export default Place;
