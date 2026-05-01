import { Model, Optional } from 'sequelize';

interface RoleAttributes {
  id: number;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'description' | 'active'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Role;
