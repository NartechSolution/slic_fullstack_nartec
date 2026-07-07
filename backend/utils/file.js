const fs = require("fs-extra");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "../../");

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<string>} - Returns the absolute path
 */
const ensureDir = async (dirPath) => {
  const absolutePath = path.isAbsolute(dirPath)
    ? dirPath
    : path.join(ROOT_DIR, dirPath);

  await fs.ensureDir(absolutePath);
  return absolutePath;
};

/**
 * Creates a relative path from the root directory
 * @param {string} filePath - Path to convert
 * @returns {string} - Relative path from root
 */
const getRelativePath = (filePath) => {
  return path.relative(ROOT_DIR, filePath);
};

/**
 * Ensures required directories exist for file operations
 * @returns {Promise<void>}
 */
const ensureRequiredDirs = async () => {
  await Promise.all([
    ensureDir("uploads"),
    ensureDir("uploads/tickets"),
    // Add more directories as needed
  ]);
};

/**
 * Deletes a file if it exists
 * @param {string} filePath - Path to the file
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
  if (!filePath) return;

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(ROOT_DIR, filePath);

  try {
    await fs.remove(absolutePath);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

module.exports = {
  ensureDir,
  getRelativePath,
  ensureRequiredDirs,
  deleteFile,
};
