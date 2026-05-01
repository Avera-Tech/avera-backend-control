// src/core/places/models/Place.model.ts

import { Model, Optional } from 'sequelize';

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

export default Place;
