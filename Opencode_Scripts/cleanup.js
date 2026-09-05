import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const KEEP_GITHUB_ID = "23abdul23";

async function main() {
  console.log("🚨 Starting destructive cleanup");
  console.log(`🛡️ Preserving User + Admin: ${KEEP_GITHUB_ID}\n`);

  // 1️⃣ DELETE PRs (based on ISSUE ownership, NOT submitter)
  const pr = await prisma.pR.deleteMany({
    where: {
      issue: {
        assigneeId: { not: KEEP_GITHUB_ID },
      },
    },
  });
  console.log(`🗑️ PRs deleted: ${pr.count}`);

  // 2️⃣ Leaderboard Snapshots
  // const lbs = await prisma.leaderboardSnapshot.deleteMany({
  //   where: {
  //     participantId: { not: KEEP_GITHUB_ID },
  //   },
  // });
  // console.log(`🗑️ LeaderboardSnapshots deleted: ${lbs.count}`);

  // 3️⃣ Leaderboard Entries
  const lbe = await prisma.leaderboardEntry.deleteMany({
    where: {
      participantId: { not: KEEP_GITHUB_ID },
    },
  });
  console.log(`🗑️ LeaderboardEntries deleted: ${lbe.count}`);

  // 4️⃣ Issues (now SAFE – no PRs reference them)
  const issues = await prisma.issue.deleteMany({
    where: {
      assigneeId: { not: KEEP_GITHUB_ID },
    },
  });
  console.log(`🗑️ Issues deleted: ${issues.count}`);

  // 5️⃣ Participants
  const participants = await prisma.participant.deleteMany({
    where: {
      participantId: { not: KEEP_GITHUB_ID },
    },
  });
  console.log(`🗑️ Participants deleted: ${participants.count}`);

  // 6️⃣ Admins (EXCEPT keeper)
  const admins = await prisma.admin.deleteMany({
    where: {
      userId: { not: KEEP_GITHUB_ID },
    },
  });
  console.log(`🗑️ Admins deleted: ${admins.count}`);

  // 7️⃣ Users (EXCEPT keeper)
  const users = await prisma.user.deleteMany({
    where: {
      githubId: { not: KEEP_GITHUB_ID },
    },
  });
  console.log(`🗑️ Users deleted: ${users.count}`);

  console.log("\n✅ Cleanup completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
