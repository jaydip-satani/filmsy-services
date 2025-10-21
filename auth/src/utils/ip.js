import requestIp from "request-ip";

export const getClientIp = (req) => {
  let ip = requestIp.getClientIp(req) || "Unknown IP";

  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  }

  return ip;
};
