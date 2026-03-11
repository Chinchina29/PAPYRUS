export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // For AJAX requests, return JSON
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required',
            redirectUrl: '/login'
        });
    }
    // For regular requests, show 401 page
    res.status(401).render('error/401');
};

export const isNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/home');
    }
    next();
};

export const isAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).render('error/401');
    }
    
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).render('error/403');
    }
    
    next();
};

export const setUserLocals = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.userId;
    next();
};
