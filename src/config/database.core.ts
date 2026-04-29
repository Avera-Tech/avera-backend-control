import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

/**
 * Conexão com o banco Core
 * Armazena: Usuários, Autenticação, RBAC (Roles, Permissions), Sessões
 */
const coreDB = new Sequelize(
  String(process.env.DB_CORE_NAME),
  String(process.env.DB_CORE_USER),
  String(process.env.DB_CORE_PASS),
  {
    host: process.env.DB_CORE_HOST,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    timezone: '-03:00',
    pool: {
      max: 5,
      min: 2,
      acquire: 30000,
      idle: 600000,
      evict: 60000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    retry: {
      max: 3
    }
  }
);

export default coreDB;