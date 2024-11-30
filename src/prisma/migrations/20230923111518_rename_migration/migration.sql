/*
  Warnings:

  - You are about to drop the column `assineeId` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `summiterId` on the `PR` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[assigneeId]` on the table `Issue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[submitterId]` on the table `PR` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `submitterId` to the `PR` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Issue_assineeId_key` ON `Issue`;

-- DropIndex
DROP INDEX `PR_summiterId_key` ON `PR`;

-- AlterTable
ALTER TABLE `Issue` RENAME COLUMN `assineeId` TO `assigneeId`;

-- AlterTable
ALTER TABLE `PR` RENAME COLUMN `summiterId` TO `submitterId`;

-- CreateIndex
CREATE UNIQUE INDEX `Issue_assigneeId_key` ON `Issue`(`assigneeId`);

-- CreateIndex
CREATE UNIQUE INDEX `PR_submitterId_key` ON `PR`(`submitterId`);
