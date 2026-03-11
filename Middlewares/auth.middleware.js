import * as userService from '../services/user.service.js';

export const isAuthenticated = async (req, res, next) => {
    if (req.session && req.session.userId) {
        try {
            const user = await userService.findUserById(req.session.userId);
            if (!user) {
                req.session.destroy();
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(401).json({ 
                        success: false, 
                        message: 'User not found',
                        redirectUrl: '/login'
                    });
                }
                return res.status(401).render('error/401');
            }
            
            if (user.isBlocked) {
                req.session.destroy();
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Your account has been blocked. Please contact support.',
                        redirectUrl: '/login'
                    });
                }
                return res.status(403).render('error/403', { 
                    message: 'Your account has been blocked. Please contact support.' 
                });
            }
            
            req.user = user;
            return next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            req.session.destroy();
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Authentication error',
                    redirectUrl: '/login'
                });
            }
            return res.status(500).render('error/500');
        }
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required',
            redirectUrl: '/login'
        });
    }
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
