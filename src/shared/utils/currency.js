


export const formatCurrency = (amount, includeSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const formatted = parseFloat(amount).toFixed(2);
  return includeSymbol ? `₹${formatted}` : formatted;
};


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


export const parseCurrency = (currencyString) => {
  if (typeof currencyString === 'number') {
    return currencyString;
  }

  if (!currencyString) {
    return 0;
  }

  
  const cleaned = currencyString.toString().replace(/[₹,]/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};


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
