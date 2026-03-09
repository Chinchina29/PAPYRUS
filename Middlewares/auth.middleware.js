export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

export const isNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/home');
    }
    next();
};

export const setUserLocals = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.userId;
    next();
};
