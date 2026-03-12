# Backend Node.js - Multi-Database com RBAC

Backend moderno em Node.js + TypeScript com arquitetura multi-database (Master + Core) e sistema RBAC completo.

## 🏗️ Arquitetura

### Banco de Dados Master
Armazena configurações da aplicação:
- ✅ Configurações gerais (`app_configs`)
- 🎨 Temas visuais (`themes`)
- 🔌 Funcionalidades disponíveis (`features`)
- 🎨 Cores, logos, estilos customizados

### Banco de Dados Core
Gerencia autenticação e controle de acesso:
- 👤 Usuários (`users`)
- 🔐 Autenticação JWT
- 🛡️ RBAC (Role-Based Access Control)
  - Roles (`roles`)
  - Permissions (`permissions`)
  - Relação User-Role (`user_roles`)
  - Relação Role-Permission (`role_permissions`)

## 🚀 Tecnologias

- **Node.js** 18+
- **TypeScript** 5.x
- **Express** - Framework web
- **Sequelize** - ORM para MySQL
- **MySQL** - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Joi** - Validação de dados
- **Helmet** - Segurança HTTP
- **Rate Limiting** - Proteção contra abuso

## 📦 Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 3. Criar os bancos de dados
mysql -u root -p
CREATE DATABASE master_db;
CREATE DATABASE core_db;

# 4. Rodar em desenvolvimento
npm run dev

# 5. Build para produção
npm run build
npm start
```

## 🔧 Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database Master
DB_MASTER_HOST=localhost
DB_MASTER_PORT=3306
DB_MASTER_NAME=master_db
DB_MASTER_USER=root
DB_MASTER_PASS=password

# Database Core
DB_CORE_HOST=localhost
DB_CORE_PORT=3306
DB_CORE_NAME=core_db
DB_CORE_USER=root
DB_CORE_PASS=password
```

## 📚 Endpoints da API

### Autenticação

#### POST /api/auth/register
Registra novo usuário

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "Senha@123"
}
```

**Resposta:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com"
  }
}
```

#### POST /api/auth/login
Realiza login

**Body:**
```json
{
  "email": "joao@example.com",
  "password": "Senha@123"
}
```

**Resposta:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com"
  }
}
```

#### POST /api/auth/refresh
Renova o token de autenticação

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/auth/me
Retorna dados do usuário autenticado

**Headers:**
```
Authorization: Bearer {token}
```

## 🛡️ Sistema RBAC

### Uso de Middlewares

#### Verificar Permissões
```typescript
import { authenticateToken } from './core/middleware/authenticateToken';
import { checkPermissions } from './core/middleware/checkPermissions';

// Usuário precisa ter permissão 'users:create'
router.post('/users', 
  authenticateToken, 
  checkPermissions(['users:create']), 
  createUser
);

// Usuário precisa ter PELO MENOS UMA das permissões
router.get('/reports', 
  authenticateToken, 
  checkPermissions(['reports:read', 'reports:export'], false), 
  getReports
);
```

#### Verificar Roles
```typescript
import { checkRoles } from './core/middleware/checkPermissions';

// Apenas administradores
router.delete('/users/:id', 
  authenticateToken, 
  checkRoles(['admin']), 
  deleteUser
);

// Admin OU Manager
router.get('/dashboard', 
  authenticateToken, 
  checkRoles(['admin', 'manager'], false), 
  getDashboard
);
```

### Exemplos de Permissões

```
users:create      - Criar usuários
users:read        - Visualizar usuários
users:update      - Atualizar usuários
users:delete      - Deletar usuários
users:list        - Listar usuários

reports:read      - Visualizar relatórios
reports:create    - Criar relatórios
reports:export    - Exportar relatórios

products:manage   - Gerenciar produtos
orders:manage     - Gerenciar pedidos
```

### Exemplos de Roles

```
admin             - Administrador (todas as permissões)
manager           - Gerente (permissões moderadas)
user              - Usuário comum (permissões básicas)
guest             - Visitante (apenas leitura)
```

## 📁 Estrutura do Projeto

```
backend-node/
├── src/
│   ├── config/              # Configurações
│   │   ├── database.core.ts
│   │   └── database.master.ts
│   ├── core/                # Módulo Core
│   │   ├── auth/            # Autenticação
│   │   │   ├── models/
│   │   │   ├── controllers/
│   │   │   └── services/
│   │   ├── rbac/            # RBAC
│   │   │   └── models/
│   │   └── middleware/      # Middlewares
│   ├── master/              # Módulo Master
│   │   ├── models/
│   │   ├── controllers/
│   │   └── services/
│   ├── shared/              # Compartilhado
│   │   ├── types/
│   │   ├── utils/
│   │   └── validators/
│   ├── routes/              # Rotas
│   ├── app.ts               # Aplicação Express
│   └── index.ts             # Entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Segurança

- ✅ JWT para autenticação stateless
- ✅ Bcrypt para hash de senhas (10 rounds)
- ✅ Helmet para proteção de headers
- ✅ Rate limiting (100 req/15min por IP)
- ✅ CORS configurável
- ✅ Validação de dados com Joi
- ✅ Sanitização de inputs
- ✅ RBAC granular

## 🧪 Testes

```bash
npm test
```

## 📝 License

MIT
