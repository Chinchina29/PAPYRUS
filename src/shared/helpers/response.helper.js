export const successResponse = (
  res,
  message,
  data = null,
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};
export const errorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
export const redirectResponse = (res, message, redirectUrl) => {
  return res.json({
    success: true,
    message,
    redirectUrl,
  });
};
export const getInitials = (firstName = "", lastName = "") => {
  const first = firstName?.trim()?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.trim()?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
};
export const getAvatarColor = (firstName = "") => {
  const colors = [
    "#7A5C3E",
    "#5a7a5a",
    "#5a5a8a",
    "#8a5a5a",
    "#7a6a4a",
    "#4a7a7a",
    "#8a6a3a",
    "#5a4a6a",
  ];
  const index = (firstName?.trim()?.charCodeAt(0) || 0) % colors.length;
  return colors[index];
};