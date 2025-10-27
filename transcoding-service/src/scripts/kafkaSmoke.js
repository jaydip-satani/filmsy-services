import queue from "../services/queue.js";
import { logger } from "../utils/logger.js";

async function run() {
  await queue.init();

  const topic = process.env.KAFKA_SMOKE_TOPIC || "transcoding-smoke";

  await queue.consume(
    topic,
    async (msg, raw) => {
      logger.info(`Received smoke message: ${JSON.stringify(msg)}`);
      // close after first message
      await queue.close();
      process.exit(0);
    },
    { fromBeginning: true }
  );

  // produce a test message
  await queue.produce(topic, { hello: "kafka", ts: Date.now() });
  logger.info("Sent smoke message to topic " + topic);
}

run().catch((err) => {
  logger.error("Smoke test failed", err);
  process.exit(1);
});
