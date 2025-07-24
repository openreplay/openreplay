import { KafkaJS } from "@confluentinc/kafka-javascript";
const { Kafka } = KafkaJS;

const KAFKA_SERVERS = process.env.KAFKA_SERVERS;
const KAFKA_TOPIC = process.env.KAFKA_TOPIC;

const kafka = new Kafka({
  kafkaJS: {
    clientId: "genvideo-uploader",
    brokers: KAFKA_SERVERS.split(","),
    ssl: true
  },
});

const producer = kafka.producer();

export async function notifyKafka(sessionId, status, s3Path = "", startOffset, error = undefined) {
  console.log('>>>> NOTIFY KAFKA')
  await producer.connect();
  const key = Buffer.from(sessionId).toString("base64");
  const value = JSON.stringify({ status, name: s3Path, startOffset, error });
  const result = await producer.send({
    topic: KAFKA_TOPIC,
    messages: [{ key, value }],
  });
  console.log(result)
  console.log('>>>> NOTIFY KAFKA DONE')
  return;
}
