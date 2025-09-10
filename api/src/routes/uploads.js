import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs-extra";
import logger from "../logging/logger.js";
import { registerImage } from "../services/images.js";
import { config } from "../config.js";

const router = express.Router();

const UPLOAD_DIR = config.uploadDir;
fs.ensureDirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageId = registerImage(req.file.filename);

    logger.info("File uploaded", {
      originalName: req.file.originalname,
      savedName: req.file.filename,
      imageId,
      size: req.file.size,
    });

    const fileUrl = `${config.backendUrl}/api/files/${imageId}`;

    res.json({ imageUrl: fileUrl, imageId });
  } catch (err) {
    logger.error("Upload failed", { error: err.message });
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;