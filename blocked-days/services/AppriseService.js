const { execFileSync } = require('child_process');

class AppriseService {
  /**
   * Send a notification synchronously
   */
  static sendAdminNotification(title, message) {
    const appriseUrl = process.env.APPRISE_REPORT_URL;
    
    if (!appriseUrl) {
      console.warn('[AppriseService] Missing APPRISE_REPORT_URL. Skipping notification.');
      return;
    }

    console.log(`[AppriseService] Sending notification: ${title} - ${message}`);

    const startTime = Date.now();
    try {
      // execFileSync runs synchronously and will block the Node.js event loop
      execFileSync('apprise', ['-t', title, '-b', message, appriseUrl], { encoding: 'utf-8' });
      const duration = Date.now() - startTime;
      console.log(`[AppriseService] Successfully sent notification in ${duration}ms.`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[AppriseService] Failed to send notification after ${duration}ms. Error: ${error.message}`);
      if (error.stderr) {
        console.error(`[AppriseService] stderr: ${error.stderr}`);
      }
    }
  }
}

module.exports = AppriseService;
