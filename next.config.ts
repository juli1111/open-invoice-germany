import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lädt .afm-Schriftdaten zur Laufzeit -> nicht ins Server-Bundle ziehen.
  serverExternalPackages: ["pdfkit"],
  // Eindeutige Workspace-Wurzel (verhindert Fehl-Inferenz bei mehreren Lockfiles).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
