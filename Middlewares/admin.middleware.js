export const isAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/admin/signin');
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).render('error/403');
    }
    next();
};

export const isAdminNotAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    next();
};
