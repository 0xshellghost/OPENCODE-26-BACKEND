import prisma from '../config/db.config.js';
import {
    response_200,
    response_201,
    response_400,
    response_403,
    response_404,
    response_500
} from '../utils/responseCodes.js';

const ORDER_STATUS = {
    PLACED: 'PLACED',
    APPROVED: 'APPROVED',
    FULFILLED: 'FULFILLED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED'
};

const PAYMENT_METHOD = {
    GEEKCOIN: 'GEEKCOIN',
    RAZORPAY: 'RAZORPAY',
    STRIPE: 'STRIPE',
    OTHER: 'OTHER'
};

const PAYMENT_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
};

const parsePositiveInt = (value, name, max = 2147483647) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    if (num > max) {
        throw new Error(`${name} exceeds maximum limit of ${max}`);
    }
    return num;
};

const parseNonNegativeInt = (value, name, max = 2147483647) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
        throw new Error(`${name} must be a non-negative integer`);
    }
    if (num > max) {
        throw new Error(`${name} exceeds maximum limit of ${max}`);
    }
    return num;
};

const paginate = (req, defaultLimit = 20, maxLimit = 100) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
        maxLimit,
        Math.max(1, parseInt(req.query.limit, 10) || defaultLimit)
    );
    return { page, limit, skip: (page - 1) * limit };
};

// --- Store Catalog & Details ---

export const listGeekstoreItems = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req, 40, 100);
        const { category, search, inStockOnly } = req.query;

        const where = {
            isActive: true,
            deletedAt: null,
            ...(inStockOnly === 'true' && { stock: { gt: 0 } }),
            ...(category && { category: String(category).trim() }),
            ...(search && {
                OR: [
                    { name: { contains: String(search).trim() } },
                    { description: { contains: String(search).trim() } }
                ]
            })
        };

        const [total, items] = await Promise.all([
            prisma.gCStoreItem.count({ where }),
            prisma.gCStoreItem.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    imageUrl: true,
                    category: true,
                    price: true,
                    cashPrice: true,
                    stock: true,
                    isActive: true,
                    createdAt: true
                },
                orderBy: [{ price: 'asc' }, { createdAt: 'desc' }],
                skip,
                take: limit
            })
        ]);

        return response_200(res, 'Geekstore items fetched successfully', {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return response_500(res, 'Failed to fetch items', error);
    }
};

export const getGeekstoreItemById = async (req, res) => {
    try {
        const { itemId } = req.params;

        const item = await prisma.gCStoreItem.findFirst({
            where: {
                id: itemId,
                isActive: true,
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                category: true,
                price: true,
                cashPrice: true,
                stock: true,
                isActive: true,
                createdAt: true
            }
        });

        if (!item) {
            return response_404(res, 'Item not found');
        }

        return response_200(res, 'Item fetched successfully', item);
    } catch (error) {
        return response_500(res, 'Failed to fetch item', error);
    }
};

// User Redemptions & Orders

