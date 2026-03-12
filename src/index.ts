import app from './app';
import coreDB from './config/database.core';
import masterDB from './config/database.master';
import { setupAssociations } from './config/associations';

const PORT = process.env.PORT || 3000;

/**
 * Inicializa as conexões com os bancos de dados
 */
const initializeDatabases = async (): Promise<void> => {
  try {
    // Conectar ao banco Core
    await coreDB.authenticate();
    console.log('✅ Conexão com banco CORE estabelecida');

    // Conectar ao banco Master
    await masterDB.authenticate();
    console.log('✅ Conexão com banco MASTER estabelecida');

    // Configurar associações entre models
    setupAssociations();

    // Sincronizar modelos (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      // Sincronizar banco Core
      await coreDB.sync({ alter: false });
      console.log('✅ Modelos do banco CORE sincronizados');

      // Sincronizar banco Master
      await masterDB.sync({ alter: false });
      console.log('✅ Modelos do banco MASTER sincronizados');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar aos bancos de dados:', error);
    process.exit(1);
  }
};

/**
 * Inicia o servidor
 */
const startServer = async (): Promise<void> => {
  try {
    // Inicializar bancos de dados
    await initializeDatabases();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🚀 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ========================================');
      console.log('');
      console.log('📊 Bancos de Dados:');
      console.log(`   - CORE: ${process.env.DB_CORE_NAME} (Autenticação, RBAC)`);
      console.log(`   - MASTER: ${process.env.DB_MASTER_NAME} (Configurações, Temas)`);
      console.log('');
      console.log('🔗 Endpoints principais:');
      console.log(`   - Health: http://localhost:${PORT}/api/health`);
      console.log(`   - Login: POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   - Register: POST http://localhost:${PORT}/api/auth/register`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

/**
 * Tratamento de erros não capturados
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM recebido, encerrando gracefully...');
  
  await coreDB.close();
  await masterDB.close();
  
  process.exit(0);
});

// Iniciar aplicação
startServer();
