export const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};
export const throttle = (func, delay) => {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
};
export const createAsyncDebounce = (func, delay) => {
  let timeoutId;
  let lastPromise = Promise.resolve();
  return function (...args) {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          lastPromise = lastPromise.then(() => func.apply(this, args));
          const result = await lastPromise;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
};