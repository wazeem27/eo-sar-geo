import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import logger from '../logging/logger.js';
import { config } from '../config.js';

const router = express.Router();

router.get('/:jobId/:filename', async (req, res) => {
  const { jobId, filename } = req.params;
  const filePath = path.join(config.outputDir, jobId, filename);

  try {
    await fs.access(filePath);
    
    res.sendFile(filePath);
    logger.info(`Successfully served output file: ${filePath}`);
    
  } catch (error) {
    logger.error(`File not found at: ${filePath}`);
    res.status(404).send('Output file not found.');
  }
});

export default router;