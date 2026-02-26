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
    
    const userData = {
      id: userId,
      role: 'guest', // default role
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
}

module.exports = UserService;
