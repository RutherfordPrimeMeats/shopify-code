const express = require('express');
const request = require('supertest');
const apiRouter = require('../routes/api');

// Mock services
jest.mock('../services/ShopifyService', () => ({
  getSoldOutDates: jest.fn().mockResolvedValue(['2025-10-31']),
  saveSoldOutDates: jest.fn().mockResolvedValue(['2025-10-31']),
}));
jest.mock('../services/SettingsService', () => ({
  isRegistrationEnabled: jest.fn().mockResolvedValue(true),
  setRegistrationEnabled: jest.fn().mockResolvedValue(true),
}));

describe('RBAC Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Simple way to inject a mock session for testing API routes
    app.use((req, res, next) => {
      // In tests, we will pass a custom header 'x-mock-role' to simulate sessions
      const role = req.headers['x-mock-role'];
      if (role) {
        req.session = { user: { id: 'testuser', role } };
      } else {
        req.session = {}; // No user
      }
      next();
    });

    app.use('/api', apiRouter);
  });

  test('Guest cannot access /api/dates', async () => {
    const res = await request(app)
      .get('/api/dates')
      .set('x-mock-role', 'guest');
    
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  test('User can access /api/dates', async () => {
    const res = await request(app)
      .get('/api/dates')
      .set('x-mock-role', 'user');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.dates).toEqual(['2025-10-31']);
  });

  test('Admin can access /api/dates', async () => {
    const res = await request(app)
      .get('/api/dates')
      .set('x-mock-role', 'admin');
    
    expect(res.statusCode).toBe(200);
  });

  test('User cannot access /api/admin/settings', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('x-mock-role', 'user');
    
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Admin access required/);
  });

  test('Admin can access /api/admin/settings', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('x-mock-role', 'admin');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.registration_enabled).toBe(true);
  });

});
