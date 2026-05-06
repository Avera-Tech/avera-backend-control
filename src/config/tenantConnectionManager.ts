import { Sequelize } from 'sequelize';
import { decrypt } from '../utils/crypto';
import { createTenantModels, TenantDb } from './tenantModels';

export type { TenantDb } from './tenantModels';

const pool = new Map<string, TenantDb>();

interface TenantConnConfig {
  clientId: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPass: string;
  dbName: string;
}

export function getTenantDb(config: TenantConnConfig): TenantDb {
  const cached = pool.get(config.clientId);
  if (cached) return cached;

  const plainPass = decrypt(config.dbPass);

  const sequelize = new Sequelize(config.dbName, config.dbUser, plainPass, {
    host: config.dbHost,
    port: config.dbPort,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    timezone: '-03:00',
    pool: { max: 5, min: 1, acquire: 30000, idle: 600000, evict: 60000 },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    retry: { max: 3 },
  });

  const db = createTenantModels(sequelize);
  // Cria tabelas novas e adiciona colunas faltantes (não destrói dados existentes)
  sequelize.sync({ alter: true }).catch((err) =>
    console.error(`[sync] Erro ao sincronizar tabelas para ${config.clientId}:`, err)
  );
  pool.set(config.clientId, db);
  return db;
}

export function evictTenant(clientId: string): void {
  const db = pool.get(clientId);
  if (db) {
    db.sequelize.close().catch(() => {});
    pool.delete(clientId);
  }
}
