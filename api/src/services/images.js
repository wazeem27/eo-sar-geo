import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import logger from "../logging/logger.js";

if (!fs.existsSync(config.imagesFile)) {
  fs.writeFileSync(config.imagesFile, JSON.stringify({}));
  logger.info("Created new images.json file.");
}

function readImages() {
  return JSON.parse(fs.readFileSync(config.imagesFile));
}

function writeImages(images) {
  fs.writeFileSync(config.imagesFile, JSON.stringify(images, null, 2));
}

/**
 * @param {string} fileName 
 * @returns {string}
 */
export function registerImage(fileName) {
  const images = readImages();
  const imageId = fileName.substring(0, fileName.lastIndexOf("."));
  
  images[imageId] = { 
    id: imageId, 
    fileName, 
    uploadedAt: new Date().toISOString() 
  };
  writeImages(images);
  logger.info("Image registered", { imageId, fileName });
  return imageId;
}

export function imageExists(imageId) {
  const images = readImages();
  return Boolean(images[imageId]);
}

export function getImage(imageId) {
  const images = readImages();
  return images[imageId] || null;
}