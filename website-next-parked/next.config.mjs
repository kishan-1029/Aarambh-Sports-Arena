/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint via `npm run lint`; keep production builds unblocked on CI/demo machines.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
