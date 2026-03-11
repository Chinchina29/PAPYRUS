export const show404 = (req, res) => {
    res.status(404).render("error/404");
};

export const show500 = (err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).render("error/500", { 
        error: err,
        timestamp: new Date().toISOString()
    });
};

export const showAccessDenied = (req, res) => {
    res.status(403).render("error/403");
};

export const showUnauthorized = (req, res) => {
    res.status(401).render("error/401");
};