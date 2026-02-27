class NtfyService {
  /**
   * Send a notification to the admin ntfy.sh topic
   */
  static async sendAdminNotification(title, message) {
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
      if (!response.ok) {
        console.error(`[NtfyService] Failed to send notification. Status: ${response.status}`);
      } else {
        console.log(`[NtfyService] Successfully sent notification.`);
      }
    } catch (error) {
      console.error('[NtfyService] Error sending notification:', error);
    }
  }
}

module.exports = NtfyService;
