/**
 * Error thrown when a redirect loop is detected.
 */
export declare class RedirectLoopError extends Error {
}
type RedirectCode = 301 | 302 | 307 | 308;
/**
 * A resolved redirect with its target URL and status code.
 */
export interface Redirect {
    url: string;
    code: RedirectCode;
}
/**
 * A redirect rule with source path, target path, and optional status code.
 */
export interface RedirectDefinition {
    from: string;
    to: string;
    code?: RedirectCode;
}
/**
 * Determine the redirect target for a given URL based on the provided redirect rules.
 *
 * @param url - The URL to check for redirects
 * @param redirects - Array of redirect definitions
 * @returns Redirect object with target URL and status code, or null if no redirect
 * @throws RedirectLoopError if redirect chain exceeds maximum length
 */
export declare function getRedirect(url: URL, redirects: Array<RedirectDefinition>): Redirect | null;
export {};
