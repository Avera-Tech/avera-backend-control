import { Model, Optional } from 'sequelize';

interface PermissionAttributes {
  id: number;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id' | 'description' | 'active'> {}

class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public resource!: string;
  public action!: string;
  public description!: string;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Permission;
