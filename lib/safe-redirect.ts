"use client";

/** Validate a callbackUrl from the query string to prevent open redirects. */
export function safeCallbackUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;

  // Allow only same-origin absolute URLs and relative paths (not protocol-relative "//").
  if (url.startsWith("//")) return fallback;
  if (url.startsWith("/")) return url;

  if (typeof window === "undefined") return fallback;

  try {
    const target = new URL(url, window.location.origin);
    if (target.origin === window.location.origin) {
      return target.pathname + target.search + target.hash;
    }
  } catch {
    // ignore malformed URLs
  }
  return fallback;
}
