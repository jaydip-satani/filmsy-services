import { Kafka } from "kafkajs";
import { logger } from "../utils/logger.js";

let kafka = null;
let producer = null;
const consumers = new Map();

function getBrokers() {
  const raw = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER;
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function initKafka(opts = {}) {
  const brokers = getBrokers();
  if (!brokers || brokers.length === 0) {
    logger.info(
      "Kafka not configured (no KAFKA_BROKERS). Skipping Kafka init."
    );
    return null;
  }

  if (!kafka) {
    kafka = new Kafka({
      clientId:
        opts.clientId || process.env.KAFKA_CLIENT_ID || "transcoding-service",
      brokers,
    });
  }

  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
    logger.info("Kafka producer connected");
  }

  return { kafka, producer };
}

export async function sendMessage(topic, value, key = null) {
  if (!producer) {
    await initKafka();
    if (!producer) {
      throw new Error("Kafka producer not available");
    }
  }

  const message = {
    value: typeof value === "string" ? value : JSON.stringify(value),
  };
  if (key) message.key = key;

  return producer.send({ topic, messages: [message] });
}

export async function createConsumer(
  groupId,
  topic,
  eachMessageHandler,
  fromBeginning = false
) {
  if (!kafka) {
    await initKafka();
    if (!kafka) throw new Error("Kafka not configured");
  }

  if (!groupId) throw new Error("groupId is required to create a consumer");
  if (!topic) throw new Error("topic is required to create a consumer");

  const key = `${groupId}::${topic}`;
  if (consumers.has(key)) return consumers.get(key);

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value ? message.value.toString() : null;
        let parsed = value;
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          /* keep raw */
        }
        await eachMessageHandler({
          topic,
          partition,
          message: parsed,
          rawMessage: message,
        });
      } catch (err) {
        logger.error("Error handling Kafka message", { err, topic });
      }
    },
  });

  consumers.set(key, consumer);
  return consumer;
}

export async function disconnectAll() {
  if (producer) {
    try {
      await producer.disconnect();
    } catch (e) {
      logger.warn("Error disconnecting producer", e);
    }
    producer = null;
  }

  for (const [key, consumer] of consumers.entries()) {
    try {
      await consumer.disconnect();
    } catch (e) {
      logger.warn("Error disconnecting consumer", e);
    }
    consumers.delete(key);
  }

  kafka = null;
}

export default { initKafka, sendMessage, createConsumer, disconnectAll };
