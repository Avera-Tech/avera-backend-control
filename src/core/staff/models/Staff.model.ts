import { Model, Optional } from 'sequelize';

interface StaffAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  employeeLevel?: string | null;
  active: boolean;
  emailVerified: boolean;
  lastLogin?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StaffCreationAttributes extends Optional<
  StaffAttributes,
  'id' | 'phone' | 'employeeLevel' | 'active' | 'emailVerified' | 'lastLogin'
> {}

class Staff extends Model<StaffAttributes, StaffCreationAttributes> implements StaffAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public phone!: string | null;
  public employeeLevel!: string | null;
  public active!: boolean;
  public emailVerified!: boolean;
  public lastLogin!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default Staff;
