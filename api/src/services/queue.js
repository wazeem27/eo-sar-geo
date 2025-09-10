import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import lockfile from "proper-lockfile";
import { config } from "../config.js";
import { imageExists } from "./images.js";
import logger from "../logging/logger.js";

if (!fs.existsSync(config.jobsFile)) {
  fs.writeFileSync(config.jobsFile, JSON.stringify({}));
  logger.info("Created new jobs.json file.");
}

function readJobs() {
  return JSON.parse(fs.readFileSync(config.jobsFile));
}

function writeJobs(jobs) {
  fs.writeFileSync(config.jobsFile, JSON.stringify(jobs, null, 2));
}

export async function createJob({ imageAId, imageBId, aoi }) {
  if (!imageExists(imageAId)) throw new Error(`Image A with ID ${imageAId} not found`);
  if (!imageExists(imageBId)) throw new Error(`Image B with ID ${imageBId} not found`);

  const release = await lockfile.lock(config.jobsFile, { stale: 5000 });
  try {
    const jobs = readJobs();
    const jobId = uuidv4();
    jobs[jobId] = {
      id: jobId,
      imageAId,
      imageBId,
      aoi,
      status: "pending",
      progress: 0,
      outputA: null,
      outputB: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    writeJobs(jobs);
    logger.info("Job created", { jobId });
    return jobId;
  } finally {
    await release();
  }
}

export async function processNextJob() {
  const release = await lockfile.lock(config.jobsFile, { stale: 5000, retry: 0 });
  
  try {
    const jobs = readJobs();
    const pendingJobId = Object.keys(jobs).find(id => jobs[id].status === "pending");

    if (pendingJobId) {
      jobs[pendingJobId].status = "running";
      writeJobs(jobs);
      logger.info(`Acquired job for processing: ${pendingJobId}`);
      return jobs[pendingJobId];
    }
  } finally {
    await release();
  }
  
  return null;
}

export async function getJob(jobId) {
  const release = await lockfile.lock(config.jobsFile, { stale: 5000 });
  try {
    const jobs = readJobs();
    return jobs[jobId] || null;
  } finally {
    await release();
  }
}

export async function setJobStatus(jobId, { status, progress, outputA, outputB, error }) {
  const release = await lockfile.lock(config.jobsFile, { stale: 5000 });
  try {
    const jobs = readJobs();
    if (!jobs[jobId]) throw new Error(`Job ${jobId} not found`);
    if (status) jobs[jobId].status = status;
    if (progress !== undefined) jobs[jobId].progress = progress;
    if (outputA) jobs[jobId].outputA = outputA;
    if (outputB) jobs[jobId].outputB = outputB;
    if (error) jobs[jobId].error = error;
    writeJobs(jobs);
    logger.info("Job status updated", { jobId, status, progress });
  } finally {
    await release();
  }
}

export default { createJob, processNextJob, getJob, setJobStatus };