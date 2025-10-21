import { UAParser } from "ua-parser-js";

export const getUserDevice = (req) => {
  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || "Unknown",
    browserVersion: result.browser.version || "Unknown",
    os: result.os.name || "Unknown",
    osVersion: result.os.version || "Unknown",
    device: result.device.model || "Desktop",
    platform: result.device.type || "desktop",
    userAgentRaw: userAgent,
  };
};
