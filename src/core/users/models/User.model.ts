import { Model, Optional } from 'sequelize';

interface UserAttributes {
  id: number;
  // ── Auth ───────────────────────────────────────
  email: string;
  password: string;
  active: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  // ── Básico (compartilhado) ─────────────────────
  name: string;
  cpf?: string;
  phone?: string;
  birthday?: Date;
  // ── Endereço (compartilhado) ───────────────────
  zipCode?: string;
  state?: string;
  city?: string;
  address?: string;
  // ── Extras ─────────────────────────────────────
  notes?: string;
  // ── Timestamps ─────────────────────────────────
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<
  UserAttributes,
  | 'id'
  | 'active'
  | 'emailVerified'
  | 'lastLogin'
  | 'cpf'
  | 'phone'
  | 'birthday'
  | 'zipCode'
  | 'state'
  | 'city'
  | 'address'
  | 'notes'
> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public active!: boolean;
  public emailVerified!: boolean;
  public lastLogin!: Date;
  public name!: string;
  public cpf!: string;
  public phone!: string;
  public birthday!: Date;
  public zipCode!: string;
  public state!: string;
  public city!: string;
  public address!: string;
  public notes!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default User;