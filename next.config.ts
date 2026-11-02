import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / heavy server-only packages must not be bundled by Turbopack.
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "@prisma/client",
    "prisma",
  ],
};

export default nextConfig;
