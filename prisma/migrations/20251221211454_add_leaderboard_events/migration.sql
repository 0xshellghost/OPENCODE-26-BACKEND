/*
  Warnings:

  - You are about to alter the column `gender` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `gender` VARCHAR(20) NOT NULL DEFAULT 'male';

-- CreateTable
CREATE TABLE `LeaderboardEvent` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `type` ENUM('PR_MERGED', 'ISSUE_COMPLETED', 'BONUS', 'PENALTY', 'MANUAL_ADJUSTMENT') NOT NULL,
    `pointsDelta` INTEGER NOT NULL,
    `prId` BIGINT NULL,
    `issueId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaderboardEvent_participantId_createdAt_idx`(`participantId`, `createdAt`),
    INDEX `LeaderboardEvent_eventName_createdAt_idx`(`eventName`, `createdAt`),
    INDEX `LeaderboardEvent_participantId_eventName_idx`(`participantId`, `eventName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
