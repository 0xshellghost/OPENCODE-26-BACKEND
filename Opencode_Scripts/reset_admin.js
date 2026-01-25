import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_GITHUB_ID = "23abdul23";

async function main() {
  console.log(`🔄 Resetting admin activity for ${ADMIN_GITHUB_ID}`);

  // 1️⃣ Delete PRs
  const pr = await prisma.pR.deleteMany({
    where: {
      submitterId: ADMIN_GITHUB_ID,
    },
  });
  console.log(`🗑️ PRs deleted: ${pr.count}`);

  // 2️⃣ Delete Issues assigned to admin
  const issues = await prisma.issue.deleteMany({
    where: {
      assigneeId: ADMIN_GITHUB_ID,
    },
  });
  console.log(`🗑️ Issues deleted: ${issues.count}`);

  // 3️⃣ Leaderboard Snapshots
  const lbs = await prisma.leaderboardSnapshot.deleteMany({
    where: {
      participantId: ADMIN_GITHUB_ID,
    },
  });
  console.log(`🗑️ LeaderboardSnapshots deleted: ${lbs.count}`);

  // 4️⃣ Leaderboard Entries
  const lbe = await prisma.leaderboardEntry.deleteMany({
    where: {
      participantId: ADMIN_GITHUB_ID,
    },
  });
  console.log(`🗑️ LeaderboardEntries deleted: ${lbe.count}`);

  // 5️⃣ Delete Participant row (KEY STEP)
  const participant = await prisma.participant.deleteMany({
    where: {
      participantId: ADMIN_GITHUB_ID,
    },
  });
  console.log(`🗑️ Participant deleted: ${participant.count}`);

  console.log("\n✅ Admin is now clean (0 PRs, 0 issues, 0 points)");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
