/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default config;
