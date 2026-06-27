const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

const fs = require("fs");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

class FFmpegService {

    createDirectory(dir) {

        if (!fs.existsSync(dir)) {

            fs.mkdirSync(dir, {
                recursive: true
            });

        }

    }

    deleteFile(file) {

        try {

            if (file && fs.existsSync(file)) {

                fs.unlinkSync(file);

            }

        }
        catch (err) {

            console.error(err.message);

        }

    }

    getFileName(filePath) {

        return path.parse(filePath).name;

    }

    getExtension(filePath) {

        return path.extname(filePath);

    }

    formatDuration(seconds) {

        if (!seconds)
            return "00:00";

        const hrs = Math.floor(seconds / 3600);

        const mins = Math.floor((seconds % 3600) / 60);

        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {

            return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

        }

        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    }

    formatSize(bytes) {

        if (!bytes)
            return 0;

        return Number(bytes);

    }

    calculateFPS(frameRate) {

        if (!frameRate)
            return 0;

        if (!frameRate.includes("/"))
            return Number(frameRate);

        const [a, b] = frameRate.split("/");

        return Math.round(Number(a) / Number(b));

    }

    calculateAspectRatio(width, height) {

        if (!width || !height)
            return "";

        const gcd = (a, b) => {

            return b === 0
                ? a
                : gcd(b, a % b);

        };

        const d = gcd(width, height);

        return `${width / d}:${height / d}`;

    }

    extractMetadata(videoPath) {

        return new Promise((resolve, reject) => {

            ffmpeg.ffprobe(videoPath, (err, metadata) => {

                if (err)
                    return reject(err);

                const video =
                    metadata.streams.find(
                        s => s.codec_type === "video"
                    );

                const subtitles =
                    metadata.streams
                        .filter(
                            s => s.codec_type === "subtitle"
                        )
                        .map(stream => ({

                            index: stream.index,

                            codec: stream.codec_name,

                            language:
                                stream.tags?.language || "",

                            title:
                                stream.tags?.title || "",

                            handler:
                                stream.tags?.handler_name || ""

                        }));

                const width =
                    video?.width || 0;

                const height =
                    video?.height || 0;

                const fps =
                    this.calculateFPS(
                        video?.avg_frame_rate
                    );

                resolve({

                    width,

                    height,

                    resolution:
                        width && height
                            ? `${width}×${height}`
                            : "",

                    fps,

                    codec:
                        video?.codec_name || "",

                    format:
                        path.extname(videoPath)
                            .replace(".", "")
                            .toUpperCase(),

                    bitrate:
                        Number(
                            metadata.format.bit_rate || 0
                        ),

                    size:
                        this.formatSize(
                            metadata.format.size
                        ),

                    duration:
                        metadata.format.duration || 0,

                    durationText:
                        this.formatDuration(
                            metadata.format.duration
                        ),

                    aspectRatio:
                        this.calculateAspectRatio(
                            width,
                            height
                        ),

                    hasSubtitle:
                        subtitles.length > 0,

                    subtitleStreams:
                        subtitles

                });

            });

        });

    }

        /**
     * Generate Thumbnail
     * Default seek: 60 seconds
     */
    generateThumbnail(videoPath, seekTime = "00:01:00") {

        return new Promise((resolve, reject) => {

            const outputDir = path.join(
                process.cwd(),
                "uploads",
                "thumbnails"
            );

            this.createDirectory(outputDir);

            const output = path.join(
                outputDir,
                `${this.getFileName(videoPath)}.jpg`
            );

            ffmpeg(videoPath)
                .on("end", () => {

                    resolve({
                        path: output,
                        seekTime
                    });

                })
                .on("error", reject)
                .screenshots({
                    timestamps: [seekTime],
                    filename: `${this.getFileName(videoPath)}.jpg`,
                    folder: outputDir,
                    size: "1280x?"
                });

        });

    }

    /**
     * Prefer English subtitle.
     * Skip image-based subtitles.
     */
    getBestSubtitleStream(streams = []) {

        if (!streams.length)
            return null;

        // Text subtitle codecs supported by FFmpeg
        const supported = [
            "subrip",
            "srt",
            "ass",
            "ssa",
            "webvtt",
            "mov_text"
        ];

        const textStreams = streams.filter(stream =>
            supported.includes(
                (stream.codec || "").toLowerCase()
            )
        );

        if (!textStreams.length)
            return null;

        // Prefer English
        const english = textStreams.find(stream =>
            (stream.language || "")
                .toLowerCase()
                .startsWith("en")
        );

        return english || textStreams[0];

    }

    /**
     * Extract embedded subtitle
     */
    async extractSubtitle(videoPath) {

        const metadata =
            await this.extractMetadata(videoPath);

        const stream =
            this.getBestSubtitleStream(
                metadata.subtitleStreams
            );

        if (!stream)
            return null;

        const outputDir = path.join(
            process.cwd(),
            "uploads",
            "subtitles"
        );

        this.createDirectory(outputDir);

        const output = path.join(
            outputDir,
            `${this.getFileName(videoPath)}.srt`
        );

        return new Promise((resolve, reject) => {

            ffmpeg(videoPath)
                .outputOptions([
                    `-map 0:${stream.index}`
                ])
                .output(output)
                .on("end", () => {

                    resolve(output);

                })
                .on("error", reject)
                .run();

        });

    }

    /**
     * Convert SRT -> VTT
     */
    convertSrtToVtt(srtPath) {

        return new Promise((resolve, reject) => {

            if (!fs.existsSync(srtPath)) {
                return reject(
                    new Error("SRT file not found.")
                );
            }

            const output =
                srtPath.replace(".srt", ".vtt");

            ffmpeg(srtPath)
                .output(output)
                .on("end", () => {

                    resolve(output);

                })
                .on("error", reject)
                .run();

        });

    }
        /**
     * Get video duration in seconds
     */
    async getDuration(videoPath) {

        const metadata =
            await this.extractMetadata(videoPath);

        return metadata.duration;

    }

    /**
     * Check whether file exists
     */
    fileExists(filePath) {

        return fs.existsSync(filePath);

    }

    /**
     * Get file size in bytes
     */
    getFileSize(filePath) {

        if (!fs.existsSync(filePath))
            return 0;

        return fs.statSync(filePath).size;

    }

    /**
     * Create unique filename
     */
    uniqueFileName(originalName) {

        const ext =
            path.extname(originalName);

        const name =
            path.basename(originalName, ext);

        return `${name}_${Date.now()}${ext}`;

    }

    /**
     * Get MIME type from extension
     */
    getMimeType(filePath) {

        const ext =
            path.extname(filePath)
                .toLowerCase();

        const mime = {

            ".mp4": "video/mp4",

            ".mov": "video/quicktime",

            ".avi": "video/x-msvideo",

            ".mkv": "video/x-matroska",

            ".webm": "video/webm",

            ".m4v": "video/x-m4v",

            ".flv": "video/x-flv"

        };

        return mime[ext] ||
            "application/octet-stream";

    }

    /**
     * Remove directory recursively
     */
    deleteDirectory(dir) {

        try {

            if (fs.existsSync(dir)) {

                fs.rmSync(dir, {
                    recursive: true,
                    force: true
                });

            }

        }
        catch (err) {

            console.error(err);

        }

    }

    /**
     * Ensure file exists
     */
    ensureFile(filePath) {

        if (!fs.existsSync(filePath)) {

            throw new Error(
                `File not found: ${filePath}`
            );

        }

        return true;

    }

}

module.exports = new FFmpegService();