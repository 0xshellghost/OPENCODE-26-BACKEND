/*
  Warnings:

  - Added the required column `gender` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Repo` ADD COLUMN `isFirstYrOnly` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isGirlsOnly` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `gender` VARCHAR(191) NOT NULL,
    ADD COLUMN `year` VARCHAR(20) NOT NULL;
