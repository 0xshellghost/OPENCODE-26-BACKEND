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
  "habitable-planet-hunter",
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
  "PixDash",
  "EventChain",
  "UXplained",
  "AppCosmos",
  "Ba-Effe",
  "MotionKit",
  "Alum-X-Frontend",
  "Alum-X-Backend",
  "Nommetric"
];


const FirstYrRepo = ['TechTonic']
const GirlsOnlyRepo = ["Fem-care"]

async function main() {
  console.log("📌 Seeding repos...");

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

  for (const repoName of GirlsOnlyRepo) {
    try {
      await prisma.repo.create({
        data: {
          name: repoName,
          creatorId: creatorId,
          eventName: eventName,
          description: "",
          isGirlsOnly: true
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
