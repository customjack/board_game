export const requestAnimationFrameSafe = (callback) => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 16);
};
