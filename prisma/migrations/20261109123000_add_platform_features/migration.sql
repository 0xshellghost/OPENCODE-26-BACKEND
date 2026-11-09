-- CreateTable
CREATE TABLE IF NOT EXISTS `platform_feature` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `showWinners` BOOLEAN NOT NULL DEFAULT true,
    `showMilestones` BOOLEAN NOT NULL DEFAULT true,
    `showLeaderboard` BOOLEAN NOT NULL DEFAULT true,
    `showRepositories` BOOLEAN NOT NULL DEFAULT true,
    `showRPlace` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `platform_feature` (`id`, `showWinners`, `showMilestones`, `showLeaderboard`, `showRepositories`, `showRPlace`)
VALUES (1, true, true, true, true, true);
