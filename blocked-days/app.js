const express = require('express');
const session = require('express-session');
const { Firestore } = require('@google-cloud/firestore');
const FirestoreStore = require('firestore-store')(session);
const dotenv = require('dotenv');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const SettingsService = require('./services/SettingsService');

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloud Run)
const port = process.env.PORT || 8080;

app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firestore
const firestore = new Firestore({ databaseId: 'rutherford-prime-meats' });

// Initialize application settings if missing
SettingsService.initSettings().catch(console.error);

// Session setup
app.use(
  session({
    store: new FirestoreStore({
      database: firestore,
      collection: 'express-sessions',
    }),
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    },
  })
);

// Routers
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Frontend Routes
app.get('/', async (req, res) => {
  if (req.session.user && ['user', 'admin'].includes(req.session.user.role)) {
    return res.redirect('/dashboard');
  }
  
  const registrationEnabled = await SettingsService.isRegistrationEnabled();
  res.render('index', { user: req.session.user, registrationEnabled });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role === 'guest') {
    return res.redirect('/');
  }
  res.render('dashboard', { user: req.session.user });
});

app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/dashboard'); // or home
  }
  res.render('admin', { user: req.session.user });
});

app.listen(port, () => {
  console.log(`Blocked Days app listening on port ${port}`);
});
