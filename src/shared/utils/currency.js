/**
 * Currency formatting utility for consistent currency display across the app
 */

/**
 * Format amount to Indian Rupee currency format
 * @param {number} amount - The amount to format
 * @param {boolean} includeSymbol - Whether to include the ₹ symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, includeSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const formatted = parseFloat(amount).toFixed(2);
  return includeSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format amount to Indian Rupee currency format with Indian number system (lakhs, crores)
 * @param {number} amount - The amount to format
 * @param {boolean} includeSymbol - Whether to include the ₹ symbol (default: true)
 * @returns {string} Formatted currency string in Indian number system
 */
export const formatCurrencyIndian = (amount, includeSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const formatted = parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return includeSymbol ? `₹${formatted}` : formatted;
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse (e.g., "₹1,234.56" or "1234.56")
 * @returns {number} Parsed number
 */
export const parseCurrency = (currencyString) => {
  if (typeof currencyString === 'number') {
    return currencyString;
  }

  if (!currencyString) {
    return 0;
  }

  // Remove currency symbol and commas, then parse
  const cleaned = currencyString.toString().replace(/[₹,]/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Add currency formatting to EJS templates
 * @param {object} app - Express app instance
 */
export const registerCurrencyHelpers = (app) => {
  if (app && app.locals) {
    app.locals.formatCurrency = formatCurrency;
    app.locals.formatCurrencyIndian = formatCurrencyIndian;
    app.locals.parseCurrency = parseCurrency;
  }
};

export default {
  formatCurrency,
  formatCurrencyIndian,
  parseCurrency,
  registerCurrencyHelpers,
};
