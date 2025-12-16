import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const LABELS = [
  // Participation
  { name: "everyone", color: "0e8a16" },
  { name: "open-for-all", color: "1d76db" },
  { name: "competitive", color: "5319e7" },

  // Points
  { name: "Points: 5", color: "c5def5" },
  { name: "Points: 10", color: "c5def5" },
  { name: "Points: 15", color: "c5def5" },
  { name: "Points: 20", color: "c5def5" },
  { name: "Points: 25", color: "c5def5" },
  { name: "Points: 30", color: "c5def5" },
  { name: "Points: 35", color: "c5def5" },
  { name: "Points: 40", color: "c5def5" },
  { name: "Points: 45", color: "c5def5" },
  { name: "Points: 50", color: "c5def5" },

  // Tech stack
  { name: "frontend", color: "f9d0c4" },
  { name: "backend", color: "f9d0c4" },
  { name: "fullstack", color: "f9d0c4" },
  { name: "react", color: "61dafb" },
  { name: "nodejs", color: "43853d" },
  { name: "blockchain", color: "f7931e" },

  // Issue type
  { name: "bug", color: "d73a4a" },
  { name: "feature", color: "a2eeef" },
  { name: "documentation", color: "0075ca" },
  { name: "design", color: "e99695" }
];



const ORG_NAME = "OpenCode2025";
const TOKEN = process.env.GITHUB_TOKEN_BOT;

if (!TOKEN) {
  console.error("❌ GITHUB_TOKEN not set");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
};

async function getAllRepos() {
  let repos = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/orgs/${ORG_NAME}/repos?per_page=100&page=${page}`,
      { headers }
    );
    const data = await res.json();
    if (data.length === 0) break;
    repos.push(...data);
    page++;
  }

  return repos;
}

async function createLabel(repo, label) {
  const url = `https://api.github.com/repos/${ORG_NAME}/${repo}/labels`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(label),
  });

  if (res.status === 422) {
    console.log(`⚠️  ${repo}: label "${label.name}" already exists`);
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ ${repo}: ${err}`);
    return;
  }

  console.log(`✅ ${repo}: added "${label.name}"`);
}

async function run() {
  const repos = await getAllRepos();
  console.log(`🔍 Found ${repos.length} repositories`);

  for (const repo of repos) {
    for (const label of LABELS) {
      await createLabel(repo.name, label);
    }
  }

  console.log("🎉 Done! Labels synced across organization.");
}

run();
