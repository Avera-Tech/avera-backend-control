import { Model, Optional } from 'sequelize';

interface StaffRoleAttributes {
  id: number;
  staffId: number;
  roleId: number;
  assignedAt?: Date;
  assignedBy?: number;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StaffRoleCreationAttributes extends Optional<
  StaffRoleAttributes,
  'id' | 'assignedAt' | 'assignedBy' | 'expiresAt'
> {}

class UserRole
  extends Model<StaffRoleAttributes, StaffRoleCreationAttributes>
  implements StaffRoleAttributes
{
  public id!: number;
  public staffId!: number;
  public roleId!: number;
  public assignedAt!: Date;
  public assignedBy!: number;
  public expiresAt!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default UserRole;
