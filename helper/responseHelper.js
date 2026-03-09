export const successResponse=(res,message,data = null,statusCode=200)=>{
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};
export const errorResponse = (res,message,statusCode = 400)=>{
    return res.status(statusCode).json({
        success: false,
        message
    })
}
export const redirectResponse=(res,message,redirectUrl)=>{
    return res.json({
        success : true,
        message,
        redirectUrl
    })
}