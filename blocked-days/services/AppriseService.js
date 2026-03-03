const { execFile } = require('child_process');

class AppriseService {
  static queue = [];
  static isProcessing = false;

  /**
   * Add a notification to the queue
   */
  static sendAdminNotification(title, message) {
    this.queue.push({ title, message });
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the notification queue recursively
   */
  static async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { title, message } = this.queue[0]; // Peek at the first item
    
    const appriseUrl = process.env.APPRISE_REPORT_URL;
    
    if (!appriseUrl) {
      console.warn('[AppriseService] Missing APPRISE_REPORT_URL. Skipping notification.');
      this.queue.shift();
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    try {
      console.log(`[AppriseService] Sending notification: ${title} - ${message}`);
      
      await new Promise((resolve, reject) => {
          console.log(`[AppriseService] Spawning apprise with args: ['-t', '${title}', '-b', '${message}', '${appriseUrl.replace(/./g, '*')}']`);
          const proc = execFile('apprise', ['-t', title, '-b', message, appriseUrl], (error, stdout, stderr) => {
          if (error) {
            console.error(`[AppriseService] Failed to send notification. Error: ${error.message}`);
            console.error(`[AppriseService] stderr: ${stderr}`);
            return reject(error);
          }
          console.log(`[AppriseService] Successfully sent notification.`);
            console.log(`[AppriseService] Apprise stdout: ${stdout.trim()}`);
            console.log(`[AppriseService] Apprise stderr: ${stderr.trim()}`);
          resolve();
        });

          // Ensure stdin is closed so apprise doesn't hang waiting for body if it ignores -b
          proc.stdin.end();
      });

      // Remove the successfully (or permanently failed) item from the queue
      this.queue.shift();
      // Process next item after a short delay (1 second) to be safe
      setTimeout(() => this.processQueue(), 1000);

    } catch (error) {
      console.error('[AppriseService] Error sending notification:', error);
      // Remove it on hard crash and continue
      this.queue.shift();
      setTimeout(() => this.processQueue(), 1000);
    }
  }
}

module.exports = AppriseService;
