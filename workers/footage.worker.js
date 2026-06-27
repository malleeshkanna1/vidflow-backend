const { Worker } = require("bullmq");
const path = require("path");

const connection = require("../config/redis");

const Footage = require("../models/Footage");

const ffmpegService = require("../services/ffmpeg.service");
const subtitleService = require("../services/subtitle.service");
const groqService = require("../services/groq.service");
const s3Service = require("../services/s3.service");

const worker = new Worker(
  "footage-processing",

  async (job) => {
    const { footageId, filePath } = job.data;

    console.log(`🎬 Processing ${footageId}`);

    try {
      /**
       * Processing Started
       */
      await Footage.findByIdAndUpdate(footageId, {
        status: "processing",
        processingStage: "metadata",
      });

      /**
       * Metadata
       */
      console.log("Extracting metadata...");

      const metadata = await ffmpegService.extractMetadata(filePath);

      /**
       * Subtitle
       */
      await Footage.findByIdAndUpdate(footageId, {
        processingStage: "subtitle",
      });

      console.log("Extracting subtitles...");

      const subtitle = await subtitleService.extract(filePath);

      /**
       * Thumbnail
       */
      await Footage.findByIdAndUpdate(footageId, {
        processingStage: "thumbnail",
      });

      console.log("Generating thumbnail...");

      const thumbnail = await ffmpegService.generateThumbnail(filePath);

      /**
       * Upload
       */
      await Footage.findByIdAndUpdate(footageId, {
        processingStage: "uploading",
      });

      console.log("Uploading video...");

      const video = await s3Service.uploadVideo(filePath);

      console.log("Uploading thumbnail...");

      const thumbnailUpload = await s3Service.uploadThumbnail(thumbnail.path);

      let subtitleUpload = null;

      if (subtitle.srtPath) {
        console.log("Uploading subtitle...");

        const vttFile = await ffmpegService.convertSrtToVtt(subtitle.srtPath);

        subtitleUpload = await s3Service.uploadSubtitle(vttFile);

        // Cleanup local files
        ffmpegService.deleteFile(subtitle.srtPath);
        ffmpegService.deleteFile(vttFile);
      }

      /**
       * AI
       */
      await Footage.findByIdAndUpdate(footageId, {
        processingStage: "ai",
      });

      console.log("Generating AI metadata...");

      const ai = await groqService.generate({
        metadata,

        transcription: subtitle.transcription,
      });

      /**
       * Save MongoDB
       */
      await Footage.findByIdAndUpdate(
        footageId,
        {
          // ---------- AI ----------
          name: ai.title,
          description: ai.description,

          category: ai.category,
          subcategory: ai.subcategory,

          location: ai.location,
          country: ai.country,
          city: ai.city,

          season: ai.season,
          timeOfDay: ai.timeOfDay,

          cameraAngle: ai.cameraAngle,
          shotType: ai.shotType,

          mood: ai.mood,
          weather: ai.weather,

          people: ai.people,
          peopleCount: ai.peopleCount,

          animals: ai.animals,
          objects: ai.objects,
          activities: ai.activities,

          colors: ai.colors,
          keywords: ai.keywords,
          tags: ai.tags,

          // ---------- Video ----------
          transcription: subtitle.transcription,

          video: video.url,
          videoKey: video.key,

          thumbnail: thumbnailUpload.url,
          thumbnailKey: thumbnailUpload.key,

          subtitle: subtitleUpload?.url || "",

          subtitleKey: subtitleUpload?.key || "",

          // ---------- Metadata ----------
          duration: metadata.durationText,
          fps: metadata.fps,
          codec: metadata.codec,
          format: metadata.format,
          resolution: metadata.resolution,
          aspectRatio: metadata.aspectRatio,
          bitrate: metadata.bitrate,
          size: metadata.size,

          status: "completed",
          processingStage: "completed",
        },
        {
          new: true,
        },
      );

      /**
       * Cleanup Local Files
       */

      console.log("Cleaning temporary files...");

      ffmpegService.deleteFile(filePath);

      ffmpegService.deleteFile(thumbnail.path);

      if (subtitle.srtPath) {
        ffmpegService.deleteFile(subtitle.srtPath);
      }

      if (subtitle.jsonPath) {
        ffmpegService.deleteFile(subtitle.jsonPath);
      }

      console.log(`✅ Footage ${footageId} processed successfully`);
    } catch (err) {
      console.error(err);

      await Footage.findByIdAndUpdate(footageId, {
        status: "failed",
        processingStage: "failed",
        error: err.message,
      });

      throw err;
    }
  },

  {
    connection,

    concurrency: 2,

    removeOnComplete: {
      count: 100,
    },

    removeOnFail: {
      count: 100,
    },
  },
);

worker.on("ready", () => {
  console.log("✅ BullMQ Worker Ready");
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`❌ Job ${job?.id} failed`);

  console.error(err);
});

worker.on("error", (err) => {
  console.error("BullMQ Worker Error:", err);
});

module.exports = worker;
