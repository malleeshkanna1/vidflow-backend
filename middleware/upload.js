const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const createUpload = (folder, allowedMimeTypes, maxSize = 5 * 1024 * 1024 * 1024) => {
  const uploadDir = path.join(process.cwd(), "uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadDir);
    },

    filename(req, file, cb) {
      const ext = path.extname(file.originalname);

      cb(null, `${Date.now()}-${uuid()}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const isAllowed = allowedMimeTypes.some((type) => {
      if (type.endsWith("/")) {
        return file.mimetype.startsWith(type);
      }

      return file.mimetype === type;
    });

    if (!isAllowed) {
      return cb(
        new Error(
          `Only ${allowedMimeTypes.join(", ")} files are allowed.`
        ),
        false
      );
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });
};

module.exports = {
  videoUpload: createUpload("temp", [
    "video/mp4",
    "video/x-matroska",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/mpeg",
    "video/3gpp",
    "video/ogg",
    "video/x-flv",
  ]),

  imageUpload: createUpload(
    "logo",
    ["image/"],
    5 * 1024 * 1024 // 5 MB
  ),

  fileUpload: createUpload(
    "files",
    [
        "application/",
        "image/",
        "video/",
        "audio/",
        "text/"
    ],
    1024 * 1024 * 500
)
};