import EventEmitter from "events";
import { logger } from "../utils/logger.js";
import * as kafkaSvc from "./kafka.js";

const ee = new EventEmitter();
let kafkaAvailable = false;

export async function init(opts = {}) {
  const brokers = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER;
  if (brokers) {
    try {
      await kafkaSvc.initKafka(opts);
      kafkaAvailable = true;
      logger.info("Queue using Kafka");
      return;
    } catch (err) {
      logger.warn("Failed to init Kafka, falling back to in-memory queue", {
        err,
      });
    }
  }
  logger.info("Queue using in-memory EventEmitter");
}

export async function produce(topic, message, key = null) {
  if (kafkaAvailable) {
    return kafkaSvc.sendMessage(topic, message, key);
  }

  // fallback: emit locally
  process.nextTick(() => ee.emit(topic, { topic, message }));
  return Promise.resolve();
}

export async function consume(topic, handler, opts = {}) {
  if (kafkaAvailable) {
    const groupId =
      opts.groupId || process.env.KAFKA_CONSUMER_GROUP || "transcoding-group";
    return kafkaSvc.createConsumer(
      groupId,
      topic,
      async ({ message, rawMessage }) => {
        try {
          await handler(message, rawMessage);
        } catch (err) {
          logger.error("Queue handler error", err);
        }
      },
      opts.fromBeginning || false
    );
  }

  // fallback: register local listener
  ee.on(topic, async ({ message }) => {
    try {
      await handler(message);
    } catch (err) {
      logger.error("In-memory queue handler error", err);
    }
  });
  return Promise.resolve();
}

export async function close() {
  if (kafkaAvailable) {
    await kafkaSvc.disconnectAll();
    kafkaAvailable = false;
  }
}

export default { init, produce, consume, close };
