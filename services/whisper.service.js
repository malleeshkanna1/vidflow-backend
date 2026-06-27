const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class WhisperService {

    /**
     * Run Faster Whisper
     *
     * @param {String} videoPath
     * @param {String} outputSrt
     * @returns
     */
    async transcribe(videoPath, outputSrt) {

        return new Promise((resolve, reject) => {

            if (!fs.existsSync(videoPath)) {
                return reject(new Error("Video file not found."));
            }

            const pythonScript = path.join(
                process.cwd(),
                "python",
                "whisper.py"
            );

            if (!fs.existsSync(pythonScript)) {
                return reject(new Error("whisper.py not found."));
            }

            const python = process.env.PYTHON_PATH || "python";

            const processWhisper = spawn(python, [
                pythonScript,
                videoPath,
                outputSrt
            ]);

            let stdout = "";
            let stderr = "";

            processWhisper.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            processWhisper.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            processWhisper.on("error", (err) => {
                reject(err);
            });

            processWhisper.on("close", (code) => {

                if (code !== 0) {
                    return reject(
                        new Error(stderr || `Whisper exited with code ${code}`)
                    );
                }

                try {

                    const result = JSON.parse(stdout);

                    resolve({
                        success: true,

                        language: result.language,

                        duration: result.duration,

                        transcription: result.text,

                        segments: result.segments,

                        srtPath: outputSrt,

                        jsonPath: outputSrt.replace(".srt", ".json")
                    });

                } catch (err) {

                    reject(new Error("Unable to parse Whisper output."));

                }

            });

        });

    }

}

module.exports = new WhisperService();