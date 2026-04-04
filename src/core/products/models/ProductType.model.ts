// src/core/products/models/ProductType.model.ts

import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

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

ProductType.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Nome do tipo de produto — único dentro do tenant (ex: Beach Tennis, Padel)',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descrição opcional da modalidade',
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Cor de identificação visual (ex: #FF5733 ou nome CSS)',
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Identificador do ícone (ex: nome de ícone Material/Heroicons ou URL)',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica se o tipo de produto está ativo e disponível para uso',
    },
  },
  {
    sequelize: coreDB,
    tableName: 'product_types',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['name'],
        name: 'uq_product_types_name',
      },
      {
        fields: ['active'],
        name: 'idx_product_types_active',
      },
    ],
  }
);

export default ProductType;