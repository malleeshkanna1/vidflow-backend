const Groq = require("groq-sdk");

class GroqService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  emptyMetadata() {
    return {
      title: "",
      description: "",
      category: "Uncategorized",
      subcategory: "",
      location: "",
      country: "",
      city: "",
      season: "",
      timeOfDay: "",
      cameraAngle: "",
      shotType: "",
      mood: "",
      weather: "",
      indoor: false,
      dayNight: "",
      people: false,
      peopleCount: 0,
      animals: [],
      objects: [],
      activities: [],
      colors: [],
      keywords: [],
      tags: [],
    };
  }

  cleanResponse(text) {
    if (!text) return "";

    return text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
  }

  normalizeArray(arr) {
    if (!Array.isArray(arr)) return [];

    return [...new Set(
      arr
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean)
    )];
  }

  async generate(video) {
    try {
      if (
        !video ||
        !video.transcription ||
        video.transcription.trim().length < 5
      ) {
        return this.emptyMetadata();
      }

      const prompt = `
You are a professional stock footage metadata expert.

Your job is to analyze the supplied video metadata and transcript.

Generate metadata suitable for Adobe Stock, Shutterstock, Getty Images and Pond5.

Return ONLY valid JSON.

Rules:

- No markdown
- No explanation
- No comments
- Tags must be lowercase
- Keywords must be lowercase
- Maximum 20 tags
- Maximum 20 keywords
- Description must be under 250 characters
- Title must be under 80 characters
- Use empty string if unknown.
- Use [] for unknown arrays.
- Use false for unknown booleans.

JSON FORMAT

{
"title":"",
"description":"",
"category":"",
"subcategory":"",
"location":"",
"country":"",
"city":"",
"season":"",
"timeOfDay":"",
"cameraAngle":"",
"shotType":"",
"mood":"",
"weather":"",
"indoor":false,
"dayNight":"",
"people":false,
"peopleCount":0,
"animals":[],
"objects":[],
"activities":[],
"colors":[],
"keywords":[],
"tags":[]
}

VIDEO METADATA

Resolution: ${video.metadata?.resolution || ""}

Duration: ${video.metadata?.durationText || ""}

FPS: ${video.metadata?.fps || ""}

Aspect Ratio: ${video.metadata?.aspectRatio || ""}

Codec: ${video.metadata?.codec || ""}

TRANSCRIPT

${video.transcription}
`;

      const completion = await this.client.chat.completions.create({
        model:
          process.env.GROQ_MODEL ||
          "llama-3.3-70b-versatile",

        temperature: 0.2,

        max_completion_tokens: 1200,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content:
              "You generate structured JSON metadata for stock footage.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      let response =
        completion.choices?.[0]?.message?.content || "{}";

      response = this.cleanResponse(response);

      const json = JSON.parse(response);

      return {
        title: json.title || "",
        description: json.description || "",

        category: json.category || "Uncategorized",
        subcategory: json.subcategory || "",

        location: json.location || "",
        country: json.country || "",
        city: json.city || "",

        season: json.season || "",
        timeOfDay: json.timeOfDay || "",

        cameraAngle: json.cameraAngle || "",
        shotType: json.shotType || "",

        mood: json.mood || "",
        weather: json.weather || "",

        indoor: Boolean(json.indoor),

        dayNight: json.dayNight || "",

        people: Boolean(json.people),

        peopleCount: Number(json.peopleCount || 0),

        animals: this.normalizeArray(json.animals),

        objects: this.normalizeArray(json.objects),

        activities: this.normalizeArray(json.activities),

        colors: this.normalizeArray(json.colors),

        keywords: this.normalizeArray(json.keywords),

        tags: this.normalizeArray(json.tags),
      };
    } catch (err) {
      console.error("Groq Error:", err.message);

      return this.emptyMetadata();
    }
  }

  async generateFileMetadata(originalFilename, description) {

    const prompt = `
Generate metadata for this uploaded file.

Original Filename:
${originalFilename}

Description:
${description}

Return ONLY JSON.

{
    "name":"",
    "tags":[""],
    "keywords":[""]
}

Rules

- Create a professional name.

- Use filename and description.

- tags maximum 10.

- keywords maximum 20.

No markdown.
`;

    const completion =
        await this.client.chat.completions.create({

            model: "llama-3.3-70b-versatile",

            temperature: 0.2,

            response_format: {
                type: "json_object"
            },

            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]

        });

    return JSON.parse(
        completion.choices[0].message.content
    );

}
}

module.exports = new GroqService();