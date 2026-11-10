import cloudinary from "../config/cloudinary.config.js";
import { getDataURI } from "../utils/dataURIparser.js";
import prisma from '../config/db.config.js';
import {
    response_200,
    response_201,
    response_400,
    response_403,
    response_404,
    response_500
} from '../utils/responseCodes.js';

// Order and Payment Status Enums
export const ORDER_STATUS = Object.freeze({
    PLACED: 'PLACED',
    APPROVED: 'APPROVED',
    FULFILLED: 'FULFILLED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED'
});

export const PAYMENT_METHOD = Object.freeze({
    CASH: 'CASH',
    RAZORPAY: 'RAZORPAY',
    STRIPE: 'STRIPE',
    COD: 'COD',
    OTHER: 'OTHER'
});

export const PAYMENT_STATUS = Object.freeze({
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
});

// Helper validation functions
const parsePositiveInt = (val, fieldName, max = Number.MAX_SAFE_INTEGER) => {
    const num = Number(val);
    if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    if (num > max) {
        throw new Error(`${fieldName} cannot exceed ${max}`);
    }
    return num;
};

const parseNonNegativeInt = (val, fieldName, max = Number.MAX_SAFE_INTEGER) => {
    const num = Number(val);
    if (!Number.isInteger(num) || num < 0) {
        throw new Error(`${fieldName} must be a non-negative integer`);
    }
    if (num > max) {
        throw new Error(`${fieldName} cannot exceed ${max}`);
    }
    return num;
};

const paginate = (req, defaultLimit = 20, maxLimit = 100) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
        maxLimit,
        Math.max(1, parseInt(req.query.limit, 10) || defaultLimit)
    );
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// Helper to format cart summary
const formatCartResponse = (cart) => {
    let totalItems = 0;
    let subtotal = 0;
    let canCheckout = (cart.items && cart.items.length > 0);

    const formattedItems = (cart.items || []).map((cartItem) => {
        const item = cartItem.item;
        const isAvailable = Boolean(
            item &&
            item.isActive &&
            !item.deletedAt &&
            item.stock >= cartItem.quantity
        );

        if (!isAvailable) {
            canCheckout = false;
        }

        const itemTotal = (item?.price || 0) * cartItem.quantity;
        totalItems += cartItem.quantity;
        subtotal += itemTotal;

        return {
            id: cartItem.id,
            itemId: cartItem.itemId,
            quantity: cartItem.quantity,
            size: cartItem.size,
            unitPrice: item?.price || 0,
            itemTotal,
            isAvailable,
            item: item
                ? {
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      imageUrl: item.imageUrl,
                      category: item.category,
                      price: item.price,
                      stock: item.stock,
                      isActive: item.isActive
                  }
                : null,
            createdAt: cartItem.createdAt,
            updatedAt: cartItem.updatedAt
        };
    });

    return {
        id: cart.id,
        githubId: cart.githubId,
        totalItems,
        subtotal,
        currency: 'INR',
        canCheckout,
        items: formattedItems
    };
};

/*   PUBLIC CATALOG ENDPOINTS */

