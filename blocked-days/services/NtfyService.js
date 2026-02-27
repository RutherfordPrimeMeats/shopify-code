class NtfyService {
  static queue = [];
  static isProcessing = false;
  static backoffTime = 2000; // 2 seconds default backoff

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
   * Process the notification queue recursively with delays
   */
  static async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { title, message } = this.queue[0]; // Peek at the first item

    try {
      console.log(`[NtfyService] Sending notification: ${title} - ${message}`);
      const response = await fetch('https://ntfy.sh/rpm-blocked-days-app', {
        method: 'POST',
        headers: {
          'Title': title,
          'Tags': 'info'
        },
        body: message,
      });

      if (response.status === 429) {
        console.warn(`[NtfyService] Rate limited (429). Retrying in ${this.backoffTime / 1000} seconds...`);
        // Wait and retry the same item using exponential-ish backoff
        setTimeout(() => this.processQueue(), this.backoffTime);
        this.backoffTime = Math.min(this.backoffTime * 2, 60000); // Max 1 minute backoff
        return;
      }

      // Success or other non-429 failure
      if (!response.ok) {
        console.error(`[NtfyService] Failed to send notification. Status: ${response.status}`);
      } else {
        console.log(`[NtfyService] Successfully sent notification.`);
        this.backoffTime = 2000; // Reset backoff on success
      }

      // Remove the successfully (or permanently failed) item from the queue
      this.queue.shift();
      // Process next item after a short delay (1 second) to be safe
      setTimeout(() => this.processQueue(), 1000);

    } catch (error) {
      console.error('[NtfyService] Error sending notification:', error);
      // Remove it on hard crash and continue
      this.queue.shift();
      setTimeout(() => this.processQueue(), 1000);
    }
  }
}

module.exports = NtfyService;
