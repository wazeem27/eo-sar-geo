// src/config.js
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';

const dataBaseDir = process.env.DATA_DIR;


if (!dataBaseDir) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..', '..');
  dataBaseDir = path.join(projectRoot, 'data');
}

export const config = {
  apiPort: process.env.API_PORT || 8080,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jobsFile: process.env.JOBS_FILE || path.join(dataBaseDir, 'jobs.json'),
  imagesFile: process.env.IMAGES_FILE || path.join(dataBaseDir, 'images.json'),
  uploadDir: process.env.UPLOAD_DIR || path.join(dataBaseDir, 'uploads'),
  outputDir: process.env.OUTPUT_DIR || path.join(dataBaseDir, 'outputs'),
  logDir: process.env.LOG_DIR || path.join(dataBaseDir, 'logs'),
  logLevel: process.env.LOG_LEVEL || 'info',
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.API_PORT || 8080}`,
};