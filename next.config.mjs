/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cjdropshipping.com" },
      { protocol: "https", hostname: "**.cjdropshipping.cn" },
      { protocol: "https", hostname: "**.cjwears.com" },
    ],
  },
};

export default nextConfig;
