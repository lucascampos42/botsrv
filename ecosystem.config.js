module.exports = {
  apps: [{
    name: "pm2-discord-bot",
    script: "dist/index.js",
    env: {
      NODE_ENV: "production",
    }
  }]
}
