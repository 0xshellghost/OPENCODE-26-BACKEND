// seedRepos.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT YOUR VALUES HERE
const creatorId = "23abdul23"; // Admin.userId → references User.githubId
const eventName = "Opencode";   // Event.name must exist

// List of repo names to insert
const repoNames = [
  "SnapMap",
  "SpaceChat",
  "Cyber_lens",
  "Habitable-Planet-Hunter",
  "Subsentry",
  "CampusOR",
  "CC-Chronicles",
  "Blob",
  "Code-Craft",
  "Learn_To_Hack",
  "Fem-care",
  "CareerCraft",
  "Celestial_Vision",
  "Questline",
  "GoGit",
  "Echo",
  "Loktantra",
  "DING",
  "Tightspace",
  "EventChain",
  "UXplained",
  "AppCosmos",
  "DhamaalEffeKa",
  "MotionKit"
];

const FirstYrRepo = ['TechTonic']


async function main() {
  console.log("📌 Seeding repos...");

  // Delete all existing repos first
  // try {
  //   const deleted = await prisma.repo.deleteMany();
  //   console.log(`🗑️  Deleted ${deleted.count} existing repos`);
  // } catch (err) {
  //   console.error('❌ Error deleting existing repos:', err);
  // }

  for (const repoName of repoNames) {
    try {
      await prisma.repo.create({
        data: {
          name: repoName,
          creatorId: creatorId,
          eventName: eventName,
          description: "",
        },
      });

      console.log(`✅ Inserted: ${repoName}`);
    } catch (err) {
      if (err.code === "P2002") {
        console.log(`⚠ Skipped duplicate: ${repoName}`);
      } else {
        console.error(`❌ Error inserting ${repoName}:`, err);
      }
    }
  }

  for (const repoName of FirstYrRepo) {
    try {
      await prisma.repo.create({
        data: {
          name: repoName,
          creatorId: creatorId,
          eventName: eventName,
          description: "",
          isFirstYrOnly: true
        },
      });

      console.log(`✅ Inserted: ${repoName}`);
    } catch (err) {
      if (err.code === "P2002") {
        console.log(`⚠ Skipped duplicate: ${repoName}`);
      } else {
        console.error(`❌ Error inserting ${repoName}:`, err);
      }
    }
  }

  console.log("🎉 Done seeding repos!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
