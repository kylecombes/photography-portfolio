import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for the Docker runtime image.
  output: 'standalone',
  // sharp is a native module used by the watcher; keep it external to the bundle.
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
