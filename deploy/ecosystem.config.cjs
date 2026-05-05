module.exports = {
  apps: [
    {
      name: "bhishm-api",
      script: "/var/www/bhishm/artifacts/api-server/dist/index.mjs",
      node_args: "--enable-source-maps",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        DATA_DIR: "/var/data/bhishm",
      },
    },
  ],
};
