import os
import sys
import json

from faster_whisper import WhisperModel

MODEL = "turbo"

model = WhisperModel(
    MODEL,
    device="cpu",
    compute_type="int8"
)


def seconds_to_srt(seconds):

    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)

    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def write_srt(segments, output):

    with open(output, "w", encoding="utf-8") as f:

        for index, segment in enumerate(segments, start=1):

            f.write(f"{index}\n")

            f.write(
                f"{seconds_to_srt(segment.start)} --> {seconds_to_srt(segment.end)}\n"
            )

            f.write(segment.text.strip())

            f.write("\n\n")


def main():

    if len(sys.argv) < 3:

        print("Usage: python whisper.py input.mp4 output.srt")

        sys.exit(1)

    input_video = sys.argv[1]

    output_srt = sys.argv[2]

    output_json = output_srt.replace(".srt", ".json")

    segments, info = model.transcribe(
        input_video,
        beam_size=5,
        vad_filter=True,
        word_timestamps=False
    )

    segments = list(segments)

    write_srt(segments, output_srt)

    transcription = []

    full_text = []

    for seg in segments:

        transcription.append({

            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip()

        })

        full_text.append(seg.text.strip())

    result = {

        "language": info.language,

        "duration": info.duration,

        "text": " ".join(full_text),

        "segments": transcription

    }

    with open(output_json, "w", encoding="utf-8") as f:

        json.dump(result, f, indent=4, ensure_ascii=False)

    print(json.dumps(result))


if __name__ == "__main__":
    main()