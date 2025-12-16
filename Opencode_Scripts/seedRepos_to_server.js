// seedRepos.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT YOUR VALUES HERE
const creatorId = "23abdul23"; // Admin.userId → references User.githubId
const eventName = "OPENCODE";   // Event.name must exist

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
  "Tig"
];


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

  console.log("🎉 Done seeding repos!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
