import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import * as url from 'url';
import uploadsRouter from "./routes/uploads.js";
import jobsRouter from "./routes/jobs.js";
import filesRouter from "./routes/files.js";
import outputsRouter from "./routes/outputs.js";
import logger from "./logging/logger.js";
import { config } from "./config.js";
import { processNextJob, setJobStatus } from "./services/queue.js";


const convertBboxToGeoJSON = (bbox) => {
  const { west, south, east, north } = bbox;
  return {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south]
            ]
          ]
        },
        "properties": {}
      }
    ]
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());

app.use(cors({ origin: config.frontendUrl, methods: ["GET", "POST"] }));

fs.ensureDirSync(config.logDir);
const logStream = fs.createWriteStream(
  path.join(config.logDir, "access.log"),
  { flags: "a" }
);
app.use(
  morgan("combined", {
    stream: logStream,
    skip: (req, res) => res.statusCode < 400,
  })
);

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Routes
app.use("/api/uploads", uploadsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/files", filesRouter);
app.use("/api/outputs", outputsRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  logger.warn("404 Not Found", { path: req.path, method: req.method });
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

const checkJobs = async () => {
  try {
    const job = await processNextJob();
    
    if (job) {
      logger.info(`Processing job: ${job.id}`);
      
      let aoi_path = job.aoi;
      
      if (typeof job.aoi === 'object' && job.aoi !== null) {
          const geoJsonAoi = convertBboxToGeoJSON(job.aoi);
          const aoiFilename = `${uuidv4()}.json`;
          aoi_path = path.join(config.uploadDir, aoiFilename);
          fs.writeFileSync(aoi_path, JSON.stringify(geoJsonAoi));
          logger.info(`Saved AOI object to a file: ${aoi_path}`);
      }

      const callbackUrl = url.resolve(config.backendUrl, `/api/jobs/update-status`);

      const workerPath = path.join("/app", "worker", "worker.py");

      const args = [
        "--job-id", job.id,
        "--image-a", job.imageAId,
        "--image-b", job.imageBId,
        "--aoi", aoi_path,
        "--callback-url", callbackUrl
      ];
      
      logger.info("Spawning python worker with arguments:", args);

      const workerProcess = spawn("python3", [workerPath, ...args], {});

      workerProcess.stdout.on("data", (data) => {
        logger.info(`Worker stdout: ${data.toString()}`);
      });

      workerProcess.stderr.on("data", (data) => {
        logger.error(`Worker stderr: ${data.toString()}`);
      });

      workerProcess.on("close", async (code) => {
        if (code !== 0) {
          logger.error(`Worker process exited with code ${code}`);
          await setJobStatus(job.id, { status: "failed", error: `Worker exited with code ${code}` });
        } else {
          logger.info(`Worker process for job ${job.id} finished.`);
        }
      });

      workerProcess.on("error", async (err) => {
        logger.error(`Failed to start worker process: ${err.message}`, {
          stack: err.stack,
        });
        await setJobStatus(job.id, { status: "failed", error: err.message });
      });
    }
  } catch (err) {
    logger.error(`Error processing jobs: ${err.message}`, {
      stack: err.stack,
    });
  }
};

setInterval(checkJobs, 5000);

const server = app.listen(config.apiPort, () => {
  logger.info(`API server listening on port ${config.apiPort}`);
});

const shutdown = () => {
  logger.info("Shutting down server...");
  server.close(() => {
    logger.info("Server closed gracefully.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
  process.exit(1);
});