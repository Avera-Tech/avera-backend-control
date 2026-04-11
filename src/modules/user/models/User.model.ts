import { Model, DataTypes, Optional } from 'sequelize';
import coreDB from '../../../config/database.core';

/**
 * Modelo de Cliente/Aluno — SEM login, perfil apenas.
 * Não confundir com src/core/users/models/User.model.ts (RBAC auth).
 */
interface ClientUserAttributes {
  id: number;
  name: string;
  email: string;
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

ClientUser.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    document: {
      type: DataTypes.STRING(14),
      allowNull: true,
      comment: 'CPF — formato 000.000.000-00',
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    height: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Altura em metros (ex: 1.75)',
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Peso em kg (ex: 70.50)',
    },
    levelId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'user_levels', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: coreDB,
    tableName: 'clients',
    timestamps: true,
    underscored: false,
    indexes: [{ unique: true, fields: ['email'] }],
  }
);

export default ClientUser;
