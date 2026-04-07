-- ============================================
-- SCRIPT DE INICIALIZAÇÃO DOS BANCOS DE DADOS
-- Backend Node.js - Multi-Database + RBAC
-- ============================================

-- ============================================
-- BANCO DE DADOS CORE
-- ============================================

USE core_db;

-- Tabela: users
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    emailVerified BOOLEAN NOT NULL DEFAULT FALSE,
    lastLogin DATETIME NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: roles
CREATE TABLE IF NOT EXISTS roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador único (ex: admin, manager, user)',
    description TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: permissions
CREATE TABLE IF NOT EXISTS permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'Formato: resource:action (ex: users:create)',
    resource VARCHAR(50) NOT NULL COMMENT 'Recurso (ex: users, products, reports)',
    action VARCHAR(50) NOT NULL COMMENT 'Ação (ex: create, read, update, delete)',
    description TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_resource (resource),
    INDEX idx_action (action),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    userId INT UNSIGNED NOT NULL,
    roleId INT UNSIGNED NOT NULL,
    assignedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assignedBy INT UNSIGNED NULL COMMENT 'ID do usuário que atribuiu',
    expiresAt DATETIME NULL COMMENT 'Data de expiração (opcional)',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_user_role (userId, roleId),
    INDEX idx_userId (userId),
    INDEX idx_roleId (roleId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    roleId INT UNSIGNED NOT NULL,
    permissionId INT UNSIGNED NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_role_permission (roleId, permissionId),
    INDEX idx_roleId (roleId),
    INDEX idx_permissionId (permissionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DADOS DE EXEMPLO - ROLES
-- ============================================

INSERT INTO roles (name, slug, description, active) VALUES
('Administrador', 'admin', 'Acesso total ao sistema', TRUE),
('Gerente', 'manager', 'Acesso de gerenciamento', TRUE),
('Usuário', 'user', 'Acesso básico', TRUE),
('Visitante', 'guest', 'Apenas leitura', TRUE);

-- ============================================
-- DADOS DE EXEMPLO - PERMISSIONS
-- ============================================

INSERT INTO permissions (name, slug, resource, action, description, active) VALUES
-- Usuários
('Criar Usuário', 'users:create', 'users', 'create', 'Criar novos usuários', TRUE),
('Visualizar Usuário', 'users:read', 'users', 'read', 'Visualizar dados de usuários', TRUE),
('Atualizar Usuário', 'users:update', 'users', 'update', 'Atualizar dados de usuários', TRUE),
('Deletar Usuário', 'users:delete', 'users', 'delete', 'Deletar usuários', TRUE),
('Listar Usuários', 'users:list', 'users', 'list', 'Listar todos os usuários', TRUE),

-- Staff
('Listar staff', 'staff:list', 'staff', 'list', 'Listar perfis de funcionários', TRUE),
('Visualizar staff', 'staff:read', 'staff', 'read', 'Ver dados de funcionário', TRUE),
('Criar staff', 'staff:create', 'staff', 'create', 'Cadastrar funcionário', TRUE),
('Editar staff', 'staff:update', 'staff', 'update', 'Atualizar funcionário', TRUE),
('Deletar staff', 'staff:delete', 'staff', 'delete', 'Remover perfil de funcionário', TRUE),

-- Relatórios
('Visualizar Relatório', 'reports:read', 'reports', 'read', 'Visualizar relatórios', TRUE),
('Criar Relatório', 'reports:create', 'reports', 'create', 'Criar relatórios', TRUE),
('Exportar Relatório', 'reports:export', 'reports', 'export', 'Exportar relatórios', TRUE),

-- Configurações
('Gerenciar Configurações', 'settings:manage', 'settings', 'manage', 'Gerenciar configurações do sistema', TRUE),

-- Dashboard
('Visualizar Dashboard', 'dashboard:view', 'dashboard', 'view', 'Visualizar dashboard', TRUE);

-- ============================================
-- RELACIONAMENTOS ROLE-PERMISSION
-- ============================================

-- Admin: Todas as permissões
INSERT INTO role_permissions (roleId, permissionId)
SELECT 1, id FROM permissions WHERE active = TRUE;

-- Manager: Permissões moderadas
INSERT INTO role_permissions (roleId, permissionId)
SELECT 2, id FROM permissions WHERE slug IN (
    'users:read', 'users:list', 'users:update',
    'staff:list', 'staff:read', 'staff:create', 'staff:update',
    'reports:read', 'reports:create', 'reports:export',
    'dashboard:view'
);

-- User: Permissões básicas
INSERT INTO role_permissions (roleId, permissionId)
SELECT 3, id FROM permissions WHERE slug IN (
    'users:read',
    'staff:list', 'staff:read',
    'reports:read',
    'dashboard:view'
);

-- Guest: Apenas leitura
INSERT INTO role_permissions (roleId, permissionId)
SELECT 4, id FROM permissions WHERE slug IN (
    'dashboard:view'
);

-- ============================================
-- BANCO DE DADOS MASTER
-- ============================================

USE master_db;

-- Tabela: app_configs
CREATE TABLE IF NOT EXISTS app_configs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Chave única (ex: app_name, primary_color)',
    value TEXT NOT NULL COMMENT 'Valor (pode ser JSON)',
    type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
    category VARCHAR(50) NOT NULL COMMENT 'Categoria (ex: theme, features, general)',
    description TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    INDEX idx_category (category),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: themes
CREATE TABLE IF NOT EXISTS themes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    primaryColor VARCHAR(7) NOT NULL DEFAULT '#007bff',
    secondaryColor VARCHAR(7) NOT NULL DEFAULT '#6c757d',
    accentColor VARCHAR(7) NOT NULL DEFAULT '#28a745',
    backgroundColor VARCHAR(7) NOT NULL DEFAULT '#ffffff',
    textColor VARCHAR(7) NOT NULL DEFAULT '#212529',
    logo VARCHAR(255) NULL COMMENT 'URL ou caminho do logo',
    favicon VARCHAR(255) NULL COMMENT 'URL ou caminho do favicon',
    customCSS TEXT NULL COMMENT 'CSS customizado',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    isDefault BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Apenas um tema pode ser padrão',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (active),
    INDEX idx_isDefault (isDefault)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: features
CREATE TABLE IF NOT EXISTS features (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'Identificador (ex: user_management, analytics)',
    description TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Se a feature está habilitada',
    category VARCHAR(50) NOT NULL COMMENT 'Categoria (ex: core, addon, integration)',
    config TEXT NULL COMMENT 'Configurações JSON específicas',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_category (category),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DADOS DE EXEMPLO - APP_CONFIGS
-- ============================================

INSERT INTO app_configs (`key`, value, type, category, description, active) VALUES
('app_name', 'Minha Aplicação', 'string', 'general', 'Nome da aplicação', TRUE),
('app_version', '1.0.0', 'string', 'general', 'Versão da aplicação', TRUE),
('maintenance_mode', 'false', 'boolean', 'general', 'Modo manutenção', TRUE),
('primary_color', '#007bff', 'string', 'theme', 'Cor primária do tema', TRUE),
('secondary_color', '#6c757d', 'string', 'theme', 'Cor secundária do tema', TRUE);

-- ============================================
-- DADOS DE EXEMPLO - THEMES
-- ============================================

INSERT INTO themes (name, primaryColor, secondaryColor, accentColor, backgroundColor, textColor, active, isDefault) VALUES
('Tema Padrão', '#007bff', '#6c757d', '#28a745', '#ffffff', '#212529', TRUE, TRUE),
('Tema Escuro', '#1a73e8', '#5f6368', '#34a853', '#202124', '#e8eaed', TRUE, FALSE);

-- ============================================
-- DADOS DE EXEMPLO - FEATURES
-- ============================================

INSERT INTO features (name, slug, description, enabled, category, config) VALUES
('Gerenciamento de Usuários', 'user_management', 'CRUD completo de usuários', TRUE, 'core', NULL),
('Relatórios', 'reports', 'Geração de relatórios', TRUE, 'core', NULL),
('Analytics', 'analytics', 'Análise de dados e métricas', FALSE, 'addon', NULL),
('Notificações Push', 'push_notifications', 'Envio de notificações push', TRUE, 'integration', '{"provider": "firebase"}');

-- ============================================
-- FIM DO SCRIPT
-- ============================================
