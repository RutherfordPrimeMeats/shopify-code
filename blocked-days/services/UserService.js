const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ databaseId: 'rutherford-prime-meats' });
const USERS_COLLECTION = 'users';

class UserService {
  /**
   * Get user by ID (which functions as username or primary identifier)
   */
  static async getUserById(userId) {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return doc.data();
  }

  /**
   * Create a new user with 'guest' role by default
   */
  static async createUser(userId, passkeyInfo) {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    const doc = await docRef.get();
    if (doc.exists) {
      throw new Error('User already exists');
    }
    
    const role = 'guest'; // Default role logic

    const userData = {
      id: userId,
      role: role, // Default role logic
      devices: [passkeyInfo], // Store WebAuthn credentials
      createdAt: new Date().toISOString()
    };
    
    await docRef.set(userData);
    return userData;
  }

  /**
   * Add a new passkey device to an existing user
   */
  static async addDeviceToUser(userId, passkeyInfo) {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    
    const data = doc.data();
    const devices = data.devices || [];
    devices.push(passkeyInfo);
    
    await docRef.update({ devices });
  }

  /**
   * Update the user's current webauthn challenge
   */
  static async setCurrentChallenge(userId, challenge) {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    await docRef.update({ currentChallenge: challenge });
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId, newRole) {
    if (!['guest', 'user', 'admin'].includes(newRole)) {
      throw new Error('Invalid role');
    }
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    await docRef.update({ role: newRole });
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId) {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    await docRef.delete();
  }

  /**
   * Get all users
   */
  static async getAllUsers() {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: data.id,
        role: data.role,
        createdAt: data.createdAt
      });
    });
    return users;
  }

  /**
   * Get user by credential ID
   */
  static async getUserByCredentialId(credentialId) {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    let foundUser = null;

    // We have to scan since devices is an array of objects
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const devices = data.devices || [];
      if (devices.some(dev => dev.credentialID === credentialId)) {
        foundUser = data;
        break;
      }
    }
    return foundUser;
  }

  /**
   * Save Web Push subscription
   */
  static async savePushSubscription(userId, subscription) {
    const docRef = db.collection(USERS_COLLECTION).doc(userId);
    await docRef.update({ pushSubscription: subscription });
  }

  /**
   * Get Web Push subscription
   */
  static async getPushSubscription(userId) {
    const user = await this.getUserById(userId);
    return user ? user.pushSubscription : null;
  }
}

module.exports = UserService;
