import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH to "/<repo>" when hosting under a subpath
// (e.g. GitHub Pages project sites).
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Static export keeps the app fully local and lets it run from any static
  // host (GitHub Pages) or the Tauri desktop shell.
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
