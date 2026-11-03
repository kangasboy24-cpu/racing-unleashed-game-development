/** @type {import('next').NextConfig} */
const nextConfig = {
  // CrazyGames hosts a static bundle (index.html + assets) inside an iframe at a sub-path,
  // so the game must be a static export that only uses relative URLs.
  output: 'export',
  assetPrefix: './',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
