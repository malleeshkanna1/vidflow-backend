const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
    tls: {},
});

connection.once("connect", () => {
  console.log("✅ Redis Connected");
});

connection.once("ready", () => {
  console.log("✅ Redis Ready");
});

connection.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

module.exports = connection;