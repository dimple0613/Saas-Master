import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/superadmin", destination: "/admin", permanent: true },
      { source: "/users", destination: "/admin/users", permanent: true },
      { source: "/accounts", destination: "/admin/accounts", permanent: true },
      { source: "/user", destination: "/app", permanent: true },
      { source: "/members", destination: "/app/members", permanent: true },
      { source: "/members/add", destination: "/app/members/add", permanent: true },
      { source: "/organizations/:path*", destination: "/app/organizations/:path*", permanent: true },
      { source: "/settings", destination: "/app/settings", permanent: true },
      { source: "/notifications", destination: "/app/notifications", permanent: true },
    ];
  },
};

export default nextConfig;
