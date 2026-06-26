const pendingOperations = new Map();
export const debounceAsync = (key, operation, delay = 500) => {
  return new Promise((resolve, reject) => {
    if (pendingOperations.has(key)) {
      clearTimeout(pendingOperations.get(key).timeout);
    }
    const timeout = setTimeout(async () => {
      try {
        const result = await operation();
        pendingOperations.delete(key);
        resolve(result);
      } catch (error) {
        pendingOperations.delete(key);
        reject(error);
      }
    }, delay);
    pendingOperations.set(key, { timeout, resolve, reject });
  });
};
export const throttleAsync = (key, operation, delay = 1000) => {
  const now = Date.now();
  const lastExecution = throttleAsync.lastExecutions?.get(key) || 0;
  if (!throttleAsync.lastExecutions) {
    throttleAsync.lastExecutions = new Map();
  }
  if (now - lastExecution < delay) {
    return Promise.reject(new Error('Operation throttled. Please wait before trying again.'));
  }
  throttleAsync.lastExecutions.set(key, now);
  return operation();
};
export const createRateLimitedFunction = (func, maxCalls = 10, windowMs = 60000) => {
  const calls = new Map();
  return async (...args) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const userKey = args[0];
    const userCalls = calls.get(userKey) || [];
    const recentCalls = userCalls.filter(callTime => callTime > windowStart);
    if (recentCalls.length >= maxCalls) {
      throw new Error(`Rate limit exceeded. Maximum ${maxCalls} calls per ${windowMs/1000} seconds.`);
    }
    recentCalls.push(now);
    calls.set(userKey, recentCalls);
    return await func(...args);
  };
};
