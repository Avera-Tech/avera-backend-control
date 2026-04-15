// src/core/places/models/Place.model.ts

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
      comment: 'Nome da unidade/local físico (ex: Unidade Centro, Quadra Norte)',
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Endereço completo do local',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica se o local está ativo',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'places',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ['active'],
        name: 'idx_places_active',
      },
    ],
  }
);

export default Place;
