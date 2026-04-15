// src/core/places/models/ProductTypePlace.model.ts

import { Model, DataTypes } from 'sequelize';
import coreDB from '../../../config/database.core';

class ProductTypePlace extends Model {}

ProductTypePlace.init(
  {
    productTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: 'product_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    placeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: 'places', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'product_type_places',
    timestamps: false,
  }
);

export default ProductTypePlace;
