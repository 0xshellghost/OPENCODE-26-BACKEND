import express from 'express';
import userAuth from '../../middlewares/userAuth.middleware.js';
import {
    listGeekstoreItems,
    getGeekstoreItemById,
    getMyCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    checkoutCart,
    createDirectOrder,
    getMyGeekstoreOrders,
    getMyGeekstoreOrderById,
    cancelMyGeekstoreOrder
} from '../../controllers/geekstore.controller.js';

const router = express.Router();

// Catalog routes (Public / User)
router.get('/', listGeekstoreItems);
router.get('/items', listGeekstoreItems);
router.get('/items/:itemId', getGeekstoreItemById);

// Cart routes (Authenticated User)
router.get('/cart', userAuth, getMyCart);
router.post('/cart/items', userAuth, addToCart);
router.patch('/cart/items/:cartItemId', userAuth, updateCartItem);
router.delete('/cart/items/:cartItemId', userAuth, removeCartItem);
router.delete('/cart', userAuth, clearCart);
router.post('/cart/checkout', userAuth, checkoutCart);

// Direct Purchase ("Buy Now") route (Authenticated User)
router.post('/items/:itemId/buy', userAuth, createDirectOrder);

// User Order routes (Authenticated User)
router.get('/orders/me', userAuth, getMyGeekstoreOrders);
router.get('/orders/:orderId', userAuth, getMyGeekstoreOrderById);
router.post('/orders/:orderId/cancel', userAuth, cancelMyGeekstoreOrder);

export default router;
