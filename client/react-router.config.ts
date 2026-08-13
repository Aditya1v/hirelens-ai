import type { Config } from "@react-router/dev/config";

export default {
  // This app is a pure client rendered against an authenticated backend API
  // (cookies + fetch). SPA mode avoids duplicating auth/session handling on
  // a server-render pass.
  ssr: false,
} satisfies Config;
