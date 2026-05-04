import app from './app';
import masterDB from './config/database.master';

const PORT = process.env.PORT || 3000;

const initializeDatabases = async (): Promise<void> => {
  try {
    await masterDB.authenticate();
    console.log('✅ Conexão com banco MASTER estabelecida');

    // Cria tabelas master que ainda não existem (nunca altera nem destrói)
    await masterDB.sync({ force: false, alter: false });
    console.log('✅ Modelos do banco MASTER sincronizados');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco MASTER:', error);
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    await initializeDatabases();

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🚀 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ========================================');
      console.log('');
      console.log('📊 Bancos de Dados:');
      console.log(`   - MASTER: ${process.env.DB_MASTER_NAME} (Configurações de tenant)`);
      console.log(`   - Tenant DBs: resolvidos dinamicamente via X-Client-Id`);
      console.log('');
      console.log('🔗 Endpoints principais:');
      console.log(`   - Health: http://localhost:${PORT}/api/health`);
      console.log(`   - Login:  POST http://localhost:${PORT}/api/auth/login`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM recebido, encerrando gracefully...');
  await masterDB.close();
  process.exit(0);
});

startServer();
