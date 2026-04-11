-- =============================================================================
-- Migration: students → clients
-- Data: 2026-04-08
-- Descrição: Renomeia e reestrutura a tabela `students` para `clients`,
--            elimina campos de autenticação (password, emailVerified, lastLogin),
--            adiciona campos de perfil físico (height, weight, levelId, document),
--            atualiza FKs em student_credits e credit_transactions,
--            e cria a tabela user_levels.
-- =============================================================================
-- ATENÇÃO: Execute em ambiente de staging primeiro.
--          Faça backup antes de rodar em produção.
-- =============================================================================

START TRANSACTION;

-- -----------------------------------------------------------------------------
-- 1. Criar tabela user_levels
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_levels` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(50)  NOT NULL,
  `color`           VARCHAR(20)      NULL COMMENT 'Cor hex para o frontend (ex: #FF5733)',
  `numberOfClasses` INT              NULL COMMENT 'Número de aulas para atingir este nível',
  `active`          TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Criar tabela clients (estrutura nova, sem campos de auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clients` (
  `id`        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(100)  NOT NULL,
  `email`     VARCHAR(150)  NOT NULL,
  `phone`     VARCHAR(20)       NULL,
  `document`  VARCHAR(14)       NULL COMMENT 'CPF — formato 000.000.000-00',
  `birthday`  DATE              NULL,
  `height`    DECIMAL(5,2)      NULL COMMENT 'Altura em metros',
  `weight`    DECIMAL(5,2)      NULL COMMENT 'Peso em kg',
  `levelId`   INT UNSIGNED      NULL,
  `address`   VARCHAR(200)      NULL,
  `city`      VARCHAR(100)      NULL,
  `state`     VARCHAR(2)        NULL,
  `zipCode`   VARCHAR(10)       NULL,
  `active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `createdAt` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_clients_email` (`email`),
  CONSTRAINT `fk_clients_level`
    FOREIGN KEY (`levelId`) REFERENCES `user_levels` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Migrar dados de students → clients
--    Mapeia campos compatíveis; campos sem equivalente ficam NULL.
-- -----------------------------------------------------------------------------
INSERT INTO `clients`
  (`id`, `name`, `email`, `phone`, `document`, `birthday`,
   `address`, `city`, `state`, `zipCode`, `active`, `createdAt`, `updatedAt`)
SELECT
  `id`,
  `name`,
  `email`,
  `phone`,
  `cpf`      AS `document`,
  `birthday`,
  `address`,
  `city`,
  `state`,
  `zipCode`,
  `active`,
  `createdAt`,
  `updatedAt`
FROM `students`;

-- -----------------------------------------------------------------------------
-- 4. Adicionar coluna clientId em student_credits
-- -----------------------------------------------------------------------------
ALTER TABLE `student_credits`
  ADD COLUMN `clientId` INT UNSIGNED NULL
    COMMENT 'FK para clients — substitui studentId'
    AFTER `id`;

-- 4a. Preencher clientId com o mesmo valor de studentId
UPDATE `student_credits` SET `clientId` = `studentId`;

-- 4b. Tornar clientId NOT NULL e adicionar FK
ALTER TABLE `student_credits`
  MODIFY COLUMN `clientId` INT UNSIGNED NOT NULL,
  ADD CONSTRAINT `fk_student_credits_client`
    FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD INDEX `idx_student_credits_client_id` (`clientId`),
  DROP INDEX  `idx_student_credits_student_id`,
  DROP INDEX  `idx_student_credits_fefo`;

-- 4c. Recriar índice composto com clientId
ALTER TABLE `student_credits`
  ADD INDEX `idx_student_credits_fefo` (`clientId`, `status`, `expiresAt`);

-- 4d. Remover FK antiga de studentId → students
ALTER TABLE `student_credits`
  DROP FOREIGN KEY `student_credits_ibfk_1`;   -- ajuste o nome conforme SHOW CREATE TABLE

-- 4e. Remover coluna studentId
ALTER TABLE `student_credits`
  DROP COLUMN `studentId`;

-- -----------------------------------------------------------------------------
-- 5. Adicionar coluna clientId em credit_transactions
-- -----------------------------------------------------------------------------
ALTER TABLE `credit_transactions`
  ADD COLUMN `clientId` INT UNSIGNED NULL
    COMMENT 'FK para clients — substitui studentId'
    AFTER `studentCreditId`;

-- 5a. Preencher clientId
UPDATE `credit_transactions` SET `clientId` = `studentId`;

-- 5b. Tornar clientId NOT NULL e adicionar FK
ALTER TABLE `credit_transactions`
  MODIFY COLUMN `clientId` INT UNSIGNED NOT NULL,
  ADD CONSTRAINT `fk_credit_transactions_client`
    FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD INDEX `idx_credit_transactions_client_id` (`clientId`),
  DROP INDEX  `idx_credit_transactions_student_id`;

-- 5c. Remover FK antiga de studentId → students
ALTER TABLE `credit_transactions`
  DROP FOREIGN KEY `credit_transactions_ibfk_2`;  -- ajuste o nome conforme SHOW CREATE TABLE

-- 5d. Remover coluna studentId
ALTER TABLE `credit_transactions`
  DROP COLUMN `studentId`;

-- -----------------------------------------------------------------------------
-- 6. Dropar tabela students (apenas após verificar integridade dos dados)
-- -----------------------------------------------------------------------------
-- Descomente a linha abaixo APENAS após validar que todos os dados foram
-- migrados corretamente e que não há mais FKs apontando para students.
-- DROP TABLE IF EXISTS `students`;

COMMIT;

-- =============================================================================
-- Rollback manual (caso necessário — execute fora de transaction):
--
-- ALTER TABLE `student_credits` ADD COLUMN `studentId` INT UNSIGNED NOT NULL AFTER `id`;
-- UPDATE `student_credits` SET `studentId` = `clientId`;
-- ALTER TABLE `credit_transactions` ADD COLUMN `studentId` INT UNSIGNED NOT NULL AFTER `studentCreditId`;
-- UPDATE `credit_transactions` SET `studentId` = `clientId`;
-- ALTER TABLE `student_credits` DROP COLUMN `clientId`;
-- ALTER TABLE `credit_transactions` DROP COLUMN `clientId`;
-- DROP TABLE IF EXISTS `clients`;
-- DROP TABLE IF EXISTS `user_levels`;
-- =============================================================================
