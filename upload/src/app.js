import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import uploadRoutes from "./routes/upload.route.js";
import client, { httpRequestDuration } from "./utils/metrics.js";

const PORT = process.env.PORT;

const app = express();
app.use(cors());
``;
app.use(helmet());
app.use(express.json({ limit: "100mb" }));

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
    });
  });
  next();
});

app.use("/api/upload", uploadRoutes);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.get("/", (req, res) => res.send("Upload Service is running"));

app.listen(PORT, () => {
  console.log(`🚀 Upload Service running on port ${PORT}`);
});
export default app;
