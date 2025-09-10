// src/routes/jobs.js
import express from 'express';
import queueService from '../services/queue.js';
import logger from '../logging/logger.js';
import { config } from '../config.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { imageAId, imageBId, aoi } = req.body;

        if (!imageAId || !imageBId || !aoi) {
            logger.error("Missing required fields in job request.");
            return res.status(400).json({ error: "Missing required fields." });
        }

        const jobId = await queueService.createJob({
            imageAId,
            imageBId,
            aoi
        });
        
        res.status(201).json({
            jobId: jobId,
            message: "Job created successfully. It will be processed shortly."
        });

    } catch (error) {
        logger.error(`Error processing job request: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await queueService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found.' });
        }
        
        if (job.status === 'completed' && job.outputA && job.outputB) {
            const outputAUrl = `${config.backendUrl}/api/outputs/${job.id}/${job.outputA}`;
            const outputBUrl = `${config.backendUrl}/api/outputs/${job.id}/${job.outputB}`;
            
            return res.status(200).json({
                ...job,
                outputs: {
                    imageAUrl: outputAUrl,
                    imageBUrl: outputBUrl
                }
            });
        }

        res.status(200).json(job);
    } catch (error) {
        logger.error(`Error getting job status: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/update-status', async (req, res) => {
    try {
        const { jobId, status, error, outputA, outputB } = req.body;

        if (!jobId || !status) {
            logger.error("Missing required fields in status update request.");
            return res.status(400).json({ error: "Missing required fields." });
        }

        const updateData = { status, error, outputA, outputB };
        await queueService.setJobStatus(jobId, updateData);

        logger.info(`Job status updated for ${jobId}: ${status}`);

        res.status(200).json({ message: 'Status updated successfully.' });
    } catch (error) {
        logger.error(`Error updating job status: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

export default router;