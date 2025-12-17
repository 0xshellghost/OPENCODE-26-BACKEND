import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();


const ORG_NAME = "OpenCode2025"; // e.g. geekhaven-opencode
const GITHUB_TOKEN = process.env.GITHUB_TOKEN_BOT;

const githubUsers = [
  "07calc",
  "joYBoY1210",
  "Pratikrkcha",
  "BluesIsekai",
  "23abdul23",
  "Washiki",
  "Shravanimath",
  "VaidikKindaCodes",
  "MishtiGarg250",
  "Aryan9059",
  "adith-nr",
  "sankalpj47",
  "Suvanwita",
  "Surya-Raghuram",
  "Paraspandey-debugs",
  "angrycrax",
  "Dheeraj-06",
  "aadyagupta23",
  "Aryan-coder06",
  "SaqlainSQX",
  "HGRgamer",
  "vichanshu",
  "Scorchedpearl",
  "yash194",
  "sahilgupta2006",
  "Zonedoutdg",
  "Rational-Idiot",
  "bitflipper19",
  "ShubhamKumarSahu-svg",
  "Soham-Donode",
  "Vinesh-27",
  "shrmaanubhav",
  "krichyrich",
  "kyanmahajan",
  "ShonWaghchoure",
  "Jazzrahi"
];

async function inviteUser(username) {
  const res = await fetch(
    `https://api.github.com/orgs/${ORG_NAME}/invitations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        invitee_id: null,
        email: null,
        role: "direct_member"
      })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Failed for ${username}:`, text);
    return;
  }

  console.log(`✅ Invitation sent to ${username}`);
}

async function run() {
  for (const user of githubUsers) {
    await inviteUser(user);
  }
}

run();
