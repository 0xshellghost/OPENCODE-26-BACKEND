// controllers/leaderboard.controller.js
import prisma from '../config/db.config.js';
import { response_200, response_500 } from '../utils/responseCodes.js';

const dateToYMD = (d) => d.toISOString().slice(0, 10);

// GET /api/leaderboard/progress?eventName=...&topN=10
export const getLeaderboardProgress = async (req, res) => {
  try {
    const { eventName } = req.query;
    if (!eventName) return response_500(res, 'Missing eventName');

    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { eventName },
      include: {
        participant: {
          include: { User: { select: { name: true, avatarUrl: true, githubId: true } } }
        }
      },
      orderBy: { date: 'asc' }
    });

    const topN = 7;
    // Group into participant => [snapshots...]
    const map = new Map();
    for (const s of snapshots) {
      const pid = s.participantId;
      if (!map.has(pid)) {
        map.set(pid, {
          participantId: pid,
          name: s.participant?.User?.name ?? pid,
          avatarUrl: s.participant?.User?.avatarUrl ?? null,
          data: []
        });
      }
      map.get(pid).data.push({
        date: dateToYMD(s.date),
        points: s.totalPoints
      });
    }

    let list = Array.from(map.values());

    // compute final points and sort desc
    list = list.map((p) => ({
      ...p,
      finalPoints: p.data.length ? p.data[p.data.length - 1].points : 0
    }));
    list.sort((a, b) => b.finalPoints - a.finalPoints);

    const n = parseInt(topN || '0', 10);
    if (n > 0) list = list.slice(0, n);

    // remove helper key
    list = list.map(({ finalPoints, ...rest }) => rest);

    

    return response_200(res, 'OK', list);
  } catch (error) {
    return response_500(res, 'Error', error);
  }
};

// GET /api/leaderboard/progress/:participantId?eventName=...
export const getParticipantProgress = async (req, res) => {
  try {
    const { participantId } = req.params;
    const { eventName } = req.query;
    if (!participantId || !eventName) return response_500(res, 'Missing params');

    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { participantId, eventName },
      include: { participant: { include: { User: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { date: 'asc' }
    });

    const data = snapshots.map((s) => ({
      date: dateToYMD(s.date),
      points: s.totalPoints
    }));

    const meta = {
      participantId,
      name: snapshots[0]?.participant?.User?.name ?? participantId,
      avatarUrl: snapshots[0]?.participant?.User?.avatarUrl ?? null,
      data
    };

    return response_200(res, 'OK', meta);
  } catch (error) {
    return response_500(res, 'Error', error);
  }
};