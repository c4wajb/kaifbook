module.exports = {
  apps: [
    {
      name: "kaifbook",
      // Run the optimized standalone server (matches output: "standalone").
      // cwd is pinned to this release dir so the standalone server loads .env
      // (via @next/env from process.cwd()) and finds its copied static/public.
      script: ".next/standalone/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      interpreter: "node",
      interpreter_args: "--no-warnings",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "700M",
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
