// src/core/products/models/Product.model.ts

import { Model, Optional } from 'sequelize';

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ProductAttributes {
  id: number;
  productTypeId: number;
  name: string;
  description?: string;
  credits: number;
  value: number;
  validityDays: number;
  purchaseLimit?: number;
  recurring: boolean;
  recurringInterval?: RecurringInterval;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes
  extends Optional<
    ProductAttributes,
    'id' | 'description' | 'purchaseLimit' | 'recurring' | 'recurringInterval' | 'active'
  > {}

// ─── Model ────────────────────────────────────────────────────────────────────

class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  public id!: number;
  public productTypeId!: number;
  public name!: string;
  public description!: string;
  public credits!: number;
  public value!: number;
  public validityDays!: number;
  public purchaseLimit!: number;
  public recurring!: boolean;
  public recurringInterval!: RecurringInterval;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Product;