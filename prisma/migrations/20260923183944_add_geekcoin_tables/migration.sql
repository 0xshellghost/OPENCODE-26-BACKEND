-- CreateTable
CREATE TABLE `gc_wallet` (
    `id` VARCHAR(191) NOT NULL,
    `githubId` VARCHAR(191) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `gc_wallet_githubId_key`(`githubId`),
    INDEX `gc_wallet_githubId_idx`(`githubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gc_transaction` (
    `id` VARCHAR(191) NOT NULL,
    `wallet_id` VARCHAR(191) NOT NULL,
    `github_id` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `event_name` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gc_transaction_wallet_id_idx`(`wallet_id`),
    INDEX `gc_transaction_github_id_idx`(`github_id`),
    INDEX `gc_transaction_event_name_idx`(`event_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
