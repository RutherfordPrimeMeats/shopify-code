const axios = require('axios');

class ShopifyService {
  constructor() {
    this.apiSecret = process.env.SHOPIFY_API_SECRET;
    this.baseUrl = process.env.SHOPIFY_BASE_URL; // Should not contain https://, e.g., shopname.myshopify.com
  }

  getAuthUrl(path) {
    if (!this.apiSecret || !this.baseUrl) {
      throw new Error('Missing Shopify configuration in environment variables');
    }
    // E.g., https://username:password@shopname.myshopify.com/admin/api/2023-10/...
    return `https://${this.apiSecret}@${this.baseUrl}${path}`;
  }

  /**
   * Fetch dates from assets/sold-out.js
   * Returns an array of strings like ['2023-10-15', '2023-10-16']
   */
  async getSoldOutDates() {
    const url = this.getAuthUrl('/themes/155701522/assets.json?asset[key]=assets/sold-out.js');
    try {
      const response = await axios.get(url);
      const assetValue = response.data.asset.value;
      
      // Parse out the dates from: window.SOLD_OUT_DATES=['2025-12-25', '2025-12-26'];
      // Or window.SOLD_OUT_DATES=['2024-9-1', '2024-10-31'];
      const match = assetValue.match(/window\.SOLD_OUT_DATES=\[(.*?)\];/);
      if (!match) {
        return [];
      }
      
      const datesRaw = match[1];
      if (!datesRaw.trim()) {
        return [];
      }

      // Split by comma, remove quotes, trim whitespace
      return datesRaw.split(',').map(d => d.replace(/['"]/g, '').trim()).filter(d => d);
    } catch (error) {
      console.error('Error fetching sold out dates from Shopify', error.message);
      throw error;
    }
  }

  /**
   * Remove any dates that are in the past.
   * Format dates without trailing/leading zeros in months or days.
   */
  formatAndFilterDates(dateList) {
    const now = new Date();
    // Normalize to start of today local time (or UTC?)
    // Using string comparison or Date parsing
    now.setHours(0, 0, 0, 0);

    const validDates = new Set();

    for (const d of dateList) {
      // Incoming format might be anything, but we need to ensure YYYY-M-D
      const parts = d.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const dateObj = new Date(year, month - 1, day);
          
          if (dateObj >= now) {
            // Reconstruct in YYYY-M-D format (no leading zeros)
            validDates.add(`${year}-${month}-${day}`);
          }
        }
      }
    }

    return Array.from(validDates).sort((a, b) => {
      const aDate = new Date(a);
      const bDate = new Date(b);
      return aDate - bDate;
    });
  }

  /**
   * Save dates back to assets/sold-out.js
   */
  async saveSoldOutDates(dates) {
    // dates is an array like ['2023-10-15', '2023-10-16']
    const cleanedDates = this.formatAndFilterDates(dates);
    
    // Format to string
    const stringifiedDates = cleanedDates.map(d => `'${d}'`).join(', ');
    const assetValue = `window.SOLD_OUT_DATES=[${stringifiedDates}];`;
    
    const payload = {
      asset: {
        key: 'assets/sold-out.js',
        value: assetValue
      }
    };

    const url = this.getAuthUrl('/themes/155701522/assets.json');
    try {
      await axios.put(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Successfully updated assets/sold-out.js');
      return cleanedDates;
    } catch (error) {
      console.error('Error putting sold out dates to Shopify', error.message);
      throw error;
    }
  }
}

module.exports = new ShopifyService();
