import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // sharp is a native module used by the watcher; keep it external to the bundle.
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
