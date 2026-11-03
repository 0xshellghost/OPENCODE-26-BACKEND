-- AlterTable
ALTER TABLE `gc_transaction`
    ADD UNIQUE INDEX `gc_transaction_idempotency_key_key`(`idempotency_key`);

-- CreateTable
CREATE TABLE `gc_store_item` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL DEFAULT 'Merchandise',
    `price` INTEGER NOT NULL,
    `cash_price` INTEGER NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `gc_store_item_name_key`(`name`),
    INDEX `gc_store_item_is_active_deleted_at_idx`(`is_active`, `deleted_at`),
    INDEX `gc_store_item_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gc_order` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `github_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` INTEGER NOT NULL,
    `total_price` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GC',
    `payment_method` ENUM('GEEKCOIN', 'RAZORPAY', 'STRIPE', 'OTHER') NOT NULL DEFAULT 'GEEKCOIN',
    `payment_status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `gateway_order_id` VARCHAR(191) NULL,
    `gateway_payment_id` VARCHAR(191) NULL,
    `status` ENUM('PLACED', 'APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PLACED',
    `shipping_address` TEXT NULL,
    `contact_number` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `user_note` TEXT NULL,
    `admin_note` TEXT NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gc_order_github_id_createdAt_idx`(`github_id`, `createdAt`),
    INDEX `gc_order_item_id_idx`(`item_id`),
    INDEX `gc_order_status_idx`(`status`),
    INDEX `gc_order_payment_status_idx`(`payment_status`),
    UNIQUE INDEX `gc_order_idempotency_key_key`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
