import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run など Docker でのデプロイ用に最小ランタイムを生成
  output: "standalone",
  async headers() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
