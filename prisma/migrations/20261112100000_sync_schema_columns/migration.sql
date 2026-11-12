-- These fields existed in the Prisma schema but were missing from the migration history.
-- The information_schema guards keep this safe for databases where they were added manually.
SET @statement = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'isMentor') = 0,
    'ALTER TABLE `User` ADD COLUMN `isMentor` BOOLEAN NOT NULL DEFAULT false',
    'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Event' AND COLUMN_NAME = 'isFlagship') = 0,
    'ALTER TABLE `Event` ADD COLUMN `isFlagship` BOOLEAN NOT NULL DEFAULT false',
    'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Repo' AND COLUMN_NAME = 'language') = 0,
    'ALTER TABLE `Repo` ADD COLUMN `language` VARCHAR(100) NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Repo' AND COLUMN_NAME = 'mentors') = 0,
    'ALTER TABLE `Repo` ADD COLUMN `mentors` TEXT NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Repo' AND COLUMN_NAME = 'tags') = 0,
    'ALTER TABLE `Repo` ADD COLUMN `tags` TEXT NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
