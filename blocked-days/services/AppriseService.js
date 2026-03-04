const { execFile } = require('child_process');

class AppriseService {
  /**
   * Send a notification asynchronously
   */
  static sendAdminNotification(title, message) {
    const appriseUrl = process.env.APPRISE_REPORT_URL;
    
    if (!appriseUrl) {
      console.warn('[AppriseService] Missing APPRISE_REPORT_URL. Skipping notification.');
      return;
    }

    console.log(`[AppriseService] Sending notification: ${title} - ${message}`);

    // execFile runs asynchronously in the background and won't block the Node.js event loop
    execFile('apprise', ['-t', title, '-b', message, appriseUrl], (error, stdout, stderr) => {
      if (error) {
        console.error(`[AppriseService] Failed to send notification. Error: ${error.message}`);
        console.error(`[AppriseService] stderr: ${stderr}`);
        return;
      }
      console.log(`[AppriseService] Successfully sent notification.`);
    });
  }
}

module.exports = AppriseService;
