import HTTP_STATUS from "../constants/httpStatus.js";
import MESSAGES from "../constants/messages.js";
export const show404 = (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: MESSAGES.CUSTOM.THE_PAGE_YOU_RE_LOOKING_FOR_DOESN_T_EXIST
        });
    }
    res.redirect('/?error=The page you\'re looking for doesn\'t exist. It might have been moved or deleted.');
};
export const show500 = (err, req, res, next) => {
    console.error('Server Error:', err);
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MESSAGES.CUSTOM.SERVER_ERROR_OCCURRED_OUR_TEAM_HAS_BEEN_NOTIFIED_AND_IS_WORKING_ON_IT
        });
    }
    res.redirect('/?error=A server error occurred. Our team has been notified and we\'re working on it.');
};
export const showAccessDenied = (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            message: MESSAGES.CUSTOM.YOU_DON_T_HAVE_PERMISSION_TO_ACCESS_THIS_PAGE
        });
    }
    res.redirect('/?error=You don\'t have permission to access this page.');
};
export const showUnauthorized = (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');
    if (isAjax) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: MESSAGES.CUSTOM.PLEASE_LOG_IN_TO_CONTINUE
        });
    }
    res.redirect('/login?error=Please log in to continue');
};