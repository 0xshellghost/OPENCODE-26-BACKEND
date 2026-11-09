import express from 'express';
import {
    getPlatformFeatures,
    updatePlatformFeatures
} from '../../controllers/features.controller.js';
import userAuth from '../../middlewares/userAuth.middleware.js';
import { isAdmin } from '../../middlewares/isAdmin.middleware.js';

const router = express.Router();

// Public route to fetch active feature flags
router.get('/', getPlatformFeatures);

// Admin-protected routes to update feature flags
router.patch('/', userAuth, isAdmin, updatePlatformFeatures);
router.put('/', userAuth, isAdmin, updatePlatformFeatures);

export default router;
