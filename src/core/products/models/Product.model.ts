// src/core/products/models/Product.model.ts

import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

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

Product.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    productTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'product_types',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'FK para product_types — não permite excluir tipo com produtos vinculados',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nome do pacote exibido ao aluno (ex: Pacote 10 Aulas Beach Tennis)',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição opcional com detalhes do pacote',
    },
    credits: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Quantidade de créditos (aulas) incluídos no pacote',
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Preço fixo do pacote em reais',
    },
    validityDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: 'Dias de validade dos créditos após a compra (ex: 30, 60, 90)',
    },
    purchaseLimit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: 'Limite de vezes que um aluno pode comprar este produto — null = sem limite',
    },
    recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se true, é um pacote de assinatura recorrente — recurringInterval torna-se obrigatório',
    },
    recurringInterval: {
      type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'semiannual', 'annual'),
      allowNull: true,
      comment: 'Intervalo de cobrança — obrigatório quando recurring = true',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica se o pacote está disponível para venda',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'products',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ['productTypeId'],
        name: 'idx_products_product_type_id',
      },
      {
        fields: ['active'],
        name: 'idx_products_active',
      },
      {
        fields: ['recurring'],
        name: 'idx_products_recurring',
      },
    ],
  }
);

export default Product;