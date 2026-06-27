const path = require("path");
const fs = require("fs");
const mongoose = require('mongoose')
const Footage = require("../models/Footage");
const footageQueue = require("../queues/footage.queue");

const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required.",
      });
    }

    const fileStats = fs.statSync(req.file.path);

    const footage = await Footage.create({
      name: path.parse(req.file.originalname).name,

      description: "",

      category: "Processing",

      location: "",

      video: "",

      thumbnail: "",

      subtitle: "",

      transcription: "",

      size: fileStats.size,

      format: path.extname(req.file.originalname)
        .replace(".", "")
        .toUpperCase(),

      duration: "00:00",

      resolution: "",

      fps: 0,

      codec: "",

      aspectRatio: "",

      status: "queued",

      processingStage: "queued",

      tags: [],
    });

    await footageQueue.add(
      "process-video",
      {
        footageId: footage._id,
        filePath: req.file.path,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      }
    );

    return res.status(202).json({
      success: true,
      message: "Video uploaded successfully. Processing started.",
      footageId: footage._id,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const list = async (req, res) => {
  try {
    const footages = await Footage.find({})
      .select({
        thumbnail: 1,
        name: 1,
        status: 1,
        duration: 1,
        tags: 1,
        resolution: 1,
        size: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = footages.map((item) => ({
      id: item._id,

      thumbnail: item.thumbnail || "",

      name: capitalizeFirstLetter(item.name) || "Untitled",

      status: item.status,

      duration: item.duration || "--:--",

      tags: (item.tags || []).slice(0, 3),

      uploaded: item.createdAt,

      quality: item.resolution || "-",

      size: formatBytes(item.size || 0),
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

/**
 * Convert Bytes
 */
function formatBytes(bytes) {
  if (!bytes) return "0 KB";

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return (
    parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) +
    " " +
    sizes[i]
  );
}


function capitalizeFirstLetter(str) {
  if (!str) return ""; // Handle empty strings safely
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid footage id.",
      });
    }

    const footage = await Footage.findById(id).lean();

    if (!footage) {
      return res.status(404).json({
        success: false,
        message: "Footage not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: footage,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {upload,list,getById}