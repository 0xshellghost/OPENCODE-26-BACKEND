import express from 'express';
import { getLeaderboardProgress, getParticipantProgress } from '../../controllers/leaderboard.controller.js';
const router = express.Router();

import { optionalUserAuth } from '../../middlewares/userAuth.middleware.js';

router.get('/health', (req, res) => res.send('OK'))
router.get('/progress', optionalUserAuth, getLeaderboardProgress);
router.get('/progress/:participantId', getParticipantProgress);
export default router;