export const show404 = (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(404).json({
            success: false,
            message: "The page you're looking for doesn't exist"
        });
    }
    res.redirect('/?error=The page you\'re looking for doesn\'t exist. It might have been moved or deleted.');
};
export const show500 = (err, req, res, next) => {
    console.error('Server Error:', err);
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(500).json({
            success: false,
            message: "Server error occurred. Our team has been notified and is working on it."
        });
    }
    res.redirect('/?error=A server error occurred. Our team has been notified and we\'re working on it.');
};
export const showAccessDenied = (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(403).json({
            success: false,
            message: "You don't have permission to access this page"
        });
    }
    res.redirect('/?error=You don\'t have permission to access this page.');
};
export const showUnauthorized = (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(401).json({
            success: false,
            message: "Please log in to continue"
        });
    }
    res.redirect('/login?error=Please log in to continue');
};