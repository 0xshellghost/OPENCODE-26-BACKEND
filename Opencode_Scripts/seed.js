import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

/* =======================
   EVENT CONFIG
======================= */
const EVENT_NAME = "Opencode2025";
const START_DATE = new Date("2024-12-26");
const END_DATE = new Date("2025-01-25");

/* =======================
   ISSUE POINTS (WEIGHTED)
======================= */
const ISSUE_POINTS_POOL = [
  5, 5, 5,
  10, 10, 10,
  15, 15,
  20, 20,
  25,
  30,
  40,
  50
];

/* =======================
   HELPERS
======================= */

// biased toward early registration (realistic)
function randomRegistrationDate(start, end) {
  const t = Math.random() ** 1.7;
  return new Date(start.getTime() + t * (end.getTime() - start.getTime()));
}

function getDatesBetween(start, end) {
  const dates = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/* =======================
   ADMIN
======================= */
async function createAdmin() {
  return prisma.admin.upsert({
    where: { userId: "opencode-admin" },
    update: {},
    create: {
      user: {
        create: {
          name: "Opencode Admin",
          email: "admin@opencode.dev",
          avatarUrl: faker.image.avatar(),
          college: "IIIT Allahabad",
          graduationYear: 2026,
          branch: "CSE",
          degree: "B.Tech",
          githubId: "opencode-admin",
          isAdmin: true
        }
      }
    }
  });
}

/* =======================
   PARTICIPANTS (WITH REGISTRATION DATE)
======================= */
async function createParticipants(count = 100) {
  const participants = [];

  for (let i = 0; i < count; i++) {
    const githubId = faker.internet.username().toLowerCase();
    const registeredAt = randomRegistrationDate(START_DATE, END_DATE);

    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: `${githubId}@opencode.dev`,
        avatarUrl: faker.image.avatar(),
        college: faker.helpers.arrayElement([
          "IIIT Allahabad",
          "IIT Kanpur",
          "IIT BHU",
          "NIT Allahabad"
        ]),
        graduationYear: faker.number.int({ min: 2025, max: 2028 }),
        branch: "CSE",
        degree: "B.Tech",
        githubId,
        createdAt: registeredAt
      }
    });

    const participant = await prisma.participant.create({
      data: { participantId: user.githubId }
    });

    participants.push({
      ...participant,
      registeredAt
    });
  }

  return participants;
}

/* =======================
   EVENT
======================= */
async function createEvent(adminId) {
  return prisma.event.upsert({
    where: { name: EVENT_NAME },
    update: {},
    create: {
      name: EVENT_NAME,
      description: "Month long open-source hackathon",
      creatorId: adminId,
      startDate: START_DATE,
      endDate: END_DATE
    }
  });
}

/* =======================
   REPOS
======================= */
async function createRepos(adminId) {
  const repos = [];
  for (let i = 1; i <= 25; i++) {
    repos.push(
      await prisma.repo.create({
        data: {
          name: `opencode-repo-${i}`,
          description: faker.lorem.sentence(),
          creatorId: adminId,
          eventName: EVENT_NAME
        }
      })
    );
  }
  return repos;
}

/* =======================
   ISSUES
======================= */
async function createIssues(repos) {
  const issues = [];
  for (const repo of repos) {
    const issueCount = faker.number.int({ min: 5, max: 15 });
    for (let i = 1; i <= issueCount; i++) {
      issues.push(
        await prisma.issue.create({
          data: {
            repoName: repo.name,
            issueNumber: i,
            title: faker.hacker.phrase(),
            openForAll: faker.helpers.arrayElement([true, false]),
            currentPoints: faker.helpers.arrayElement(ISSUE_POINTS_POOL)
          }
        })
      );
    }
  }
  return issues;
}

