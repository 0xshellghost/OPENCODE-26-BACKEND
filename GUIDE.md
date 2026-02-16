
# Opencode — Testing Guide

This document describes a simple, repeatable process to test the Opencode backend locally using a public webhook receiver (ngrok), a GitHub test organization, and seeded demo data.

## Prerequisites

- Node.js and npm installed
- GitHub account(s): one account you control for testing and an optional separate 'bot' account for automated actions
- ngrok (or any tunneling service) installed and available on PATH
- Access to the project's repository and the `Opencode_Scripts` folder
- Optional: a cloud MySQL instance (e.g. Aiven) for a demo DB

## 1 — Create a GitHub Test Organization

1. Create a new GitHub organization to use for testing (recommended: a dedicated org to avoid affecting real repos).
2. In the organization settings go to **Settings → Webhooks → Add webhook**.
	- Payload URL: will point to your local backend exposed via ngrok (see next section).
	- Content type: `application/json`.
	- Secret: set a secret (save it in your `.env` or server config) so the backend can validate webhook signatures.
	- Which events would you like to trigger this webhook?: choose "Send me everything" or select the specific events you need.

> Note: Organization-level webhooks apply to events for repositories in that organization.

## 2 — Expose Local Backend with ngrok

1. Run your backend locally (the app listens on port `4000` by default):

```
# from the backend folder
npm install
npm start
```

2. Start ngrok forwarding to your local backend port `4000`:

```
ngrok http 4000
```

3. Copy the public (https) forwarding URL from ngrok — for example `https://abcd1234.ngrok.io` — and set the webhook Payload URL to:

```
<ngrok-forwarding-url>/api/v1/github-bot
```

4. Make sure your backend's webhook validation secret matches the secret you set in the GitHub webhook.

## 3 — Create a GitHub OAuth App (for user sign-in)

1. In GitHub navigate to **Settings → Developer settings → OAuth Apps** and create a new OAuth App.
2. Set values:
	- Application name: (e.g. Opencode Dev)
	- Homepage URL: `http://localhost:3000`
	- Authorization callback URL: `http://localhost:4000/api/v1/auth/github/callback`
3. Save the Client ID and Client Secret and add them to your backend environment variables (for example in `.env`).

Tip: Use a separate GitHub account for the bot/service account if you do not want its avatar appearing everywhere. Set that account's avatar to the Opencode logo if desired.

## 4 — Demo Database (optional but recommended)

- For more realistic testing, create a demo MySQL database (Aiven or any cloud provider).
- Update the backend database connection env vars to point to the demo DB and run migrations if needed.

## 5 — Seed Repositories and Users

1. The repository includes seed scripts in `Opencode_Scripts/`.
2. Use the appropriate script to insert demo repos, users, and other required records into the database. Example:

```
node Opencode_Scripts/seed.js
```

3. Create at least two GitHub accounts for testing:
	- One account as the organization admin (owner)
	- One or more accounts for normal users (registered/unregistered scenarios)

4. Use the `labels.js` to add labels on your demo ORG, Our Opencode ORG already have those Labels

Ensure OAuth sign-in works (users can sign in via the OAuth app you created in step 3).

## 6 — Test Scenarios

Test the webhook-driven flows and user interactions. Example scenarios to exercise:

- Create, comment on, label, assign, and close issues. Verify the backend receives the webhook and processes it.
- Open, edit, and merge pull requests. Verify PR webhooks are handled correctly.
- Add comments on issues/PRs from both registered and unregistered users and confirm appropriate responses.
- Trigger label, assignment, and unassignment events.
- Test error cases: invalid webhook signature, missing permissions, or database errors.
- Contributor Creates a PR with Wrong Tempelate, Proper Msg appears by GitBot and shows the Correct tempelate also.
- PR is Not Linked correctly to any issue, Proper Msg to Edit the PR Desc with correct Issue Number
- FCFS Issue PR show correct msg if issue not assigned and PR is raised

- Other many scenarios figure them out  (⸝⸝> ᴗ•⸝⸝).


For each scenario, confirm the expected behavior in the webapp and that the backend logs/webhook handler show the correct processing results.

## Troubleshooting & Tips

- If webhook requests fail, check the ngrok request inspector (http://127.0.0.1:4040) for request/response details.
- If avatar or bot identity appears in many places, use a separate GitHub account for the bot and set its profile appropriately.
- Ensure the webhook secret in GitHub matches the one configured in the backend.
- Use the ngrok HTTPS forwarding URL for webhooks (recommended).

## Quick Checklist

- [ ] Start backend locally on port `4000`
- [ ] Start `ngrok http 4000` and copy forwarding URL
- [ ] Add organization webhook: `<ngrok-url>/api/v1/github-bot`, `application/json`, set secret
- [ ] Create GitHub OAuth app and add client ID/secret to backend env
- [ ] (Optional) Provision demo DB and update connection
- [ ] Run seed scripts: `node Opencode_Scripts/seed.js`
- [ ] Run test scenarios and verify