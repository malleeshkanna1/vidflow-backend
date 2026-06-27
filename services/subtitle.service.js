const fs = require("fs");
const path = require("path");
const SRTParser = require("srt-parser-2");

const ffmpegService = require("./ffmpeg.service");
const whisperService = require("./whisper.service");

class SubtitleService {
  /**
   * Parse SRT file
   */
  parseSrt(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error("Subtitle file not found.");
    }

    const parser = new SRTParser();

    const content = fs.readFileSync(filePath, {
      encoding: "utf8",
    });

    return parser.fromSrt(content);
  }

  /**
   * Merge subtitle text into a single transcription
   */
  mergeText(subtitles = []) {
    return subtitles
      .map((item) => (item.text || "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Safely delete temporary file
   */
  cleanup(file) {
    try {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (err) {
      console.warn("Cleanup failed:", err.message);
    }
  }

  /**
   * Extract subtitle or fallback to Whisper
   */
  async extract(videoPath) {
    const subtitleDir = path.join(
      process.cwd(),
      "uploads",
      "subtitles"
    );

    ffmpegService.createDirectory(subtitleDir);

    const outputSrt = path.join(
      subtitleDir,
      `${ffmpegService.getFileName(videoPath)}.srt`
    );

    try {
      /**
       * Try Embedded Subtitle
       */
      const srtPath = await ffmpegService.extractSubtitle(videoPath);

      if (srtPath && fs.existsSync(srtPath)) {
        try {
          const subtitles = this.parseSrt(srtPath);

          const transcription = this.mergeText(subtitles);

          // Only use subtitle if meaningful
          if (transcription.length > 20) {
            return {
              success: true,
              source: "embedded",

              language: "unknown",

              transcription,

              subtitles,

              srtPath,

              jsonPath: null,
            };
          }

          console.warn(
            "Embedded subtitle is empty. Falling back to Whisper."
          );
        } catch (err) {
          console.warn(
            "Subtitle parsing failed:",
            err.message
          );
        }
      }

      /**
       * Whisper Fallback
       */
      console.log("Running Faster Whisper...");

      const whisper = await whisperService.transcribe(
        videoPath,
        outputSrt
      );

      return {
        success: true,

        source: "whisper",

        language: whisper.language,

        transcription: whisper.transcription,

        subtitles: whisper.segments,

        srtPath: whisper.srtPath,

        jsonPath: whisper.jsonPath,
      };
    } catch (err) {
      console.error("Subtitle extraction failed:", err);

      throw err;
    }
  }
}

module.exports = new SubtitleService();