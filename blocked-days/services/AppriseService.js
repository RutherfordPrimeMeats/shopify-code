const { fork } = require('child_process');
const path = require('path');

class AppriseService {
  /**
   * Send an admin notification asynchronously using a forked child process
   */
  static sendAdminNotification(title, message) {
    const appriseUrl = process.env.APPRISE_REPORT_URL;
    
    if (!appriseUrl) {
      console.warn('[AppriseService] Missing APPRISE_REPORT_URL. Skipping notification.');
      return;
    }

    console.log(`[AppriseService] Sending notification: ${title} - ${message}`);

    // Fork a child process to handle the notification asynchronously
    const child = fork(path.join(__dirname, 'apprise-worker.js'), {
      silent: true,
    });

    // Send the notification data to the child process
    child.send({ title, message, appriseUrl });

    // Handle child process errors
    child.on('error', (error) => {
      console.error('[AppriseService] Child process error:', error);
    });

    // Clean up when child process exits
    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[AppriseService] Child process exited with code ${code}`);
      }
    });

    // Optionally disconnect after a timeout to prevent hanging
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
      }
    }, 30000);
  }
}

module.exports = AppriseService;