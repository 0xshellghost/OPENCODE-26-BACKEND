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

    // Fetch all leaderboard events for the event
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

    console.log(`Fetched ${events.length} leaderboard events for event "${eventName}"`);

    if (!events.length) return response_200(res, 'OK', []);

    // Group by participant & build cumulative timeline
    const map = new Map();
    for (const e of events) {
      // Skip orphaned rows (no participant relation)
      if (!e.participant || !e.participantId) continue;

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

    // Convert map → array
    let list = Array.from(map.values());

    //Compute final points
    list = list.map(({ _total, ...p }) => ({
      ...p,
      finalPoints: _total
    }));

    //Sort by final score
    list.sort((a, b) => b.finalPoints - a.finalPoints);

    const TOP_N = 5;
    let topList = list.slice(0, TOP_N);

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

    // Fetch all leaderboard events for this participant & event, ordered by creation time
    const events = await prisma.leaderboardEvent.findMany({
      where: { participantId, eventName },
      include: {
        participant: {
          include: { User: { select: { name: true, avatarUrl: true, githubId: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // If no events found, return an empty data timeline
    if (!events.length) {
      const emptyMeta = {
        participantId,
        githubId: null,
        name: participantId,
        avatarUrl: null,
        data: [],
        finalPoints: 0
      };
      return response_200(res, 'OK', emptyMeta);
    }

    // Build cumulative timeline from pointsDelta
    let total = 0;
    const data = events.map((e) => {
      total += e.pointsDelta || 0;
      return {
        date: e.createdAt,
        points: total
      };
    });

    const meta = {
      participantId,
      githubId: events[0]?.participant?.User?.githubId ?? null,
      name: events[0]?.participant?.User?.name ?? participantId,
      avatarUrl: events[0]?.participant?.User?.avatarUrl ?? null,
      data,
      finalPoints: total
    };

    return response_200(res, 'OK', meta);
  } catch (error) {
    return response_500(res, 'Error', error);
  }
};