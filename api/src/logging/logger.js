import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import { config } from "../config.js";
import fs from "fs-extra";


fs.ensureDirSync(config.logDir);

const transport = new winston.transports.DailyRotateFile({
  filename: path.join(config.logDir, "api-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: config.logLevel
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    transport,
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

logger.stream = {
  write: (message) => logger.info(message.trim())
};

export default logger;