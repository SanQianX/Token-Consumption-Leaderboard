module.exports = {
  apps: [
    {
      name: "token-leaderboard",
      script: "packages/server/dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "postgresql://leaderboard:leaderboard_dev_2024@localhost:5432/leaderboard",
        JWT_SECRET: "07f1c9d00bae2e21565771021cdadee1931aac3215efc62ee4842bc2847a73a0",
        GITHUB_CLIENT_ID: "Ov23lizXpi01HxlqGCCk",
        GITHUB_CLIENT_SECRET: "dcb2022f05c4d62d9562113a92c11e397ccb8585",
        SMTP_HOST: "smtp.163.com",
        SMTP_PORT: "465",
        SMTP_USER: "xyl20000810@163.com",
        SMTP_PASS: "KDgGLC5T2RjTv8U4",
        FRONTEND_URL: "https://124.220.17.38",
      },
    },
  ],
}
