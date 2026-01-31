# Geekhaven Events Backend

## Overview
Node/Express API for Geekhaven events. Uses Prisma + MySQL/MariaDB, GitHub OAuth, and optional GitHub webhooks.

Base URL (local): `http://localhost:4000`  
API prefix: `/api/v1`

## Requirements
- Node.js 20.5.1 (recommended via nvm)
- MySQL or MariaDB

## Setup
1) Install Node 20.5.1
```bash
nvm install 20.5.1
nvm use 20.5.1
```

2) Install dependencies
```bash
npm ci
```

3) Configure environment variables
- Copy `.env.example` to `.env`
- Fill in all required values (see **Environment Variables** below)

4) Run database migrations
```bash
npm run migrate
```

5) Start the server
```bash
npm run dev
```

## Database
Set these in `.env` (example shown):
```
DATABASE_URL=mysql://<user>:<password>@localhost:3306/aidnitra
SHADOW_DATABASE_URL=mysql://<user>:<password>@localhost:3306/aidnitra_shadow
```

To inspect the DB:
```bash
npx prisma studio
```

## GitHub OAuth Setup
1) Create a GitHub OAuth App:
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:4000/api/v1/auth/github/callback`

2) Put the Client ID/Secret into `.env`.

## Webhooks (optional)
- Configure a GitHub webhook to point to:
  `POST /api/v1/github-bot`
- Use the same `WEBHOOK_SECRET` in GitHub and `.env`.

## Environment Variables
From `.env.example`:
- `CLIENT_ID`, `CLIENT_SECRET` (GitHub OAuth)
- `JWT_SECRET`
- `DATABASE_URL`, `SHADOW_DATABASE_URL`
- `PORT`, `BACKEND_URL`
- `ORG_NAME`
- `SUCCESS_REDIRECT_URL`, `USER_DASHBOARD_URL`, `ADMIN_DASHBOARD_URL`
- `WEBHOOK_SECRET`, `GITHUB_TOKEN_BOT`
- `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`

## Project Structure (high level)
```
backend/
  Opencode_Scripts        Useful Scripts to Setup the DB and Testing
  prisma/                 Prisma schema + migrations
  src/
    app.js                Express app bootstrap
    config/               DB config
    controllers/          Route handlers
    middlewares/          Auth, admin, webhook validation
    jobs/                 Cron jobs (backup, leaderboard snapshot)
    routes/               API routes (v1)
    utils/                Shared helpers
```

## API Endpoints (v1)
All routes below are under `/api/v1`.

### Auth
- `GET /auth/github` : Start GitHub OAuth
- `GET /auth/github/callback` : OAuth callback, issues JWT

### Participant / Profile
- `GET /participant/` : Logged-in participant details (requires auth)
- `GET /participant/:participantId/:eventName` : Participant profile by GitHub ID + event
- `GET /participant/:participantId/:eventName/issues?repoName=...` : Participant issues for event (repo filtered)
- `GET /participant/:githubId/:eventName/pr` : Participant PR details (admin view)

### Events
- `GET /events/` : List all events
- `POST /events/register?eventName=...` : Register logged-in user for an event (requires auth)
- `GET /events/:eventName` : Event details
- `GET /events/:eventName/repos` : All repos for an event
- `GET /events/:eventName/repos/:repoName` : Single repo details
- `POST /events/:eventName/repos/add` : Add repo to event (requires auth + admin)
- `GET /events/:eventName/leaderboard` : Event leaderboard

### Register
- `POST /register` : Create participant profile (requires auth)

### Admin (all require auth + admin)
- `POST /admin/create` : Create event (multipart form data)
- `DELETE /admin/delete/:eventName` : Delete event
- `GET /admin/events` : List created events
- `POST /admin/event/:eventName/repos/add` : Add repo to event
- `GET /admin/event/:eventName/repos` : List repos for an event
- `POST /admin/:userId/addAdmin` : Grant admin role
- `PATCH /admin/modify` : Increment PR points
- `GET /admin/:eventName/:participantId/issues?repoName=...` : Participant issues (admin view)

### Leaderboard
- `GET /leaderboard/health` : Health check
- `GET /leaderboard/progress?eventName=...` : Progress graph data (requires auth)
- `GET /leaderboard/progress/:participantId?eventName=...` : Participant progress

### Misc
- `POST /github-bot` : GitHub webhook receiver (signature required)
- `GET /detail/:type/:id` : Utility detail lookup
- `GET /` : API welcome message
- `GET /api/v1` : Version root

## Opencode Scripts (backend/Opencode_Scripts)
Utility scripts for one-off maintenance and seeding. Most are destructive or org-wide.
Run from `backend/` after `npm ci` and with a correct `.env`.

General usage:
```bash
cd backend
node Opencode_Scripts/<script>.js
```

Scripts:
- `add_users_to_org.js` : Invite a fixed list of GitHub users to an org. Edit `ORG_NAME` and `githubUsers`.
- `cleanup.js` : Destructive DB cleanup; preserves a single GitHub ID. Update `KEEP_GITHUB_ID`.
- `delete_repos.js` : Delete a list of repos from an org. Edit `ORG` and `repos`.
- `labels.js` : Create standard issue labels across org repos. Edit `ORG_NAME` and repo list.
- `make_db_copy.sh` : Dumps MySQL DB to `../OPENCODE_testing.sql`. Update `CURRENT_DB`.
- `orphan.js` : Detects orphaned leaderboard entries/participants; prints cleanup hints.
- `reset_admin.js` : Clears admin activity for a specific GitHub ID. Update `ADMIN_GITHUB_ID`.
- `seed.js` : Seeds DB with synthetic event/users/repos/issues/PRs/leaderboard data.
- `seedRepos_to_server.js` : Inserts repo rows for an event. Update `creatorId`, `eventName`, `repoNames`.
- `test.js` : Sanity check for `leaderboardEvent` table counts.
- `webhook.js` : Remove all webhooks from org repos. Set `DRY_RUN` to preview.

Notes:
- These scripts use env vars like `GITHUB_TOKEN_BOT`, `ORG_NAME`, and DB connection values.
- Review each script before running; several perform deletes.

## Troubleshooting
If dependencies are corrupted:
```bash
rm -rf node_modules package-lock.json
npm install
```

# Advice (from terror_quota)
This is where only FOSS will work, All endpoints work correctly But some need to be improve and integrated properly from frontend. Improvements are written in [2026.md](2026.md). These needs to be done and further improvements are upon you.
