# Guia de Deployment

## 📋 Pré-requisitos

- Node.js 18+ instalado
- MySQL 8+ instalado
- PM2 (para produção)
- Nginx (opcional, para proxy reverso)

## 🚀 Deploy em Produção

### 1. Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar MySQL
sudo apt install -y mysql-server

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx (opcional)
sudo apt install -y nginx
```

### 2. Configurar MySQL

```bash
# Acessar MySQL
sudo mysql

# Criar bancos de dados
CREATE DATABASE core_db;
CREATE DATABASE master_db;

# Criar usuário
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'senha_forte_aqui';

# Conceder permissões
GRANT ALL PRIVILEGES ON core_db.* TO 'app_user'@'localhost';
GRANT ALL PRIVILEGES ON master_db.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;

# Sair
EXIT;

# Executar script de inicialização
mysql -u app_user -p < init-databases.sql
```

### 3. Clonar e Configurar Aplicação

```bash
# Criar diretório
sudo mkdir -p /var/www/backend-node
cd /var/www/backend-node

# Clonar repositório (exemplo com Git)
git clone <seu-repositorio> .

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
nano .env
```

### 4. Configurar .env de Produção

```env
NODE_ENV=production
PORT=3000

JWT_SECRET=use-um-secret-muito-forte-e-aleatorio-aqui
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

DB_MASTER_HOST=localhost
DB_MASTER_PORT=3306
DB_MASTER_NAME=master_db
DB_MASTER_USER=app_user
DB_MASTER_PASS=senha_forte_aqui

DB_CORE_HOST=localhost
DB_CORE_PORT=3306
DB_CORE_NAME=core_db
DB_CORE_USER=app_user
DB_CORE_PASS=senha_forte_aqui

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
```

### 5. Build e Iniciar com PM2

```bash
# Build do TypeScript
npm run build

# Iniciar com PM2
pm2 start dist/index.js --name backend-node

# Configurar auto-restart
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs backend-node
```

### 6. Configurar Nginx (Proxy Reverso)

```bash
# Criar configuração
sudo nano /etc/nginx/sites-available/backend-node
```

Adicione:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/backend-node /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 7. SSL com Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo certbot renew --dry-run
```

## 🔄 Atualizações

```bash
# Parar aplicação
pm2 stop backend-node

# Atualizar código
git pull origin main

# Reinstalar dependências
npm install

# Rebuild
npm run build

# Reiniciar
pm2 restart backend-node

# Verificar logs
pm2 logs backend-node
```

## 📊 Monitoramento com PM2

```bash
# Monitorar em tempo real
pm2 monit

# Ver logs
pm2 logs backend-node

# Ver logs de erros
pm2 logs backend-node --err

# Limpar logs
pm2 flush
```

## 🔒 Segurança

### Firewall

```bash
# Ativar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22

# Permitir HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Verificar status
sudo ufw status
```

### Permissões de Arquivos

```bash
# Dono correto
sudo chown -R $USER:$USER /var/www/backend-node

# Permissões seguras
chmod -R 755 /var/www/backend-node
```

## 🗄️ Backup

### Backup dos Bancos de Dados

```bash
# Criar script de backup
nano /home/user/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"

mkdir -p $BACKUP_DIR

mysqldump -u app_user -p'senha' core_db > $BACKUP_DIR/core_db_$DATE.sql
mysqldump -u app_user -p'senha' master_db > $BACKUP_DIR/master_db_$DATE.sql

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
# Tornar executável
chmod +x /home/user/backup-db.sh

# Agendar no crontab (todo dia às 2h da manhã)
crontab -e
```

Adicione:
```
0 2 * * * /home/user/backup-db.sh
```

## 📈 Logs

### Configurar Log Rotation

```bash
sudo nano /etc/logrotate.d/backend-node
```

```
/home/user/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 user user
    sharedscripts
}
```

## 🧪 Health Checks

```bash
# Verificar se API está respondendo
curl http://localhost:3000/api/health

# Com detalhes
curl -i http://localhost:3000/api/health
```

## 🐳 Deploy com Docker (Opcional)

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: core_db
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

```bash
# Build e start
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## 📝 Checklist de Deploy

- [ ] Servidor configurado
- [ ] MySQL instalado e configurado
- [ ] Bancos de dados criados
- [ ] Script de inicialização executado
- [ ] Código clonado
- [ ] Dependências instaladas
- [ ] .env configurado
- [ ] Build executado
- [ ] PM2 configurado
- [ ] Nginx configurado (se usar)
- [ ] SSL configurado (se usar)
- [ ] Firewall configurado
- [ ] Backup agendado
- [ ] Health check testado
- [ ] Monitoramento ativo

## 🆘 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs detalhados
pm2 logs backend-node --lines 100

# Verificar processo
pm2 describe backend-node

# Reiniciar
pm2 restart backend-node
```

### Erro de conexão com MySQL

```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Testar conexão
mysql -u app_user -p -h localhost

# Ver logs do MySQL
sudo tail -f /var/log/mysql/error.log
```

### Alto uso de memória

```bash
# Ver uso de recursos
pm2 monit

# Limitar memória do PM2
pm2 restart backend-node --max-memory-restart 500M
```