export const redeemGeekstoreItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const githubId = req.user.id;

        let quantity = 1;
        try {
            quantity = parsePositiveInt(req.body.quantity || 1, 'quantity', 10);
        } catch (err) {
            return response_400(res, err.message);
        }

        const shippingAddress = req.body.shippingAddress?.trim()?.slice(0, 1000) || null;
        const contactNumber = req.body.contactNumber?.trim()?.slice(0, 30) || null;
        const size = req.body.size?.trim()?.slice(0, 20) || null;
        const userNote = req.body.userNote?.trim()?.slice(0, 500) || null;

        const rawIdempotency = req.headers['x-idempotency-key'];
        const idempotencyKey = typeof rawIdempotency === 'string' && rawIdempotency.trim()
            ? rawIdempotency.trim()
            : null;

        if (idempotencyKey) {
            const existingOrder = await prisma.gCOrder.findUnique({
                where: { idempotencyKey },
                include: { item: true }
            });

            if (existingOrder) {
                if (existingOrder.githubId !== githubId) {
                    return response_403(res, 'Idempotency key belongs to another user');
                }
                return response_200(res, 'Order already placed', existingOrder);
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.gCStoreItem.findFirst({
                where: {
                    id: itemId,
                    isActive: true,
                    deletedAt: null
                }
            });

            if (!item) {
                throw new Error('ITEM_NOT_FOUND');
            }

            const totalPrice = item.price * quantity;

            // Conditional decrement to prevent overselling
            const stockUpdate = await tx.gCStoreItem.updateMany({
                where: {
                    id: item.id,
                    stock: { gte: quantity },
                    isActive: true,
                    deletedAt: null
                },
                data: {
                    stock: { decrement: quantity }
                }
            });

            if (!stockUpdate.count) {
                throw new Error('OUT_OF_STOCK');
            }

            const wallet = await tx.gC_Wallet.upsert({
                where: { githubId },
                update: {},
                create: { githubId, balance: 0 }
            });

            // Conditional decrement to prevent double spending
            const walletUpdate = await tx.gC_Wallet.updateMany({
                where: {
                    id: wallet.id,
                    balance: { gte: totalPrice }
                },
                data: {
                    balance: { decrement: totalPrice }
                }
            });

            if (!walletUpdate.count) {
                throw new Error('INSUFFICIENT_COINS');
            }

            const txKey = idempotencyKey
                ? `tx-${idempotencyKey}`
                : `tx-order-${githubId}-${item.id}-${Date.now()}`;

            await tx.gC_Transaction.create({
                data: {
                    walletId: wallet.id,
                    githubId,
                    amount: -totalPrice,
                    eventName: null,
                    idempotencyKey: txKey
                }
            });

            const order = await tx.gCOrder.create({
                data: {
                    itemId: item.id,
                    githubId,
                    quantity,
                    unitPrice: item.price,
                    totalPrice,
                    currency: 'GC',
                    paymentMethod: PAYMENT_METHOD.GEEKCOIN,
                    paymentStatus: PAYMENT_STATUS.COMPLETED,
                    status: ORDER_STATUS.PLACED,
                    shippingAddress,
                    contactNumber,
                    size,
                    userNote,
                    idempotencyKey
                },
                include: { item: true }
            });

            const updatedWallet = await tx.gC_Wallet.findUnique({
                where: { id: wallet.id }
            });

            return { order, wallet: updatedWallet };
        });

        return response_201(res, 'Item redeemed successfully', result);
    } catch (error) {
        if (error.message === 'ITEM_NOT_FOUND') {
            return response_404(res, 'Item not available');
        }
        if (error.message === 'OUT_OF_STOCK') {
            return response_400(res, 'Insufficient stock for this item');
        }
        if (error.message === 'INSUFFICIENT_COINS') {
            return response_400(res, 'Insufficient Geekcoin balance');
        }
        if (error.code === 'P2002') {
            const retryOrder = await prisma.gCOrder.findUnique({
                where: { idempotencyKey: req.headers['x-idempotency-key']?.trim() },
                include: { item: true }
            });
            if (retryOrder && retryOrder.githubId === req.user.id) {
                return response_200(res, 'Order already placed', retryOrder);
            }
            return response_400(res, 'Duplicate request detected');
        }
        return response_500(res, 'Error processing redemption', error);
    }
};

