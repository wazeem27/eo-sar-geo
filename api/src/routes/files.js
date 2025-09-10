import express from "express";
import path from "path";
import fs from "fs-extra";
import logger from "../logging/logger.js";
import { getImage } from "../services/images.js";
import { config } from "../config.js";

const router = express.Router();

const UPLOAD_DIR = path.resolve(config.uploadDir);

router.get("/:imageId", async (req, res) => {
  const { imageId } = req.params;

  try {
    const image = getImage(imageId);
    if (!image) {
      logger.error("File not found in store", { imageId });
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(UPLOAD_DIR, image.fileName);

    if (!(await fs.pathExists(filePath))) {
      logger.error("File not found on disk", { filePath });
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Content-Type", "image/tiff");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(filePath);
  } catch (err) {
    logger.error("Error serving file", { error: err.message });
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;