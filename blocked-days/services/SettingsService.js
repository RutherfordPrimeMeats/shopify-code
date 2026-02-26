const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ databaseId: 'rutherford-prime-meats' });
const SETTINGS_COLLECTION = 'settings';
const MAIN_SETTINGS_DOC = 'app_settings';

class SettingsService {
  /**
   * Initialize settings if they don't exist
   */
  static async initSettings() {
    const docRef = db.collection(SETTINGS_COLLECTION).doc(MAIN_SETTINGS_DOC);
    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({ registration_enabled: true });
    }
  }

  /**
   * Check if registration is enabled
   */
  static async isRegistrationEnabled() {
    const docRef = db.collection(SETTINGS_COLLECTION).doc(MAIN_SETTINGS_DOC);
    const doc = await docRef.get();
    if (!doc.exists) {
      return true; // Default
    }
    return doc.data().registration_enabled;
  }

  /**
   * Toggle registration
   */
  static async setRegistrationEnabled(enabled) {
    const docRef = db.collection(SETTINGS_COLLECTION).doc(MAIN_SETTINGS_DOC);
    await docRef.set({ registration_enabled: enabled }, { merge: true });
  }
}

module.exports = SettingsService;
