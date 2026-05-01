import { Model, Optional } from 'sequelize';

/**
 * Modelo de Cliente/Aluno — SEM login, perfil apenas.
 * Não confundir com src/core/users/models/User.model.ts (RBAC auth).
 */
interface ClientUserAttributes {
  id: number;
  name: string;
  email: string;
  password?: string | null;
  phone?: string | null;
  document?: string | null;
  birthday?: Date | null;
  height?: number | null;
  weight?: number | null;
  levelId?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientUserCreationAttributes
  extends Optional<
    ClientUserAttributes,
    | 'id'
    | 'password'
    | 'phone'
    | 'document'
    | 'birthday'
    | 'height'
    | 'weight'
    | 'levelId'
    | 'address'
    | 'city'
    | 'state'
    | 'zipCode'
    | 'active'
  > {}

class ClientUser
  extends Model<ClientUserAttributes, ClientUserCreationAttributes>
  implements ClientUserAttributes
{
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string | null;
  public phone!: string | null;
  public document!: string | null;
  public birthday!: Date | null;
  public height!: number | null;
  public weight!: number | null;
  public levelId!: number | null;
  public address!: string | null;
  public city!: string | null;
  public state!: string | null;
  public zipCode!: string | null;
  public active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default ClientUser;
