import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';

// absolute path to your bash script
const BACKUP_SCRIPT = path.resolve('/var/www/server/db_backups/backup_db.sh');

export function startBackupCron() {
  // Runs every day at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log('[CRON] Starting DB backup...');

    exec(`bash ${BACKUP_SCRIPT}`, (error, stdout, stderr) => {
      if (error) {
        console.error('[CRON] Backup failed:', error.message);
        return;
      }

      if (stderr) {
        console.error('[CRON] stderr:', stderr);
      }

      console.log('[CRON] Backup completed successfully');
      if (stdout) console.log('[CRON] stdout:', stdout);
    });
  });

  console.log('[CRON] Backup cron scheduled (daily at 2:00 AM)');
}
