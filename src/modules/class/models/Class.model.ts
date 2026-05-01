import { Model, Optional } from 'sequelize';

interface ClassAttributes {
  id: number;
  staff_id: number;
  product_type_id: number;
  place_id?: number | null;
  date: string;
  time: string;
  limit: number;
  spots_taken: number;
  has_commission: boolean;
  kickback_rule?: string | null;
  kickback?: number | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClassCreationAttributes
  extends Optional<
    ClassAttributes,
    'id' | 'place_id' | 'spots_taken' | 'has_commission' | 'kickback_rule' | 'kickback' | 'active'
  > {}

class Class
  extends Model<ClassAttributes, ClassCreationAttributes>
  implements ClassAttributes
{
  public id!: number;
  public staff_id!: number;
  public product_type_id!: number;
  public place_id!: number | null;
  public date!: string;
  public time!: string;
  public limit!: number;
  public spots_taken!: number;
  public has_commission!: boolean;
  public kickback_rule!: string | null;
  public kickback!: number | null;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Class;
