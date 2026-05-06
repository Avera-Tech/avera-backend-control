import { DataTypes, Model, Optional } from 'sequelize';
import masterDB from '../../config/database.master';

interface CompanyAddressAttributes {
  id:           number;
  slug:         string;
  zip_code:     string;
  street:       string;
  number:       string;
  complement?:  string;
  neighborhood: string;
  city:         string;
  state:        string;
  createdAt?:   Date;
  updatedAt?:   Date;
}

type CompanyAddressCreationAttributes = Optional<
  CompanyAddressAttributes,
  'id' | 'complement'
>;

class CompanyAddress
  extends Model<CompanyAddressAttributes, CompanyAddressCreationAttributes>
  implements CompanyAddressAttributes
{
  declare id:           number;
  declare slug:         string;
  declare zip_code:     string;
  declare street:       string;
  declare number:       string;
  declare complement:   string;
  declare neighborhood: string;
  declare city:         string;
  declare state:        string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CompanyAddress.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug:         { type: DataTypes.STRING(100), allowNull: false, unique: true },
    zip_code:     { type: DataTypes.STRING(9),   allowNull: false },
    street:       { type: DataTypes.STRING(200), allowNull: false },
    number:       { type: DataTypes.STRING(20),  allowNull: false },
    complement:   { type: DataTypes.STRING(100), allowNull: true  },
    neighborhood: { type: DataTypes.STRING(100), allowNull: false },
    city:         { type: DataTypes.STRING(120), allowNull: false },
    state:        { type: DataTypes.STRING(2),   allowNull: false },
  },
  {
    sequelize: masterDB,
    tableName: 'company_addresses',
    timestamps: true,
  }
);

export default CompanyAddress;
