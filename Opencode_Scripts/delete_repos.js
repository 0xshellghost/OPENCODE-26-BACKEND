import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const GITHUB_TOKEN_BOT = process.env.GITHUB_TOKEN_BOT;
const ORG = "OpenCode2025";

const repos = ["CC-Chronicles", "TechTonic"];

async function deleteRepo(repoName) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${ORG}/${repoName}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN_BOT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (res.status === 204) {
      console.log(`✅ ${repoName} deleted successfully`);
    } else {
      const errorText = await res.text();
      console.error(`❌ Failed to delete ${repoName}`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${errorText}`);
    }
  } catch (err) {
    console.error(`❌ Error deleting ${repoName}`, err);
  }
}

for (const repo of repos) {
  await deleteRepo(repo);
}
