module.exports = {
  apps: [
    {
      name: "kaifbook",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
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
