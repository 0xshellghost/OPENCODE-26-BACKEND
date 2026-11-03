import express from 'express';
import userAuth from '../../middlewares/userAuth.middleware.js';
import {
    listGeekstoreItems,
    getGeekstoreItemById,
    redeemGeekstoreItem,
    getMyGeekstoreOrders,
    getMyGeekstoreOrderById,
    cancelMyGeekstoreOrder,
    getMyGeekcoinWallet,
    getMyGeekcoinTransactions
} from '../../controllers/geekstore.controller.js';

const router = express.Router();

// Catalog routes (Public / User)
router.get('/', listGeekstoreItems);
router.get('/items', listGeekstoreItems);
router.get('/items/:itemId', getGeekstoreItemById);

// Redemption routes (Authenticated User)
router.post('/items/:itemId/redeem', userAuth, redeemGeekstoreItem);
router.post('/redeem/:itemId', userAuth, redeemGeekstoreItem);

// User orders routes (Authenticated User)
router.get('/orders/me', userAuth, getMyGeekstoreOrders);
router.get('/orders/:orderId', userAuth, getMyGeekstoreOrderById);
router.post('/orders/:orderId/cancel', userAuth, cancelMyGeekstoreOrder);

// Wallet and transaction routes (Authenticated User)
router.get('/wallet/me', userAuth, getMyGeekcoinWallet);
router.get('/wallet/transactions/me', userAuth, getMyGeekcoinTransactions);

export default router;
