import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb-memory-server", "mongodb-memory-server-core"],
};

export default nextConfig;
