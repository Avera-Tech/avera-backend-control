import { Model, Optional } from 'sequelize';

interface RolePermissionAttributes {
  id: number;
  roleId: number;
  permissionId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id'> {}

class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
  public id!: number;
  public roleId!: number;
  public permissionId!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default RolePermission;
