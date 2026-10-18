/**
 * Remove all webhooks from every repository in an organization
 */
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

const ORG_NAME = "OpenCode2025";          // e.g. geekhaven
const GITHUB_TOKEN = process.env.GITHUB_TOKEN_BOT; // keep secret
const DRY_RUN = false;                    // true = preview only

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
};

// Fetch all repos (handles pagination)
async function getAllRepos() {
  let page = 1;
  let repos = [];

  while (true) {
    const res = await fetch(
      `https://api.github.com/orgs/${ORG_NAME}/repos?per_page=100&page=${page}`,
      { headers }
    );

    if (!res.ok) throw new Error("Failed to fetch repos");

    const data = await res.json();
    if (data.length === 0) break;

    repos.push(...data);
    page++;
  }

  return repos;
}

// Fetch webhooks of a repo
async function getWebhooks(repo) {
  const res = await fetch(
    `https://api.github.com/repos/${ORG_NAME}/${repo}/hooks`,
    { headers }
  );

  if (!res.ok) throw new Error(`Failed to fetch hooks for ${repo}`);
  return res.json();
}

// Delete webhook
async function deleteWebhook(repo, hookId) {
  await fetch(
    `https://api.github.com/repos/${ORG_NAME}/${repo}/hooks/${hookId}`,
    {
      method: "DELETE",
      headers,
    }
  );
}

async function run() {
  console.log("🚀 Starting webhook cleanup...");
  console.log(`🏢 Organization: ${ORG_NAME}`);
  console.log(`🧪 Dry run: ${DRY_RUN}\n`);

  const repos = await getAllRepos();

  for (const repo of repos) {
    console.log(`📦 Repo: ${repo.name}`);

    const hooks = await getWebhooks(repo.name);

    if (hooks.length === 0) {
      console.log("  ↳ No webhooks found");
      continue;
    }

    for (const hook of hooks) {
      console.log(
        `  ❌ Webhook ${hook.id} → ${hook.config?.url || "unknown"}`
      );

      if (!DRY_RUN) {
        await deleteWebhook(repo.name, hook.id);
      }
    }
  }

  console.log("\n✅ Webhook cleanup completed");
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
});
