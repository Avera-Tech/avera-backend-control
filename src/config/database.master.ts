import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

/**
 * Conexão com o banco Master
 * Armazena: Configurações do sistema, Temas, Logos, Cores, Estilos, Funcionalidades
 */
const masterDB = new Sequelize(
  String(process.env.DB_MASTER_NAME),
  String(process.env.DB_MASTER_USER),
  String(process.env.DB_MASTER_PASS),
  {
    host: process.env.DB_MASTER_HOST,
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

export default masterDB;