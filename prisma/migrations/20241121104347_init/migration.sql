-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NOT NULL,
    `college` VARCHAR(191) NOT NULL,
    `graduationYear` INTEGER NOT NULL,
    `branch` VARCHAR(191) NOT NULL,
    `degree` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NULL,
    `githubId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_discordId_key`(`discordId`),
    UNIQUE INDEX `User_githubId_key`(`githubId`),
    INDEX `User_githubId_idx`(`githubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Admin_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participant` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Participant_participantId_key`(`participantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `logoImageURL` VARCHAR(191) NULL,

    UNIQUE INDEX `Event_name_key`(`name`),
    INDEX `Event_creatorId_idx`(`creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coverImageURL` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `coverImageURL_url_key`(`url`),
    INDEX `coverImageURL_eventName_idx`(`eventName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaderboardEntry` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 0,
    `PRmerged` INTEGER NOT NULL DEFAULT 0,

    INDEX `LeaderboardEntry_eventName_idx`(`eventName`),
    UNIQUE INDEX `LeaderboardEntry_participantId_eventName_key`(`participantId`, `eventName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repo` (
    `id` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Repo_name_key`(`name`),
    INDEX `Repo_creatorId_idx`(`creatorId`),
    INDEX `Repo_eventName_idx`(`eventName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Issue` (
    `id` VARCHAR(191) NOT NULL,
    `repoName` VARCHAR(191) NOT NULL,
    `assigneeId` VARCHAR(191) NULL,
    `issueNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'ASSIGNED') NOT NULL DEFAULT 'OPEN',
    `openForAll` BOOLEAN NOT NULL DEFAULT false,
    `currentPoints` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Issue_assigneeId_idx`(`assigneeId`),
    UNIQUE INDEX `Issue_repoName_issueNumber_key`(`repoName`, `issueNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PR` (
    `id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `submitterId` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `prNumber` INTEGER NOT NULL,
    `points` INTEGER NOT NULL,
    `status` ENUM('MERGED', 'OPENED', 'REJECTED') NOT NULL DEFAULT 'OPENED',

    INDEX `PR_submitterId_idx`(`submitterId`),
    INDEX `PR_issueId_idx`(`issueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
