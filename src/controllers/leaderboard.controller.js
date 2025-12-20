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

    const snapshots = await prisma.leaderboardSnapshot.findMany({
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
      orderBy: { date: 'asc' }
    });

    // Group snapshots by participant
    const map = new Map();

    for (const s of snapshots) {
      const pid = s.participantId;

      if (!map.has(pid)) {
        map.set(pid, {
          participantId: pid,
          githubId: s.participant?.User?.githubId ?? null,
          name: s.participant?.User?.name ?? pid,
          avatarUrl: s.participant?.User?.avatarUrl ?? null,
          data: []
        });
      }

      const entry = map.get(pid);
      const last = entry.data.at(-1);

      if (!last || last.points !== s.totalPoints) {
        entry.data.push({
          date: s.date,
          points: s.totalPoints
        });
      }
    }

    let list = Array.from(map.values());

    // Compute final points
    list = list.map((p) => ({
      ...p,
      finalPoints: p.data.length
        ? p.data[p.data.length - 1].points
        : 0
    }));

    // Sort by score
    list.sort((a, b) => b.finalPoints - a.finalPoints);

    const TOP_N = 5;
    let topList = list.slice(0, TOP_N);

    if(currentUserGithubId && !topList.some(p => p.participantId === currentUserGithubId)){
      const currentUserData = list.find(p => p.participantId === currentUserGithubId);
      if(currentUserData){
        topList.push(currentUserData);
      }
    }

    // Remove helper keys
    topList = topList.map(({ finalPoints, githubId, ...rest }) => rest);

    return response_200(res, 'OK', topList);
  } catch (error) {
    console.error(error);
    return response_500(res, 'Error', error);
  }
};



/*
export const getLeaderboardProgress = async (req, res) => {
  try {
    const { eventName } = req.query;
    if (!eventName) return response_500(res, 'Missing eventName');

    const currentUserId = req.user?.id || null; // Comes from userAuth middleware

    // Fetch all leaderboard snapshots for the event
    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { eventName },
      include: {
        participant: {
          include: { User: { select: { name: true, avatarUrl: true, githubId: true } } }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Group snapshots by participant
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
      // Only push if score changes (step-wise)
      const last = map.get(pid).data.slice(-1)[0];
      if (!last || last.points !== s.totalPoints) {
        map.get(pid).data.push({
          date: s.date,
          points: s.totalPoints
        });
      }
    }

    let list = Array.from(map.values());

    // Compute final points for sorting
    list = list.map((p) => ({
      ...p,
      finalPoints: p.data.length ? p.data[p.data.length - 1].points : 0
    }));

    // Sort descending by points
    list.sort((a, b) => b.finalPoints - a.finalPoints);

    const TOP_N = 5;
    let topList = list.slice(0, TOP_N);

    // Include current user if not already in top
    if (currentUserId && !topList.some((p) => p.participantId === currentUserId)) {
      // Try to find current user's snapshots
      const currentUserData = list.find((p) => p.participantId === currentUserId);
      if (currentUserData) {
        topList.push(currentUserData);
      } else {
        // fallback: fetch current user info from DB
        const userDb = await prisma.user.findUnique({
          where: { githubId: currentUserId },
          select: { name: true, avatarUrl: true }
        });
        topList.push({
          participantId: currentUserId,
          //name: userDb?.name ?? currentUserId,
          name:"hello",
          avatarUrl: userDb?.avatarUrl ?? null,
          data: [],
          finalPoints: 0
        });
      }
    }

    // Remove helper key before sending
    topList = topList.map(({ finalPoints, ...rest }) => rest);

    console.log(topList)

    return response_200(res, 'OK', topList);
  } catch (error) {
    console.error(error);
    return response_500(res, 'Error', error);
  }
};
*/

/*

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
        date: s.date,
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

*/

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