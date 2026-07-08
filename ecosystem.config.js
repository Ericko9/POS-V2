module.exports = {
  apps: [
    {
      name: "pos-app-dev",
      script: "npm",
      args: "run dev",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
}
