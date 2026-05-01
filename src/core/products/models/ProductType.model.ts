// src/core/products/models/ProductType.model.ts

import { Model, Optional } from 'sequelize';

interface ProductTypeAttributes {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductTypeCreationAttributes
  extends Optional<ProductTypeAttributes, 'id' | 'description' | 'color' | 'icon' | 'active'> {}

class ProductType
  extends Model<ProductTypeAttributes, ProductTypeCreationAttributes>
  implements ProductTypeAttributes
{
  public id!: number;
  public name!: string;
  public description!: string;
  public color!: string;
  public icon!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default ProductType;