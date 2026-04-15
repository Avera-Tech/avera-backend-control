-- =============================================================================
-- Migration: create places + product_type_places
-- Data: 2026-04-14
-- Descrição: Cria a tabela de locais físicos (unidades) e a tabela de junção
--            entre tipos de produto e locais (many-to-many).
-- =============================================================================

START TRANSACTION;

-- -----------------------------------------------------------------------------
-- 1. Criar tabela places
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `places` (
  `id`        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(100)  NOT NULL COMMENT 'Nome da unidade/local físico',
  `address`   VARCHAR(200)      NULL COMMENT 'Endereço completo do local',
  `active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `createdAt` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_places_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Criar tabela de junção product_type_places
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_type_places` (
  `productTypeId` INT UNSIGNED NOT NULL,
  `placeId`       INT UNSIGNED NOT NULL,
  PRIMARY KEY (`productTypeId`, `placeId`),
  CONSTRAINT `fk_ptp_product_type`
    FOREIGN KEY (`productTypeId`) REFERENCES `product_types` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ptp_place`
    FOREIGN KEY (`placeId`) REFERENCES `places` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Inserir permissões de places no master DB (ajuste o DB conforme ambiente)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `permissions` (`name`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('places:list',   'Listar locais',          NOW(), NOW()),
  ('places:create', 'Cadastrar locais',        NOW(), NOW()),
  ('places:update', 'Atualizar locais',        NOW(), NOW());

COMMIT;

-- =============================================================================
-- Rollback:
-- DELETE FROM `permissions` WHERE `name` IN ('places:list','places:create','places:update');
-- DROP TABLE IF EXISTS `product_type_places`;
-- DROP TABLE IF EXISTS `places`;
-- =============================================================================
