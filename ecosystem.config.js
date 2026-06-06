module.exports = {
  apps: [
    {
      name: "kaifbook",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 2,
      exec_mode: "cluster",
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
