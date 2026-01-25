import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();


const prisma = new PrismaClient();

function normalizeDate(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function takeDailySnapshots() {
  // Use a full timestamp for this snapshot so repeated runs in the same day
  // do not overwrite the same "date" entry that was normalized to midnight.
  const snapshotTime = new Date();

  // Note: JavaScript `Date` objects are stored in UTC and `toISOString()` prints UTC.
  // The server may be running in a different timezone (or the DB stores timestamptz in UTC),
  // which is why logs showed 13:28Z while your local IST is 18:58. To make logs clearer,
  // print both the ISO/UTC time and a formatted IST time.
  const iso = snapshotTime.toISOString();
  const ist = snapshotTime.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
  console.log(`📸 Running leaderboard snapshot at: ${iso} (IST: ${ist})`);

  const leaderboardEntries = await prisma.leaderboardEntry.findMany({
    select: {
      participantId: true,
      eventName: true,
      points: true,
      PRmerged: true,
    },
  });

  const map = new Map();

  for (const e of leaderboardEntries) {
    const key = `${e.participantId}:${e.eventName}`;
    if (!map.has(key)) {
      map.set(key, {
        participantId: e.participantId,
        eventName: e.eventName,
        totalPoints: 0,
        PRmerged: 0,
      });
    }
    const agg = map.get(key);
    agg.totalPoints += e.points;
    agg.PRmerged += e.PRmerged;
  }

  for (const snap of map.values()) {
    await prisma.leaderboardSnapshot.upsert({
      where: {
        // keep existing unique constraint name — we still provide the unique fields
        participantId_eventName_date: {
          participantId: snap.participantId,
          eventName: snap.eventName,
          date: snapshotTime,
        },
      },
      update: {
        totalPoints: snap.totalPoints,
        PRmerged: snap.PRmerged,
      },
      create: {
        participantId: snap.participantId,
        eventName: snap.eventName,
        date: snapshotTime,
        totalPoints: snap.totalPoints,
        PRmerged: snap.PRmerged,
      },
    });
  }

  console.log(`✅ Snapshot completed (${map.size} entries)`);
}

export function startLeaderboardSnapshotJob() {
  // Schedule is configurable via env `LEADERBOARD_SNAPSHOT_CRON`.
  // Default: every 10 minutes (*/10 * * * *)
  const CRON_SCHEDULE = process.env.LEADERBOARD_SNAPSHOT_CRON || "0 12 * * *";
  // "*/2 * * * *";

  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        await takeDailySnapshots();
      } catch (err) {
        console.error("❌ Snapshot job failed", err);
      }
    },
    {
      timezone: "Asia/Kolkata", // IMPORTANT for IST
    }
  );

  console.log(`⏰ Leaderboard snapshot cron scheduled (${CRON_SCHEDULE} IST)`);
}

