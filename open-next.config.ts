import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers adapter config.
 *
 * Left at defaults: pages using `export const revalidate = 60` are rendered
 * on demand rather than served from a persisted ISR cache. To get real ISR,
 * add an R2 bucket and the r2IncrementalCache override — see README.
 */
export default defineCloudflareConfig();
