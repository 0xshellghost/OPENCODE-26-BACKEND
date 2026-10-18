import express from 'express';
import { getLeaderboardProgress, getParticipantProgress } from '../../controllers/leaderboard.controller.js';
const router = express.Router();

import userAuth from '../../middlewares/userAuth.middleware.js';

router.get('/health', (req, res) => res.send('OK'))
router.get('/progress',userAuth, getLeaderboardProgress);
router.get('/progress/:participantId', getParticipantProgress);
export default router;