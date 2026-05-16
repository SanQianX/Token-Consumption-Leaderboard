module.exports = {
  apps: [
    {
      name: "token-leaderboard",
      script: "packages/server/dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "postgresql://leaderboard:CHANGE_ME@localhost:5432/leaderboard",
        JWT_SECRET: "CHANGE_ME_TO_RANDOM_STRING",
        GITHUB_CLIENT_ID: "CHANGE_ME",
        GITHUB_CLIENT_SECRET: "CHANGE_ME",
        SMTP_HOST: "smtp.163.com",
        SMTP_PORT: "465",
        SMTP_USER: "CHANGE_ME@163.com",
        SMTP_PASS: "CHANGE_ME",
        FRONTEND_URL: "http://124.220.17.38",
      },
    },
  ],
}