export const getMyGeekstoreOrders = async (req, res) => {
    try {
        const githubId = req.user.id;
        const { page, limit, skip } = paginate(req, 20, 100);
        const { status } = req.query;

        const where = {
            githubId,
            ...(status && { status })
        };

        const [total, orders] = await Promise.all([
            prisma.gCOrder.count({ where }),
            prisma.gCOrder.findMany({
                where,
                include: { item: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        ]);

        return response_200(res, 'Orders fetched successfully', {
            orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return response_500(res, 'Failed to fetch orders', error);
    }
};

export const getMyGeekstoreOrderById = async (req, res) => {
    try {
        const order = await prisma.gCOrder.findFirst({
            where: {
                id: req.params.orderId,
                githubId: req.user.id
            },
            include: { item: true }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        return response_200(res, 'Order details fetched successfully', order);
    } catch (error) {
        return response_500(res, 'Failed to fetch order', error);
    }
};

export const cancelMyGeekstoreOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const githubId = req.user.id;

        const order = await prisma.gCOrder.findFirst({
            where: { id: orderId, githubId },
            include: { item: true }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        if (order.status !== ORDER_STATUS.PLACED) {
            return response_400(
                res,
                `Cannot cancel order. Only orders in PLACED status can be cancelled (current: ${order.status})`
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.gCOrder.updateMany({
                where: {
                    id: orderId,
                    githubId,
                    status: ORDER_STATUS.PLACED
                },
                data: {
                    status: ORDER_STATUS.CANCELLED,
                    paymentStatus: PAYMENT_STATUS.REFUNDED,
                    userNote: order.userNote ? `${order.userNote} [Cancelled by user]` : 'Cancelled by user'
                }
            });

            if (!updated.count) {
                throw new Error('CONCURRENT_MODIFICATION');
            }

            // Refund coins if paid with Geekcoins
            if (order.paymentMethod === PAYMENT_METHOD.GEEKCOIN) {
                const wallet = await tx.gC_Wallet.upsert({
                    where: { githubId },
                    update: { balance: { increment: order.totalPrice } },
                    create: { githubId, balance: order.totalPrice }
                });

                await tx.gC_Transaction.create({
                    data: {
                        walletId: wallet.id,
                        githubId,
                        amount: order.totalPrice,
                        eventName: null,
                        idempotencyKey: `refund-user-cancel-${order.id}`
                    }
                });
            }

            // Restock item
            await tx.gCStoreItem.update({
                where: { id: order.itemId },
                data: { stock: { increment: order.quantity } }
            });

            const refreshedOrder = await tx.gCOrder.findUnique({
                where: { id: orderId },
                include: { item: true }
            });

            const currentWallet = await tx.gC_Wallet.findUnique({
                where: { githubId }
            });

            return { order: refreshedOrder, wallet: currentWallet };
        });

        return response_200(res, 'Order cancelled and refunded', result);
    } catch (error) {
        if (error.message === 'CONCURRENT_MODIFICATION') {
            return response_400(res, 'Order status changed before cancellation could be completed');
        }
        return response_500(res, 'Error cancelling order', error);
    }
};

export const getMyGeekcoinWallet = async (req, res) => {
    try {
        const wallet = await prisma.gC_Wallet.upsert({
            where: { githubId: req.user.id },
            update: {},
            create: { githubId: req.user.id, balance: 0 }
        });

        return response_200(res, 'Wallet fetched successfully', wallet);
    } catch (error) {
        return response_500(res, 'Failed to fetch wallet', error);
    }
};

export const getMyGeekcoinTransactions = async (req, res) => {
    try {
        const githubId = req.user.id;
        const { page, limit, skip } = paginate(req, 20, 100);

        const [total, transactions] = await Promise.all([
            prisma.gC_Transaction.count({ where: { githubId } }),
            prisma.gC_Transaction.findMany({
                where: { githubId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        ]);

        return response_200(res, 'Transactions fetched successfully', {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return response_500(res, 'Failed to fetch transactions', error);
    }
};

//Admin Endpoints 

export const getAllGeekstoreItems = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req, 40, 100);
        const { category, search, includeInactive, includeDeleted } = req.query;

        const where = {
            ...(includeInactive !== 'true' && { isActive: true }),
            ...(includeDeleted !== 'true' && { deletedAt: null }),
            ...(category && { category: String(category).trim() }),
            ...(search && {
                OR: [
                    { name: { contains: String(search).trim() } },
                    { description: { contains: String(search).trim() } }
                ]
            })
        };

        const [total, items] = await Promise.all([
            prisma.gCStoreItem.count({ where }),
            prisma.gCStoreItem.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        ]);

        return response_200(res, 'Items fetched successfully', {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return response_500(res, 'Failed to fetch items', error);
    }
};

export const getGeekstoreItemByIdAdmin = async (req, res) => {
    try {
        const item = await prisma.gCStoreItem.findUnique({
            where: { id: req.params.itemId },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!item) {
            return response_404(res, 'Item not found');
        }

        return response_200(res, 'Item fetched successfully', item);
    } catch (error) {
        return response_500(res, 'Failed to fetch item', error);
    }
};

export const addGeekstoreItem = async (req, res) => {
    try {
        const { name, description, imageUrl, category } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return response_400(res, 'Item name is required');
        }

        const trimmedName = name.trim();
        let price, stock, cashPrice = null;

        try {
            price = parsePositiveInt(req.body.price, 'price');
            stock = parseNonNegativeInt(req.body.stock, 'stock');
            if (req.body.cashPrice !== undefined && req.body.cashPrice !== null) {
                cashPrice = parseNonNegativeInt(req.body.cashPrice, 'cashPrice');
            }
        } catch (err) {
            return response_400(res, err.message);
        }

        const existing = await prisma.gCStoreItem.findFirst({
            where: { name: trimmedName, deletedAt: null }
        });

        if (existing) {
            return response_400(res, 'An active item with this name already exists');
        }

        const item = await prisma.gCStoreItem.create({
            data: {
                name: trimmedName,
                description: description?.trim() || null,
                imageUrl: imageUrl?.trim() || null,
                category: category?.trim() || 'Merchandise',
                price,
                cashPrice,
                stock,
                isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
            }
        });

        return response_201(res, 'Item added successfully', item);
    } catch (error) {
        if (error.code === 'P2002') {
            return response_400(res, 'An item with this name already exists');
        }
        return response_500(res, 'Failed to add item', error);
    }
};

export const updateGeekstoreItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const data = {};

        if (req.body.name !== undefined) {
            const trimmed = String(req.body.name).trim();
            if (!trimmed) return response_400(res, 'Item name cannot be empty');
            data.name = trimmed;
        }

        if (req.body.description !== undefined) data.description = req.body.description?.trim() || null;
        if (req.body.imageUrl !== undefined) data.imageUrl = req.body.imageUrl?.trim() || null;
        if (req.body.category !== undefined) data.category = req.body.category?.trim() || 'Merchandise';
        if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

        if (req.body.price !== undefined) {
            try {
                data.price = parsePositiveInt(req.body.price, 'price');
            } catch (err) {
                return response_400(res, err.message);
            }
        }

        if (req.body.cashPrice !== undefined) {
            try {
                data.cashPrice = req.body.cashPrice === null
                    ? null
                    : parseNonNegativeInt(req.body.cashPrice, 'cashPrice');
            } catch (err) {
                return response_400(res, err.message);
            }
        }

        if (req.body.stock !== undefined) {
            try {
                data.stock = parseNonNegativeInt(req.body.stock, 'stock');
            } catch (err) {
                return response_400(res, err.message);
            }
        }

        if (!Object.keys(data).length) {
            return response_400(res, 'No update fields provided');
        }

        const existing = await prisma.gCStoreItem.findFirst({
            where: { id: itemId, deletedAt: null }
        });

        if (!existing) {
            return response_404(res, 'Item not found');
        }

        if (data.name && data.name !== existing.name) {
            const duplicate = await prisma.gCStoreItem.findFirst({
                where: { name: data.name, id: { not: itemId }, deletedAt: null }
            });
            if (duplicate) {
                return response_400(res, 'An item with this name already exists');
            }
        }

        const item = await prisma.gCStoreItem.update({
            where: { id: itemId },
            data
        });

        return response_200(res, 'Item updated successfully', item);
    } catch (error) {
        if (error.code === 'P2002') {
            return response_400(res, 'An item with this name already exists');
        }
        return response_500(res, 'Failed to update item', error);
    }
};

export const deleteGeekstoreItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const existing = await prisma.gCStoreItem.findFirst({
            where: { id: itemId, deletedAt: null }
        });

        if (!existing) {
            return response_404(res, 'Item not found');
        }

        const item = await prisma.gCStoreItem.update({
            where: { id: itemId },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        });

        return response_200(res, 'Item deleted successfully', item);
    } catch (error) {
        return response_500(res, 'Failed to delete item', error);
    }
};

export const getAllGeekstoreOrders = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req, 20, 100);
        const { status, githubId, itemId, paymentMethod, paymentStatus, search } = req.query;

        const where = {
            ...(status && { status }),
            ...(paymentMethod && { paymentMethod }),
            ...(paymentStatus && { paymentStatus }),
            ...(githubId && { githubId: String(githubId).trim() }),
            ...(itemId && { itemId: String(itemId).trim() }),
            ...(search && {
                OR: [
                    { githubId: { contains: String(search).trim() } },
                    { id: { contains: String(search).trim() } }
                ]
            })
        };

        const [total, orders] = await Promise.all([
            prisma.gCOrder.count({ where }),
            prisma.gCOrder.findMany({
                where,
                include: {
                    item: true,
                    user: {
                        select: {
                            name: true,
                            email: true,
                            githubId: true,
                            college: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        ]);

        return response_200(res, 'Orders fetched successfully', {
            orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return response_500(res, 'Failed to fetch orders', error);
    }
};

export const getGeekstoreOrderByIdAdmin = async (req, res) => {
    try {
        const order = await prisma.gCOrder.findUnique({
            where: { id: req.params.orderId },
            include: {
                item: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                        githubId: true,
                        college: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        return response_200(res, 'Order details fetched successfully', order);
    } catch (error) {
        return response_500(res, 'Failed to fetch order', error);
    }
};

export const updateGeekstoreOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, adminNote } = req.body;

        if (!status || !ORDER_STATUS[status]) {
            return response_400(
                res,
                `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(', ')}`
            );
        }

        const order = await prisma.gCOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        // Terminal status guard
        const isTerminal = [ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED].includes(order.status);
        const targetIsActive = ![ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED].includes(status);
        if (isTerminal && targetIsActive) {
            return response_400(res, 'Cannot move rejected or cancelled order back to active');
        }

        const shouldRefund = [ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED].includes(status) && !isTerminal;

        const updatedOrder = await prisma.$transaction(async (tx) => {
            if (shouldRefund) {
                if (order.paymentMethod === PAYMENT_METHOD.GEEKCOIN) {
                    const wallet = await tx.gC_Wallet.upsert({
                        where: { githubId: order.githubId },
                        update: { balance: { increment: order.totalPrice } },
                        create: { githubId: order.githubId, balance: order.totalPrice }
                    });

                    await tx.gC_Transaction.create({
                        data: {
                            walletId: wallet.id,
                            githubId: order.githubId,
                            amount: order.totalPrice,
                            eventName: null,
                            idempotencyKey: `refund-order-${order.id}`
                        }
                    });
                }

                await tx.gCStoreItem.update({
                    where: { id: order.itemId },
                    data: { stock: { increment: order.quantity } }
                });
            }

            return tx.gCOrder.update({
                where: { id: orderId },
                data: {
                    status,
                    ...(shouldRefund && { paymentStatus: PAYMENT_STATUS.REFUNDED }),
                    ...(adminNote !== undefined && { adminNote: String(adminNote).trim() })
                },
                include: {
                    item: true,
                    user: {
                        select: {
                            name: true,
                            email: true,
                            githubId: true,
                            college: true,
                            avatarUrl: true
                        }
                    }
                }
            });
        });

        return response_200(res, 'Order status updated', updatedOrder);
    } catch (error) {
        return response_500(res, 'Failed to update order status', error);
    }
};

export const adjustGeekcoinWallet = async (req, res) => {
    try {
        const { githubId } = req.params;
        const { amount, reason } = req.body;

        if (!githubId || typeof githubId !== 'string' || !githubId.trim()) {
            return response_400(res, 'githubId is required');
        }

        const targetUser = githubId.trim();
        const delta = Number(amount);
        if (!Number.isInteger(delta) || delta === 0) {
            return response_400(res, 'amount must be a non-zero integer');
        }

        const rawIdempotency = req.headers['x-idempotency-key'];
        const idempotencyKey = typeof rawIdempotency === 'string' && rawIdempotency.trim()
            ? rawIdempotency.trim()
            : `adjust-${targetUser}-${Date.now()}`;

        const result = await prisma.$transaction(async (tx) => {
            let wallet = await tx.gC_Wallet.findUnique({
                where: { githubId: targetUser }
            });

            if (!wallet) {
                if (delta < 0) {
                    throw new Error('NEGATIVE_OPENING_BALANCE');
                }
                wallet = await tx.gC_Wallet.create({
                    data: { githubId: targetUser, balance: delta }
                });
            } else {
                if (delta < 0 && wallet.balance < Math.abs(delta)) {
                    throw new Error('INSUFFICIENT_FUNDS');
                }
                wallet = await tx.gC_Wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: delta } }
                });
            }

            const transaction = await tx.gC_Transaction.create({
                data: {
                    walletId: wallet.id,
                    githubId: targetUser,
                    amount: delta,
                    eventName: null,
                    idempotencyKey
                }
            });

            return {
                wallet,
                transaction,
                reason: reason || null
            };
        });

        return response_200(res, 'Wallet adjusted successfully', result);
    } catch (error) {
        if (error.message === 'NEGATIVE_OPENING_BALANCE') {
            return response_400(res, 'Cannot create wallet with negative balance');
        }
        if (error.message === 'INSUFFICIENT_FUNDS') {
            return response_400(res, 'User balance is insufficient for this deduction');
        }
        if (error.code === 'P2002') {
            return response_400(res, 'Duplicate adjustment request detected');
        }
        return response_500(res, 'Error adjusting wallet', error);
    }
};
