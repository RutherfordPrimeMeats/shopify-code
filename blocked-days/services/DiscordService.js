class DiscordService {
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
    
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const adminUserId = process.env.DISCORD_ADMIN_USER_ID;
    
    if (!botToken || !adminUserId) {
      console.warn('[DiscordService] Missing DISCORD_BOT_TOKEN or DISCORD_ADMIN_USER_ID. Skipping notification.');
      this.queue.shift();
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    try {
      console.log(`[DiscordService] Sending notification: ${title} - ${message}`);
      
      // 1. Create a DM channel with the admin user
      const channelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipient_id: adminUserId })
      });
      
      if (channelResponse.status === 429) {
        console.warn(`[DiscordService] Rate limited on channel creation (429). Retrying in ${this.backoffTime / 1000} seconds...`);
        // Wait and retry the same item using exponential-ish backoff
        setTimeout(() => this.processQueue(), this.backoffTime);
        this.backoffTime = Math.min(this.backoffTime * 2, 60000); // Max 1 minute backoff
        return;
      }
      
      if (!channelResponse.ok) {
        console.error(`[DiscordService] Failed to create DM channel. Status: ${channelResponse.status}`);
        const text = await channelResponse.text();
        console.error(`[DiscordService] Response: ${text}`);
        this.queue.shift();
        setTimeout(() => this.processQueue(), 1000);
        return;
      }
      
      const channelData = await channelResponse.json();
      const channelId = channelData.id;
      
      // 2. Send the message to the DM channel
      const content = `**${title}**\n${message}`;
      const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (messageResponse.status === 429) {
        console.warn(`[DiscordService] Rate limited on message send (429). Retrying in ${this.backoffTime / 1000} seconds...`);
        setTimeout(() => this.processQueue(), this.backoffTime);
        this.backoffTime = Math.min(this.backoffTime * 2, 60000);
        return;
      }

      if (!messageResponse.ok) {
        console.error(`[DiscordService] Failed to send notification. Status: ${messageResponse.status}`);
      } else {
        console.log(`[DiscordService] Successfully sent notification.`);
        this.backoffTime = 2000; // Reset backoff on success
      }

      // Remove the successfully (or permanently failed) item from the queue
      this.queue.shift();
      // Process next item after a short delay (1 second) to be safe
      setTimeout(() => this.processQueue(), 1000);

    } catch (error) {
      console.error('[DiscordService] Error sending notification:', error);
      // Remove it on hard crash and continue
      this.queue.shift();
      setTimeout(() => this.processQueue(), 1000);
    }
  }
}

module.exports = DiscordService;
