const path = require("path");
const File = require("../models/File");
const groqService = require("../services/groq.service");
const moment = require("moment");

exports.add = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "File is required."
            });

        }

        const description =
            req.body.description || "";

        const ai =
            await groqService.generateFileMetadata(

                req.file.originalname,

                description

            );

        const file =
            await File.create({

                name: ai.name,

                description,

                type: req.file.mimetype,

                tags: ai.tags,

                keywords: ai.keywords,

                originalFilename:
                    req.file.originalname,

                filename:
                    req.file.filename,

                filepath:
                    req.file.path,

                size:
                    req.file.size

            });

        res.status(201).json({

            success: true,

            data: file

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

const formatSize = (bytes) => {
  if (!bytes) return "0 KB";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${parseFloat(
    (bytes / Math.pow(1024, i)).toFixed(2)
  )} ${units[i]}`;
};

/**
 * Convert MIME Type
 */
const getFileType = (mime) => {
  if (!mime) return "Other";

  if (mime.startsWith("image/")) return "Image";

  if (mime.startsWith("video/")) return "Video";

  if (mime.startsWith("audio/")) return "Audio";

  if (mime.startsWith("text/")) return "Text";

  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("powerpoint") ||
    mime.includes("application/")
  ) {
    return "Document";
  }

  return "Other";
};

exports.list = async (req, res) => {
  try {
    const files = await File.find({})
      .sort({ updatedAt: -1 })
      .lean();

    const data = files.map((file) => ({
      id: file._id,

      name: file.name,

      type: getFileType(file.type),

      size: formatSize(file.size),

      updated_at: moment(file.updatedAt).format(
        "DD MMM YYYY, hh:mm A"
      ),
    }));

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const fs = require("fs");

exports.delete = async (req, res) => {

    try {

        const file =
            await File.findById(
                req.params.id
            );

        if (!file) {

            return res.status(404).json({

                success: false,

                message: "File not found."

            });

        }

        if (
            fs.existsSync(file.filepath)
        ) {

            fs.unlinkSync(file.filepath);

        }

        await File.findByIdAndDelete(
            file._id
        );

        res.json({

            success: true,

            message: "File deleted."

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

