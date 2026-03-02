const express = require('express');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const UserService = require('../services/UserService');
const SettingsService = require('../services/SettingsService');
const DiscordService = require('../services/DiscordService');

const router = express.Router();

const rpName = 'Blocked Days App';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:8080`;

// Middleware to check if registration is enabled
async function checkRegistrationEnabled(req, res, next) {
  const enabled = await SettingsService.isRegistrationEnabled();
  if (!enabled) {
    return res.status(403).json({ error: 'Registration is currently disabled.' });
  }
  next();
}

/**
 * Registration: Begin
 */
router.post('/register/begin', checkRegistrationEnabled, async (req, res) => {
  let { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  username = username.toLowerCase();

  // Check if user already exists
  const existingUser = await UserService.getUserById(username);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  try {
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(username)), // Converted to Uint8Array for simplewebauthn
      userName: username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    // Save the challenge temporarily in session
    req.session.currentChallenge = options.challenge;
    req.session.registeringUsername = username;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      return res.json(options);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Registration: Finish
 */
router.post('/register/finish', checkRegistrationEnabled, async (req, res) => {
  const username = req.session.registeringUsername;
  const expectedChallenge = req.session.currentChallenge;

  console.log('--- Register Finish ---');
  console.log('Session ID:', req.sessionID);
  console.log('Attempting to register:', req.body.id);
  console.log('Session Username:', username);
  console.log('Session Challenge:', expectedChallenge);

  if (!username || !expectedChallenge) {
    return res.status(400).json({ error: 'Registration session expired' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Save user to Firestore
      const newDevice = {
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
      };

      await UserService.createUser(username, newDevice);

      // Log them in automatically
      req.session.user = { id: username, role: 'guest' };
      req.session.currentChallenge = undefined;
      req.session.registeringUsername = undefined;

      DiscordService.sendAdminNotification(
        'New User Registration',
        `User ${username} has registered.`
      );

      return res.json({ verified: true });
    }
    return res.status(400).json({ verified: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Login: Begin
 */
router.post('/login/begin', async (req, res) => {
  let { username } = req.body;
  
  let optionsConfig = {
    rpID,
    userVerification: 'preferred',
  };

  if (username) {
    username = username.toLowerCase();
    const user = await UserService.getUserById(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    optionsConfig.allowCredentials = user.devices.map(dev => ({
      id: dev.credentialID,
      transports: dev.transports,
    }));
    req.session.loginUsername = username;
  } else {
    // If no username, clear any old one to avoid confusion
    req.session.loginUsername = undefined;
  }

  try {
    const options = await generateAuthenticationOptions(optionsConfig);

    // Save challenge
    req.session.currentChallenge = options.challenge;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      return res.json(options);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Login: Finish
 */
router.post('/login/finish', async (req, res) => {
  const username = req.session.loginUsername;
  const expectedChallenge = req.session.currentChallenge;

  console.log('--- Login Finish ---');
  console.log('Session ID:', req.sessionID);
  console.log('Attempting to login:', req.body.id);
  console.log('Session Username:', username || 'None (Discoverable)');
  console.log('Session Challenge:', expectedChallenge);

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'Login session expired' });
  }

  let user;
  if (username) {
    user = await UserService.getUserById(username);
  } else {
    user = await UserService.getUserByCredentialId(req.body.id);
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const authenticator = user.devices.find(
      dev => dev.credentialID === req.body.id
    );

    if (!authenticator) {
      return res.status(400).json({ error: 'Authenticator is not registered with this site' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credentialID,
        publicKey: new Uint8Array(Buffer.from(authenticator.credentialPublicKey, 'base64url')),
        counter: authenticator.counter,
      },
    });

    if (verification.verified) {
      // Login successful
      req.session.user = { id: user.id, role: user.role };
      req.session.currentChallenge = undefined;
      req.session.loginUsername = undefined;

      DiscordService.sendAdminNotification(
        'User Logged In',
        `User ${user.id} just logged in.`
      );

      return res.json({ verified: true });
    }
    return res.status(400).json({ verified: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Refresh Session
 */
router.get('/refresh', async (req, res) => {
  if (req.session.user) {
    try {
      const user = await UserService.getUserById(req.session.user.id);
      if (user) {
        req.session.user.role = user.role;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    }
  }

  if (req.session.user && ['user', 'admin'].includes(req.session.user.role)) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/');
  }
});

/**
 * Logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});


module.exports = router;
