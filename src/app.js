import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import router from './routes/index.js';
import { connDB } from './config/db.config.js';
// import { startLeaderboardSnapshotJob } from "./jobs/leaderboardSnapshot.job.js";
import { startBackupCron } from './jobs/backupCron.job.js';


dotenv.config();
const app = express();
connDB();

const allowedOrigins = new Set([
    'https://events.geekhaven.in',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
]);

app.use(cors({
    origin(origin, callback) {
        // Requests without an Origin header include server-to-server calls and health checks.
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

// Normalize double slashes in incoming request paths (e.g. //api/v1 -> /api/v1)
app.use((req, res, next) => {
    if (req.url.startsWith('//')) {
        req.url = req.url.replace(/^\/+/, '/');
    }
    next();
});

app.use('/api', router);

const port = process.env.PORT || 4000;

app.get('/', (req, res) => res.send('<h1>Welcome to Events Geekhaven API<h1>'));

//BACKUP CRON JOB
startBackupCron();
// startLeaderboardSnapshotJob(); 

app.listen(port, "0.0.0.0", () =>
  console.log(`🚀 Server running on ${process.env.BACKEND_URL || `http://0.0.0.0:${port}`}`)
);
