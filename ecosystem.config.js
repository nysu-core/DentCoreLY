// PM2 ecosystem config for OrthoCore production deployment
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup    ← follow the printed command to enable auto-start on reboot

module.exports = {
  apps: [
    {
      name:       "orthocore-api",
      script:     "./backend/dist/server.js",
      cwd:        "/opt/orthocore",       // ← adjust to your deployment path
      instances:  1,                      // increase to "max" for multi-core if needed
      exec_mode:  "fork",
      env: {
        NODE_ENV: "production",
        PORT:     4000,
      },
      // Log files
      out_file:   "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Auto-restart on crash
      autorestart: true,
      watch:       false,
      max_memory_restart: "512M",
    },
  ],
};