/* =======================
   PR SIMULATION (EVENT-ACCURATE)
======================= */
function getAttempts(points) {
  if (points <= 5) return faker.number.int({ min: 3, max: 6 });
  if (points <= 10) return faker.number.int({ min: 3, max: 5 });
  if (points <= 15) return faker.number.int({ min: 2, max: 4 });
  if (points <= 20) return faker.number.int({ min: 2, max: 3 });
  if (points <= 25) return faker.number.int({ min: 1, max: 3 });
  if (points <= 30) return faker.number.int({ min: 1, max: 2 });
  if (points <= 40) return faker.number.int({ min: 1, max: 2 });
  return 1;
}

function baseMergeProbability(points) {
  if (points <= 10) return 0.85;
  if (points <= 25) return 0.65;
  return 0.40;
}

function buildContributorSkill(participants) {
  const skill = new Map();
  for (const p of participants) {
    const r = Math.random();
    if (r < 0.1) skill.set(p.participantId, 1.3);
    else if (r < 0.4) skill.set(p.participantId, 1.0);
    else skill.set(p.participantId, 0.6);
  }
  return skill;
}

async function createPRs(issues, participants) {
  let prId = 1n;
  const skillMap = buildContributorSkill(participants);

  for (const issue of issues) {
    const attempts = getAttempts(issue.currentPoints);
    const maxMerges = issue.currentPoints >= 30 ? 1 : Infinity;
    let mergedCount = 0;
    const used = new Set();

    for (let i = 0; i < attempts; i++) {
      let contributor;
      do {
        contributor = faker.helpers.arrayElement(participants);
      } while (used.has(contributor.participantId));
      used.add(contributor.participantId);

      const skill = skillMap.get(contributor.participantId);
      let mergeChance = baseMergeProbability(issue.currentPoints) * skill;

      let status = "OPENED";
      let pointsAwarded = 0;

      if (mergedCount < maxMerges && Math.random() < mergeChance) {
        status = "MERGED";
        pointsAwarded = issue.currentPoints;
        mergedCount++;
      } else {
        status = Math.random() < 0.6 ? "REJECTED" : "OPENED";
      }

      await prisma.pR.create({
        data: {
          id: prId++,
          title: faker.git.commitMessage(),
          issueId: issue.id,
          prNumber: faker.number.int({ min: 1, max: 999 }),
          points: pointsAwarded,
          submitterId: contributor.participantId,
          status
        }
      });

      if (issue.currentPoints >= 30 && mergedCount === 1) break;
    }
  }
}

/* =======================
   SNAPSHOTS (FROM REGISTRATION DATE)
======================= */
// async function createLeaderboardSnapshots(participants) {
//   for (const p of participants) {
//     let points = 0;
//     const dates = getDatesBetween(p.registeredAt, END_DATE);
// 
//     for (const date of dates) {
//       points += faker.number.int({ min: 0, max: 20 });
// 
//       await prisma.leaderboardSnapshot.create({
//         data: {
//           participantId: p.participantId,
//           eventName: EVENT_NAME,
//           date,
//           totalPoints: points,
//           PRmerged: Math.floor(points / 50)
//         }
//       });
//     }
//   }
// }

async function createLeaderboardEntriesFromPRs() {
  // group merged PRs by participant
  const mergedPRs = await prisma.pR.groupBy({
    by: ["submitterId"],
    where: {
      status: "MERGED"
    },
    _sum: {
      points: true
    },
    _count: {
      _all: true
    }
  });

  for (const row of mergedPRs) {
    await prisma.leaderboardEntry.create({
      data: {
        participantId: row.submitterId,
        eventName: EVENT_NAME,
        points: row._sum.points ?? 0,
        PRmerged: row._count._all
      }
    });
  }
}


/* =======================
   MAIN
======================= */
async function main() {
  const admin = await createAdmin();
  await createEvent(admin.userId);

  const participants = await createParticipants(100);
  const repos = await createRepos(admin.userId);
  const issues = await createIssues(repos);

  await createPRs(issues, participants);
await createLeaderboardEntriesFromPRs(); // ✅ ADD THIS
// await createLeaderboardSnapshots(participants);

}

main()
  .then(() => console.log("✅ Database seeded successfully"))
  .catch(e => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
