// WHAT: Configure Next.js build and dev server settings
// HOW: Exported config object is read by Next.js at startup
// OUTCOME: Project-specific settings are applied without touching global config
/** @type {import('next').NextConfig} */
const nextConfig = {
  // WHAT: Tell Turbopack that this directory is the workspace root
  // HOW: turbopack.root resolves ambiguity when a parent directory has its own lockfile
  // OUTCOME: The workspace root warning is suppressed; Turbopack uses the correct root
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
