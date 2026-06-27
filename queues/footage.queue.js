const { Queue } = require("bullmq");
const connection = require("../config/redis");

module.exports = new Queue("footage-processing", {
  connection,
});