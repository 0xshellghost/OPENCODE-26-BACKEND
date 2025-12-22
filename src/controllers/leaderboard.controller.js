// controllers/leaderboard.controller.js
import prisma from '../config/db.config.js';
import { response_200, response_500 } from '../utils/responseCodes.js';
import { headerChecker } from '../utils/helpers.js';

const dateToYMD = (d) => d.toISOString().slice(0, 10);

export const getLeaderboardProgress = async (req, res) => {
  try {
    const { eventName } = req.query;
    if (!eventName) return response_500(res, 'Missing eventName');

    const currentUserGithubId = req.user?.id || null;

    // 1️⃣ Fetch all leaderboard events for the event
    const events = await prisma.leaderboardEvent.findMany({
      where: { eventName },
      include: {
        participant: {
          include: {
            User: {
              select: {
                name: true,
                avatarUrl: true,
                githubId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 2️⃣ Group by participant & build cumulative timeline
    const map = new Map();
    for (const e of events) {
      const pid = e.participantId;

      if (!map.has(pid)) {
        map.set(pid, {
          participantId: pid,
          githubId: e.participant?.User?.githubId ?? null,
          name: e.participant?.User?.name ?? pid,
          avatarUrl: e.participant?.User?.avatarUrl ?? null,
          data: [],
          _total: 0 // internal accumulator
        });
      }

      const entry = map.get(pid);

      entry._total += e.pointsDelta;

      entry.data.push({
        date: e.createdAt,
        points: entry._total
      });
    }

    // 3️⃣ Convert map → array
    let list = Array.from(map.values());

    // 4️⃣ Compute final points
    list = list.map(({ _total, ...p }) => ({
      ...p,
      finalPoints: _total
    }));

    // 5️⃣ Sort by final score
    list.sort((a, b) => b.finalPoints - a.finalPoints);

    const TOP_N = 5;
    let topList = list.slice(0, TOP_N);

    // 6️⃣ Ensure current user is included
    if (
      currentUserGithubId &&
      !topList.some(p => p.participantId === currentUserGithubId)
    ) {
      const currentUserData = list.find(
        p => p.participantId === currentUserGithubId
      );
      if (currentUserData) {
        topList.push(currentUserData);
      }
    }

    // 7️⃣ Remove helper fields
    topList = topList.map(({ finalPoints, githubId, ...rest }) => rest);

    return response_200(res, 'OK', topList);
  } catch (error) {
    console.error(error);
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