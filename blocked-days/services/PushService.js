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
    if (!subscription) return;
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending push notification:', error);
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
    const adminSubscriptions = [];
    
    for (const user of users) {
      if (user.role === 'admin') {
        const adminUser = await UserService.getUserById(user.id);
        if (adminUser && adminUser.pushSubscription) {
          adminSubscriptions.push(adminUser.pushSubscription);
        }
      }
    }

    const promises = adminSubscriptions.map(sub => this.sendNotification(sub, payload));
    await Promise.allSettled(promises);
  }

  /**
   * Send a push notification to a specific user
   */
  static async sendToUser(userId, payload) {
    const UserService = require('./UserService');
    const user = await UserService.getUserById(userId);
    if (user && user.pushSubscription) {
      await this.sendNotification(user.pushSubscription, payload);
    }
  }
}

module.exports = PushService;
