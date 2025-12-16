import express from 'express';
import { getLeaderboardProgress, getParticipantProgress } from '../../controllers/leaderboard.controller.js';
const router = express.Router();

router.get('/health', (req, res) => res.send('OK'))
router.get('/progress', getLeaderboardProgress);
router.get('/progress/:participantId', getParticipantProgress);
export default router;