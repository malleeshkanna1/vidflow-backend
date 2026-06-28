const mongoose = require("mongoose");

const footageSchema = new mongoose.Schema(
  {
    // AI Metadata
    name: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "",
      index: true,
    },

    subcategory: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    season: {
      type: String,
      default: "",
    },

    timeOfDay: {
      type: String,
      default: "",
    },

    cameraAngle: {
      type: String,
      default: "",
    },

    shotType: {
      type: String,
      default: "",
    },

    mood: {
      type: String,
      default: "",
    },

    weather: {
      type: String,
      default: "",
    },

    indoor: {
      type: Boolean,
      default: false,
    },

    dayNight: {
      type: String,
      default: "",
    },

    people: {
      type: Boolean,
      default: false,
    },

    peopleCount: {
      type: Number,
      default: 0,
    },

    animals: [
      {
        type: String,
      },
    ],

    objects: [
      {
        type: String,
      },
    ],

    activities: [
      {
        type: String,
      },
    ],

    colors: [
      {
        type: String,
      },
    ],

    keywords: [
      {
        type: String,
      },
    ],

    tags: [
      {
        type: String,
        index: true,
      },
    ],

    // Video Files
    video: {
      type: String,
      default: "",
    },

    videoKey: {
      type: String,
      default: "",
    },

    thumbnail: {
      type: String,
      default: "",
    },

    thumbnailKey: {
      type: String,
      default: "",
    },

    subtitle: {
      type: String,
      default: "",
    },

    subtitleKey: {
      type: String,
      default: "",
    },

    // Metadata
    duration: {
      type: String,
      default: "",
    },

    fps: {
      type: Number,
      default: 0,
    },

    resolution: {
      type: String,
      default: "",
    },

    codec: {
      type: String,
      default: "",
    },

    format: {
      type: String,
      default: "",
    },

    bitrate: {
      type: Number,
      default: 0,
    },

    size: {
      type: Number,
      default: 0,
    },

    aspectRatio: {
      type: String,
      default: "",
    },

    transcription: {
      type: String,
      default: "",
    },

    // Processing
    status: {
      type: String,
      enum: [
        "queued",
        "processing",
        "completed",
        "failed",
      ],
      default: "queued",
      index: true,
    },

    processingStage: {
      type: String,
      default: "queued",
    },

    error: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Search Indexes
footageSchema.index({
  name: "text",
  description: "text",
  transcription: "text",
  tags: "text",
  keywords: "text",
  category: "text",
  location: "text",
});

module.exports = mongoose.model("Footage", footageSchema);