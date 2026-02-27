/**
 * Manages Server-Sent Events (SSE) connections for clients.
 */
class SSEManager {
  constructor() {
    // A map of userId to an array of response objects
    this.clients = new Map();
  }

  /**
   * Add a new client connection
   * @param {string} userId - The user's ID
   * @param {string} role - The user's role
   * @param {object} res - The Express response object
   */
  addClient(userId, role, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    const userClients = this.clients.get(userId);
    
    // Attach role to the response for targeted broadcasts
    res.userRole = role;
    userClients.push(res);

    // Remove client when connection closes
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  removeClient(userId, res) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.indexOf(res);
      if (index !== -1) {
        userClients.splice(index, 1);
      }
      if (userClients.length === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Send an event to a specific user
   * @param {string} userId - Target user ID
   * @param {string} event - Event name
   * @param {object} data - Event payload
   */
  sendToUser(userId, event, data) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      userClients.forEach(res => {
        try {
          res.write(payload);
        } catch (e) {
          console.error(`Error writing SSE to user ${userId}`, e);
        }
      });
    }
  }

  /**
   * Send an event to all connected admins
   * @param {string} event - Event name
   * @param {object} data - Event payload
   */
  sendToAdmins(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [userId, userClients] of this.clients.entries()) {
      userClients.forEach(res => {
        if (res.userRole === 'admin') {
          try {
            res.write(payload);
          } catch (e) {
             console.error(`Error writing SSE to admin ${userId}`, e);
          }
        }
      });
    }
  }
}

// Export a singleton instance
module.exports = new SSEManager();
