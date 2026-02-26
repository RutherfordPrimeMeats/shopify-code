const ShopifyService = require('../services/ShopifyService');

describe('ShopifyService Date Processing', () => {

  beforeAll(() => {
    // Mock current date to a fixed point for stable tests
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('formatAndFilterDates removes past dates and formats correctly', () => {
    const inputDates = [
      '2024-12-25', // Past (should be removed)
      '2025-01-10', // Past (should be removed)
      '2025-01-15', // Today (should be kept)
      '2025-02-05', // Future, with leading zero
      '2025-10-31', // Future, no leading zero
      '2025-1-1'    // Malformed input (should be kept, parsed as 2025-01-01, but wait, '2025-1-1' is in the past! It will be removed.)
    ];

    const result = ShopifyService.formatAndFilterDates(inputDates);

    expect(result).toEqual([
      '2025-1-15',  // 2025-01-15 without leading zero in month
      '2025-2-5',   // 2025-02-05 without leading zeros
      '2025-10-31'  // 2025-10-31 stays the same
    ]);
  });

  test('formatAndFilterDates sorts dates chronologically', () => {
    const inputDates = [
      '2025-12-25',
      '2025-06-05',
      '2026-01-01',
      '2025-03-10'
    ];

    const result = ShopifyService.formatAndFilterDates(inputDates);

    expect(result).toEqual([
      '2025-3-10',
      '2025-6-5',
      '2025-12-25',
      '2026-1-1'
    ]);
  });

});