export const listGeekstoreItems = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req, 20, 100);
        const { category, search, inStockOnly } = req.query;

        const where = {
            isActive: true,
            deletedAt: null
        };

        if (category && typeof category === 'string' && category.trim()) {
            where.category = category.trim();
        }

        if (search && typeof search === 'string' && search.trim()) {
            where.name = {
                contains: search.trim()
            };
        }

        if (inStockOnly === 'true' || inStockOnly === true) {
            where.stock = { gt: 0 };
        }

        const [total, items] = await Promise.all([
            prisma.gCStoreItem.count({ where }),
            prisma.gCStoreItem.findMany({
                where,
                orderBy: [{ stock: 'desc' }, { createdAt: 'desc' }],
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

export const getGeekstoreItemById = async (req, res) => {
    try {
        const { itemId } = req.params;

        const item = await prisma.gCStoreItem.findFirst({
            where: {
                id: itemId,
                isActive: true,
                deletedAt: null
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

/* CART ENDPOINTS (AUTHENTICATED USER)*/

export const getMyCart = async (req, res) => {
    try {
        const githubId = req.user.id;

        const cart = await prisma.gCCart.upsert({
            where: { githubId },
            update: {},
            create: { githubId },
            include: {
                items: {
                    include: { item: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return response_200(res, 'Cart fetched successfully', formatCartResponse(cart));
    } catch (error) {
        return response_500(res, 'Failed to fetch cart', error);
    }
};

export const addToCart = async (req, res) => {
    try {
        const githubId = req.user.id;
        const { itemId } = req.body;

        if (!itemId || typeof itemId !== 'string') {
            return response_400(res, 'itemId is required');
        }

        let quantity = 1;
        try {
            quantity = parsePositiveInt(req.body.quantity || 1, 'quantity', 10);
        } catch (err) {
            return response_400(res, err.message);
        }

        const size = req.body.size ? String(req.body.size).trim().slice(0, 20) : null;

        const item = await prisma.gCStoreItem.findFirst({
            where: {
                id: itemId,
                isActive: true,
                deletedAt: null
            }
        });

        if (!item) {
            return response_404(res, 'Item not found or unavailable');
        }

        if (item.stock < quantity) {
            return response_400(
                res,
                `Insufficient stock available (requested: ${quantity}, available: ${item.stock})`
            );
        }

        const cart = await prisma.gCCart.upsert({
            where: { githubId },
            update: {},
            create: { githubId }
        });

        // Check if item with this size is already in the cart
        const existingCartItem = await prisma.gCCartItem.findFirst({
            where: {
                cartId: cart.id,
                itemId,
                size
            }
        });

        if (existingCartItem) {
            const newQuantity = existingCartItem.quantity + quantity;
            if (newQuantity > item.stock) {
                return response_400(
                    res,
                    `Cannot add more. You already have ${existingCartItem.quantity} in cart, available stock is ${item.stock}`
                );
            }
            if (newQuantity > 10) {
                return response_400(res, 'Maximum 10 units of an item allowed per cart');
            }

            await prisma.gCCartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: newQuantity }
            });
        } else {
            await prisma.gCCartItem.create({
                data: {
                    cartId: cart.id,
                    itemId,
                    quantity,
                    size
                }
            });
        }

        const updatedCart = await prisma.gCCart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: { item: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return response_200(res, 'Item added to cart', formatCartResponse(updatedCart));
    } catch (error) {
        return response_500(res, 'Failed to add item to cart', error);
    }
};

export const updateCartItem = async (req, res) => {
    try {
        const githubId = req.user.id;
        const { cartItemId } = req.params;
        const { quantity, size } = req.body;

        const cart = await prisma.gCCart.findUnique({
            where: { githubId }
        });

        if (!cart) {
            return response_404(res, 'Cart not found');
        }

        const cartItem = await prisma.gCCartItem.findFirst({
            where: {
                id: cartItemId,
                cartId: cart.id
            },
            include: { item: true }
        });

        if (!cartItem) {
            return response_404(res, 'Item not found in your cart');
        }

        // If quantity is explicitly 0 or less, remove item
        if (quantity !== undefined && Number(quantity) <= 0) {
            await prisma.gCCartItem.delete({
                where: { id: cartItemId }
            });
        } else {
            const updateData = {};

            if (quantity !== undefined) {
                let parsedQty;
                try {
                    parsedQty = parsePositiveInt(quantity, 'quantity', 10);
                } catch (err) {
                    return response_400(res, err.message);
                }

                if (cartItem.item.stock < parsedQty) {
                    return response_400(
                        res,
                        `Insufficient stock. Available stock is ${cartItem.item.stock}`
                    );
                }
                updateData.quantity = parsedQty;
            }

            if (size !== undefined) {
                updateData.size = size ? String(size).trim().slice(0, 20) : null;
            }

            if (Object.keys(updateData).length > 0) {
                await prisma.gCCartItem.update({
                    where: { id: cartItemId },
                    data: updateData
                });
            }
        }

        const updatedCart = await prisma.gCCart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: { item: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return response_200(res, 'Cart updated successfully', formatCartResponse(updatedCart));
    } catch (error) {
        if (error.code === 'P2002') {
            return response_400(
                res,
                'An item with this size is already in your cart. Please adjust quantity instead.'
            );
        }
        return response_500(res, 'Failed to update cart item', error);
    }
};

export const removeCartItem = async (req, res) => {
    try {
        const githubId = req.user.id;
        const { cartItemId } = req.params;

        const cart = await prisma.gCCart.findUnique({
            where: { githubId }
        });

        if (!cart) {
            return response_404(res, 'Cart not found');
        }

        const existingItem = await prisma.gCCartItem.findFirst({
            where: {
                id: cartItemId,
                cartId: cart.id
            }
        });

        if (!existingItem) {
            return response_404(res, 'Cart item not found');
        }

        await prisma.gCCartItem.delete({
            where: { id: cartItemId }
        });

        const updatedCart = await prisma.gCCart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: { item: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return response_200(res, 'Item removed from cart', formatCartResponse(updatedCart));
    } catch (error) {
        return response_500(res, 'Failed to remove cart item', error);
    }
};

export const clearCart = async (req, res) => {
    try {
        const githubId = req.user.id;

        const cart = await prisma.gCCart.findUnique({
            where: { githubId }
        });

        if (cart) {
            await prisma.gCCartItem.deleteMany({
                where: { cartId: cart.id }
            });
        }

        return response_200(res, 'Cart cleared successfully', {
            items: [],
            totalItems: 0,
            subtotal: 0,
            canCheckout: false
        });
    } catch (error) {
        return response_500(res, 'Failed to clear cart', error);
    }
};

/* CHECKOUT & DIRECT ORDER (CASH ONLY)*/

export const checkoutCart = async (req, res) => {
    try {
        const githubId = req.user.id;

        const shippingAddress = req.body.shippingAddress?.trim()?.slice(0, 1000) || null;
        const contactNumber = req.body.contactNumber?.trim()?.slice(0, 30) || null;
        const userNote = req.body.userNote?.trim()?.slice(0, 500) || null;

        let paymentMethod = PAYMENT_METHOD.CASH;
        if (req.body.paymentMethod) {
            const methodUpper = String(req.body.paymentMethod).toUpperCase();
            if (PAYMENT_METHOD[methodUpper]) {
                paymentMethod = PAYMENT_METHOD[methodUpper];
            } else {
                return response_400(
                    res,
                    `Invalid paymentMethod. Allowed: ${Object.values(PAYMENT_METHOD).join(', ')}`
                );
            }
        }

        const rawIdempotency = req.headers['x-idempotency-key'];
        const idempotencyKey = typeof rawIdempotency === 'string' && rawIdempotency.trim()
            ? rawIdempotency.trim()
            : null;

        const cart = await prisma.gCCart.findUnique({
            where: { githubId },
            include: {
                items: {
                    include: { item: true }
                }
            }
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            return response_400(res, 'Cart is empty. Add items before checking out.');
        }

        // Execute checkout transactionally
        const result = await prisma.$transaction(async (tx) => {
            // Idempotency check inside transaction
            if (idempotencyKey) {
                const existingOrder = await tx.gCOrder.findUnique({
                    where: { idempotencyKey },
                    include: {
                        items: { include: { item: true } }
                    }
                });

                if (existingOrder) {
                    if (existingOrder.githubId !== githubId) {
                        throw new Error('IDEMPOTENCY_CONFLICT');
                    }
                    return { order: existingOrder, alreadyExists: true };
                }
            }

            let calculatedTotal = 0;
            const orderItemsData = [];

            // Verify stock and decrement for each item atomically
            for (const cartItem of cart.items) {
                const storeItem = await tx.gCStoreItem.findFirst({
                    where: {
                        id: cartItem.itemId,
                        isActive: true,
                        deletedAt: null
                    }
                });

                if (!storeItem) {
                    throw new Error(`ITEM_UNAVAILABLE:${cartItem.item?.name || cartItem.itemId}`);
                }

                if (storeItem.stock < cartItem.quantity) {
                    throw new Error(
                        `INSUFFICIENT_STOCK:${storeItem.name} (requested: ${cartItem.quantity}, in stock: ${storeItem.stock})`
                    );
                }

                // Decrement stock conditionally
                const stockUpdate = await tx.gCStoreItem.updateMany({
                    where: {
                        id: storeItem.id,
                        stock: { gte: cartItem.quantity },
                        isActive: true,
                        deletedAt: null
                    },
                    data: {
                        stock: { decrement: cartItem.quantity }
                    }
                });

                if (!stockUpdate.count) {
                    throw new Error(`OUT_OF_STOCK:${storeItem.name}`);
                }

                const itemTotalPrice = storeItem.price * cartItem.quantity;
                calculatedTotal += itemTotalPrice;

                orderItemsData.push({
                    itemId: storeItem.id,
                    quantity: cartItem.quantity,
                    unitPrice: storeItem.price,
                    totalPrice: itemTotalPrice,
                    size: cartItem.size
                });
            }

            // Create Order
            const order = await tx.gCOrder.create({
                data: {
                    githubId,
                    totalAmount: calculatedTotal,
                    currency: 'INR',
                    paymentMethod,
                    paymentStatus: PAYMENT_STATUS.PENDING,
                    status: ORDER_STATUS.PLACED,
                    shippingAddress,
                    contactNumber,
                    userNote,
                    idempotencyKey,
                    items: {
                        create: orderItemsData
                    }
                },
                include: {
                    items: {
                        include: { item: true }
                    }
                }
            });

            // Empty the user's cart
            await tx.gCCartItem.deleteMany({
                where: { cartId: cart.id }
            });

            return { order, alreadyExists: false };
        });

        if (result.alreadyExists) {
            return response_200(res, 'Order already placed', result.order);
        }

        return response_201(res, 'Order placed successfully', result.order);
    } catch (error) {
        if (error.message === 'IDEMPOTENCY_CONFLICT') {
            return response_403(res, 'Idempotency key belongs to another user');
        }
        if (error.message.startsWith('ITEM_UNAVAILABLE:')) {
            const name = error.message.split(':')[1];
            return response_400(res, `Item "${name}" is no longer available`);
        }
        if (error.message.startsWith('INSUFFICIENT_STOCK:') || error.message.startsWith('OUT_OF_STOCK:')) {
            const detail = error.message.split(':')[1];
            return response_400(res, `Insufficient stock for item: ${detail}`);
        }
        if (error.code === 'P2002') {
            const retryOrder = await prisma.gCOrder.findUnique({
                where: { idempotencyKey: req.headers['x-idempotency-key']?.trim() },
                include: { items: { include: { item: true } } }
            });
            if (retryOrder && retryOrder.githubId === req.user.id) {
                return response_200(res, 'Order already placed', retryOrder);
            }
            return response_400(res, 'Duplicate request detected');
        }
        return response_500(res, 'Failed to checkout cart', error);
    }
};

export const createDirectOrder = async (req, res) => {
    try {
        const { itemId } = req.params;
        const githubId = req.user.id;

        let quantity = 1;
        try {
            quantity = parsePositiveInt(req.body.quantity || 1, 'quantity', 10);
        } catch (err) {
            return response_400(res, err.message);
        }

        const size = req.body.size ? String(req.body.size).trim().slice(0, 20) : null;
        const shippingAddress = req.body.shippingAddress?.trim()?.slice(0, 1000) || null;
        const contactNumber = req.body.contactNumber?.trim()?.slice(0, 30) || null;
        const userNote = req.body.userNote?.trim()?.slice(0, 500) || null;

        let paymentMethod = PAYMENT_METHOD.CASH;
        if (req.body.paymentMethod) {
            const methodUpper = String(req.body.paymentMethod).toUpperCase();
            if (PAYMENT_METHOD[methodUpper]) {
                paymentMethod = PAYMENT_METHOD[methodUpper];
            } else {
                return response_400(
                    res,
                    `Invalid paymentMethod. Allowed: ${Object.values(PAYMENT_METHOD).join(', ')}`
                );
            }
        }

        const rawIdempotency = req.headers['x-idempotency-key'];
        const idempotencyKey = typeof rawIdempotency === 'string' && rawIdempotency.trim()
            ? rawIdempotency.trim()
            : null;

        const result = await prisma.$transaction(async (tx) => {
            if (idempotencyKey) {
                const existingOrder = await tx.gCOrder.findUnique({
                    where: { idempotencyKey },
                    include: { items: { include: { item: true } } }
                });

                if (existingOrder) {
                    if (existingOrder.githubId !== githubId) {
                        throw new Error('IDEMPOTENCY_CONFLICT');
                    }
                    return { order: existingOrder, alreadyExists: true };
                }
            }

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

            // Decrement stock
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

            const totalAmount = item.price * quantity;

            const order = await tx.gCOrder.create({
                data: {
                    githubId,
                    totalAmount,
                    currency: 'INR',
                    paymentMethod,
                    paymentStatus: PAYMENT_STATUS.PENDING,
                    status: ORDER_STATUS.PLACED,
                    shippingAddress,
                    contactNumber,
                    userNote,
                    idempotencyKey,
                    items: {
                        create: [
                            {
                                itemId: item.id,
                                quantity,
                                unitPrice: item.price,
                                totalPrice: totalAmount,
                                size
                            }
                        ]
                    }
                },
                include: {
                    items: {
                        include: { item: true }
                    }
                }
            });

            return { order, alreadyExists: false };
        });

        if (result.alreadyExists) {
            return response_200(res, 'Order already placed', result.order);
        }

        return response_201(res, 'Order placed successfully', result.order);
    } catch (error) {
        if (error.message === 'IDEMPOTENCY_CONFLICT') {
            return response_403(res, 'Idempotency key belongs to another user');
        }
        if (error.message === 'ITEM_NOT_FOUND') {
            return response_404(res, 'Item not found');
        }
        if (error.message === 'OUT_OF_STOCK') {
            return response_400(res, 'Insufficient stock for this item');
        }
        if (error.code === 'P2002') {
            const retryOrder = await prisma.gCOrder.findUnique({
                where: { idempotencyKey: req.headers['x-idempotency-key']?.trim() },
                include: { items: { include: { item: true } } }
            });
            if (retryOrder && retryOrder.githubId === req.user.id) {
                return response_200(res, 'Order already placed', retryOrder);
            }
            return response_400(res, 'Duplicate request detected');
        }
        return response_500(res, 'Failed to place order', error);
    }
};

/* ORDER HISTORY & CANCELLATION (AUTHENTICATED USER)*/

export const getMyGeekstoreOrders = async (req, res) => {
    try {
        const githubId = req.user.id;
        const { page, limit, skip } = paginate(req, 20, 100);

        const where = { githubId };
        if (req.query.status && ORDER_STATUS[req.query.status.toUpperCase()]) {
            where.status = req.query.status.toUpperCase();
        }

        const [total, orders] = await Promise.all([
            prisma.gCOrder.count({ where }),
            prisma.gCOrder.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    items: {
                        include: { item: true }
                    }
                }
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
        const { orderId } = req.params;
        const githubId = req.user.id;

        const order = await prisma.gCOrder.findFirst({
            where: { id: orderId, githubId },
            include: {
                items: {
                    include: { item: true }
                }
            }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        return response_200(res, 'Order fetched successfully', order);
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
            include: { items: true }
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
                    paymentStatus:
                        order.paymentStatus === PAYMENT_STATUS.COMPLETED
                            ? PAYMENT_STATUS.REFUNDED
                            : PAYMENT_STATUS.FAILED,
                    userNote: order.userNote
                        ? `${order.userNote} [Cancelled by user]`
                        : 'Cancelled by user'
                }
            });

            if (!updated.count) {
                throw new Error('CONCURRENT_MODIFICATION');
            }

            // Restock all items from the order
            for (const orderItem of order.items) {
                await tx.gCStoreItem.update({
                    where: { id: orderItem.itemId },
                    data: { stock: { increment: orderItem.quantity } }
                });
            }

            const refreshedOrder = await tx.gCOrder.findUnique({
                where: { id: orderId },
                include: { items: { include: { item: true } } }
            });

            return refreshedOrder;
        });

        return response_200(res, 'Order cancelled successfully', result);
    } catch (error) {
        if (error.message === 'CONCURRENT_MODIFICATION') {
            return response_400(res, 'Order status changed before cancellation could be completed');
        }
        return response_500(res, 'Failed to cancel order', error);
    }
};

/* ADMIN CATALOG MANAGEMENT */
export const getAllGeekstoreItems = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req, 20, 100);
        const { includeInactive, includeDeleted, category, search } = req.query;

        const where = {};

        if (includeDeleted !== 'true' && includeDeleted !== true) {
            where.deletedAt = null;
        }

        if (includeInactive !== 'true' && includeInactive !== true) {
            where.isActive = true;
        }

        if (category && typeof category === 'string' && category.trim()) {
            where.category = category.trim();
        }

        if (search && typeof search === 'string' && search.trim()) {
            where.name = {
                contains: search.trim()
            };
        }

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
        const { itemId } = req.params;

        const item = await prisma.gCStoreItem.findUnique({
            where: { id: itemId },
            include: {
                _count: {
                    select: { orderItems: true, cartItems: true }
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

export const uploadGeekstoreImage = async (req, res) => {
    try {
        const file = req.file || (req.files && req.files[0]);
        if (!file) {
            return response_400(res, "Please provide an image file to upload");
        }

        const dataUri = await getDataURI(file);
        const folder = req.body?.folder?.trim() || "geekstore";

        const uploadResult = await cloudinary.uploader.upload(dataUri.content, {
            resource_type: "image",
            folder,
            overwrite: true
        });

        return response_200(res, "Image uploaded successfully to Cloudinary", {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            format: uploadResult.format,
            width: uploadResult.width,
            height: uploadResult.height,
            bytes: uploadResult.bytes
        });
    } catch (error) {
        return response_500(res, "Failed to upload image to Cloudinary", error);
    }
};

export const restoreGeekstoreItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const existing = await prisma.gCStoreItem.findUnique({
            where: { id: itemId }
        });

        if (!existing) {
            return response_404(res, "Item not found");
        }

        const item = await prisma.gCStoreItem.update({
            where: { id: itemId },
            data: {
                deletedAt: null,
                isActive: true
            }
        });

        return response_200(res, "Item restored successfully", item);
    } catch (error) {
        return response_500(res, "Failed to restore item", error);
    }
};

export const addGeekstoreItem = async (req, res) => {
    try {
        let { name, description, imageUrl, category } = req.body;

        const file = req.file || (req.files && req.files[0]);
        if (file) {
            try {
                const dataUri = await getDataURI(file);
                const uploadResult = await cloudinary.uploader.upload(dataUri.content, {
                    resource_type: "image",
                    folder: "geekstore",
                    overwrite: true
                });
                imageUrl = uploadResult.secure_url;
            } catch (err) {
                console.error("Cloudinary upload failed in addGeekstoreItem:", err);
            }
        }

        if (!name || typeof name !== 'string' || !name.trim()) {
            return response_400(res, 'Item name is required');
        }

        const trimmedName = name.trim();
        let price, stock;

        try {
            price = parsePositiveInt(req.body.price, 'price');
            stock = parseNonNegativeInt(req.body.stock, 'stock');
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
                stock,
                isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
            }
        });

        return response_201(res, 'Item added successfully', item);
    } catch (error) {
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
                return response_400(err.message);
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
                return response_400(res, 'An active item with this name already exists');
            }
        }

        const item = await prisma.gCStoreItem.update({
            where: { id: itemId },
            data
        });

        return response_200(res, 'Item updated successfully', item);
    } catch (error) {
        return response_500(res, 'Failed to update item', error);
    }
};

export const deleteGeekstoreItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const permanent =
            req.query.permanent === "true" ||
            req.query.permanent === true ||
            req.body?.permanent === true;

        const existing = await prisma.gCStoreItem.findUnique({
            where: { id: itemId }
        });

        if (!existing) {
            return response_404(res, "Item not found");
        }

        if (permanent) {
            const orderItemsCount = await prisma.gCOrderItem.count({
                where: { itemId }
            });

            if (orderItemsCount > 0) {
                const item = await prisma.gCStoreItem.update({
                    where: { id: itemId },
                    data: {
                        deletedAt: new Date(),
                        isActive: false
                    }
                });
                return response_200(
                    res,
                    "Item has associated orders and was soft-deleted to preserve order history",
                    item
                );
            }

            await prisma.gCCartItem.deleteMany({
                where: { itemId }
            });

            const deleted = await prisma.gCStoreItem.delete({
                where: { id: itemId }
            });

            return response_200(res, "Item permanently deleted successfully", deleted);
        }

        const item = await prisma.gCStoreItem.update({
            where: { id: itemId },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        });

        return response_200(res, "Item deleted successfully", item);
    } catch (error) {
        return response_500(res, "Failed to delete item", error);
    }
};

/* ADMIN ORDER MANAGEMENT */

export const getAllGeekstoreOrders = async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req, 20, 100);
        const { status, paymentStatus, paymentMethod, githubId, search } = req.query;

        const where = {};

        if (status && ORDER_STATUS[status.toUpperCase()]) {
            where.status = status.toUpperCase();
        }

        if (paymentStatus && PAYMENT_STATUS[paymentStatus.toUpperCase()]) {
            where.paymentStatus = paymentStatus.toUpperCase();
        }

        if (paymentMethod && PAYMENT_METHOD[paymentMethod.toUpperCase()]) {
            where.paymentMethod = paymentMethod.toUpperCase();
        }

        if (githubId && typeof githubId === 'string' && githubId.trim()) {
            where.githubId = githubId.trim();
        }

        if (search && typeof search === 'string' && search.trim()) {
            where.OR = [
                { id: { contains: search.trim() } },
                { contactNumber: { contains: search.trim() } },
                { shippingAddress: { contains: search.trim() } }
            ];
        }

        const [total, orders] = await Promise.all([
            prisma.gCOrder.count({ where }),
            prisma.gCOrder.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    items: {
                        include: { item: true }
                    },
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
        const { orderId } = req.params;

        const order = await prisma.gCOrder.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: { item: true }
                },
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

        return response_200(res, 'Order fetched successfully', order);
    } catch (error) {
        return response_500(res, 'Failed to fetch order', error);
    }
};

export const updateGeekstoreOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, adminNote } = req.body;

        if (!status || !ORDER_STATUS[status.toUpperCase()]) {
            return response_400(
                res,
                `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(', ')}`
            );
        }

        const targetStatus = status.toUpperCase();

        const order = await prisma.gCOrder.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        // Terminal status guard: once cancelled or rejected, cannot be moved back
        const isTerminal = [ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED].includes(order.status);
        const targetIsActive = ![ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED].includes(targetStatus);
        if (isTerminal && targetIsActive) {
            return response_400(res, 'Cannot move rejected or cancelled order back to active');
        }

        const shouldRestock =
            [ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED].includes(targetStatus) && !isTerminal;

        const updatedOrder = await prisma.$transaction(async (tx) => {
            if (shouldRestock) {
                // Restock items
                for (const orderItem of order.items) {
                    await tx.gCStoreItem.update({
                        where: { id: orderItem.itemId },
                        data: { stock: { increment: orderItem.quantity } }
                    });
                }
            }

            // Concurrency guard with status check
            const updateResult = await tx.gCOrder.updateMany({
                where: {
                    id: orderId,
                    status: order.status
                },
                data: {
                    status: targetStatus,
                    ...(shouldRestock &&
                        order.paymentStatus === PAYMENT_STATUS.COMPLETED && {
                            paymentStatus: PAYMENT_STATUS.REFUNDED
                        }),
                    ...(adminNote !== undefined && { adminNote: String(adminNote).trim() })
                }
            });

            if (!updateResult.count) {
                throw new Error('ORDER_ALREADY_MODIFIED');
            }

            return tx.gCOrder.findUnique({
                where: { id: orderId },
                include: {
                    items: {
                        include: { item: true }
                    },
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
        if (error.message === 'ORDER_ALREADY_MODIFIED') {
            return response_400(
                res,
                'Order was already modified by another request. Please refresh and retry.'
            );
        }
        return response_500(res, 'Failed to update order status', error);
    }
};

export const updateGeekstoreOrderPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus, adminNote } = req.body;

        if (!paymentStatus || !PAYMENT_STATUS[paymentStatus.toUpperCase()]) {
            return response_400(
                res,
                `Invalid paymentStatus. Allowed: ${Object.values(PAYMENT_STATUS).join(', ')}`
            );
        }

        const targetPaymentStatus = paymentStatus.toUpperCase();

        const order = await prisma.gCOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return response_404(res, 'Order not found');
        }

        const updatedOrder = await prisma.gCOrder.update({
            where: { id: orderId },
            data: {
                paymentStatus: targetPaymentStatus,
                ...(adminNote !== undefined && { adminNote: String(adminNote).trim() })
            },
            include: {
                items: { include: { item: true } },
                user: {
                    select: {
                        name: true,
                        email: true,
                        githubId: true,
                        college: true
                    }
                }
            }
        });

        return response_200(res, 'Payment status updated successfully', updatedOrder);
    } catch (error) {
        return response_500(res, 'Failed to update payment status', error);
    }
};
