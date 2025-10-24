import client from "prom-client";

// Prometheus metrics
export const videoProcessedCounter = new client.Counter({
  name: "video_transcoded_total",
  help: "Total number of videos successfully transcoded",
});

export const videoFailedCounter = new client.Counter({
  name: "video_transcode_failed_total",
  help: "Total number of videos failed to transcode",
});

export const videoProcessingHistogram = new client.Histogram({
  name: "video_transcoding_duration_seconds",
  help: "Histogram of video transcoding duration in seconds",
  buckets: [5, 10, 30, 60, 120, 300, 600],
});

// Prometheus metrics endpoint
export const setupMetrics = (app) => {
  client.collectDefaultMetrics(); // collect default nodejs metrics

  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });
};
