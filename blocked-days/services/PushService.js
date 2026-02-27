const webPush = require('web-push');

// Configure web-push with VAPID keys
// This requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to be set in environment variables
webPush.setVapidDetails(
  'mailto:bogosj@gmail.com', // or any admin email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushService {
  /**
   * Send a push notification to a specific subscription
   */
  static async sendNotification(subscription, payload) {
    if (!subscription) {
      console.log('[PushService] Tried to send notification but subscription is missing.');
      return;
    }
    try {
      console.log(`[PushService] Attempting to send push to endpoint: ${subscription.endpoint}`);
      console.log(`[PushService] Payload: ${JSON.stringify(payload)}`);
      await webPush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`[PushService] Successfully sent push to endpoint: ${subscription.endpoint}`);
    } catch (error) {
      console.error(`[PushService] Error sending push notification to endpoint ${subscription.endpoint}:`, error);
      if (error.statusCode) {
        console.error(`[PushService] web-push status code: ${error.statusCode}`);
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[PushService] Removing invalid subscription: ${subscription.endpoint}`);
          const UserService = require('./UserService');
          await UserService.removePushSubscriptionByEndpoint(subscription.endpoint).catch(err => {
            console.error('[PushService] Failed to clean up invalid subscription', err);
          });
        }
      }
      if (error.body) {
        console.error(`[PushService] web-push error body: ${error.body}`);
      }
      // If the subscription is no longer valid (e.g. 410 Gone), we should ideally remove it from the DB.
      // For now, we'll just log the error.
    }
  }

  /**
   * Send a push notification to all admins
   */
  static async sendToAdmins(payload) {
    const UserService = require('./UserService');
    const users = await UserService.getAllUsers();
    console.log(`[PushService] sendToAdmins called. Found ${users.length} total users.`);
    const adminSubscriptions = [];
    
    for (const user of users) {
      if (user.role === 'admin') {
        const subs = await UserService.getPushSubscriptions(user.id);
        if (subs && subs.length > 0) {
          console.log(`[PushService] Found admin with ${subs.length} subscriptions: ${user.username || user.id}`);
          adminSubscriptions.push(...subs);
        } else {
          console.log(`[PushService] Found admin, but NO subscription: ${user.username || user.id}`);
        }
      }
    }

    console.log(`[PushService] Total admin subscriptions ready to send: ${adminSubscriptions.length}`);
    const promises = adminSubscriptions.map(sub => this.sendNotification(sub, payload));
    await Promise.allSettled(promises);
  }

  /**
   * Send a push notification to a specific user
   */
  static async sendToUser(userId, payload) {
    const UserService = require('./UserService');
    const subs = await UserService.getPushSubscriptions(userId);
    if (subs && subs.length > 0) {
      const promises = subs.map(sub => this.sendNotification(sub, payload));
      await Promise.allSettled(promises);
    }
  }
}

module.exports = PushService;
