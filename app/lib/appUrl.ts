export function requireCanonicalAppUrl() {
  const configured = process.env.APP_URL?.trim();

  if (!configured) {
    throw new Error("APP_URL is required to create private links.");
  }

  const url = new URL(configured);

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("APP_URL must be a canonical origin without credentials, query, or fragment.");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("APP_URL must use HTTP or HTTPS.");
  }

  return url.origin;
}
