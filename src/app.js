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

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);

const port = process.env.PORT || 4000;

app.get('/', (req, res) => res.send('<h1>Welcome to Events Geekhaven API<h1>'));

//BACKUP CRON JOB
startBackupCron();
// startLeaderboardSnapshotJob(); 

app.listen(port, "0.0.0.0", () =>
  console.log(`🚀 Server running on ${process.env.BACKEND_URL || `http://0.0.0.0:${port}`}`)
);
