const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const { v4: uuid } = require("uuid");

const s3 = require("../config/aws");

const BUCKET = process.env.AWS_BUCKET_NAME;

/**
 * Upload File
 * @param {String} filePath Local File Path
 * @param {String} folder videos | thumbnails | subtitles
 * @returns
 */
const uploadFile = async (filePath, folder = "uploads") => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    const extension = path.extname(filePath);

    const fileName = `${Date.now()}-${uuid()}${extension}`;

    const key = `${folder}/${fileName}`;

    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: mime.lookup(extension) || "application/octet-stream",
    };

    const result = await s3.upload(params).promise();

    return {
      success: true,
      key: result.Key,
      url: result.Location,
      bucket: result.Bucket,
      etag: result.ETag,
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Delete File
 */
const deleteFile = async (key) => {
  try {
    await s3
      .deleteObject({
        Bucket: BUCKET,
        Key: key,
      })
      .promise();

    return true;
  } catch (err) {
    throw err;
  }
};

/**
 * Upload Video
 */
const uploadVideo = async (filePath) => {
  return uploadFile(filePath, "videos");
};

/**
 * Upload Thumbnail
 */
const uploadThumbnail = async (filePath) => {
  return uploadFile(filePath, "thumbnails");
};

/**
 * Upload Subtitle
 */
const uploadSubtitle = async (filePath) => {
  return uploadFile(filePath, "subtitles");
};

const uploadLogo = async (filePath) => {
  return uploadFile(filePath, "logos");
}

module.exports = {
  uploadFile,
  uploadVideo,
  uploadThumbnail,
  uploadSubtitle,
  deleteFile,
  uploadLogo
};