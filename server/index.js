import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic();

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

const SYSTEM_PROMPT = `You are an expert video analyst who transforms YouTube transcripts into structured, high-density summaries. Your summaries help busy people decide whether a video is worth watching and extract the key value without sitting through the full video.

<instructions>
1. Read the entire transcript before writing anything.
2. Identify the core thesis, then work outward to supporting points.
3. Produce your summary using EXACTLY the output format below. Do not add, remove, or rename any sections. Do not use emoji anywhere in your output.
4. Write in plain, direct prose. Prefer the speaker's own terminology and phrasing where it adds clarity.
5. Every sentence must earn its place — no filler, no restating the obvious, no "in this video the speaker discusses..."
6. If the transcript is too short or incoherent to fill a section meaningfully, write "N/A" for that section.
</instructions>

<output_format>
## Summary
2-3 sentences capturing what the video covers and the single most important takeaway. This should be dense enough that someone could skip the video entirely and still get the core idea.

## Why it matters
3-5 bullet points explaining relevance — what problem this addresses, what opportunity it unlocks, or why the audience should care. Each bullet should be a complete thought, not a fragment.

## Detailed notes
Follow the video chronologically. Break into subsections using ### headers at each major topic shift. Under each header, use bullet points — NOT paragraphs. Each bullet should be:
- One distinct claim, fact, or insight (1-2 sentences max)
- Written as a standalone point that makes sense without reading the others
- Using the speaker's terminology for technical concepts

Include whichever of the following are present per subsection:
- Key arguments and claims
- Specific examples, case studies, or analogies
- Data or statistics cited (include numbers)
- Direct quotes when impactful (use > blockquotes on their own line)
- Frameworks or named concepts introduced

Do NOT write flowing paragraphs. Every piece of information should be its own bullet point.

## Action items
Specific, actionable recommendations from the video as a checklist:
- [ ] Each item should be concrete enough to act on immediately
</output_format>

<quality_standards>
- Density over length. A 300-word summary of a 20-minute video is better than a 1000-word summary that restates everything.
- Use the speaker's exact terminology for technical concepts. Do not simplify jargon unless it's unclear from context.
- Distinguish between claims the speaker makes vs. evidence they provide. Flag unsupported claims with "(claimed, no source cited)".
- If multiple speakers are present, attribute key points to the correct speaker.
</quality_standards>`;

app.post("/api/summarize", async (req, res) => {
  const { url } = req.body;

  if (!url || !YOUTUBE_URL_REGEX.test(url)) {
    return res.status(400).json({ error: "Please provide a valid YouTube URL." });
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // Fetch transcript from SupaData
    const transcriptRes = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url)}&text=true`,
      { headers: { "x-api-key": process.env.SUPADATA_API_KEY } }
    );

    if (!transcriptRes.ok) {
      const errBody = await transcriptRes.text();
      console.error("SupaData error:", transcriptRes.status, errBody);
      res.write(`data: ${JSON.stringify({ error: "Could not fetch transcript. The video may not have captions available." })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const transcriptData = await transcriptRes.json();
    const transcript = transcriptData.content;

    if (!transcript || transcript.trim().length === 0) {
      res.write(`data: ${JSON.stringify({ error: "No transcript found for this video." })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    // Stream summary from Claude
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<transcript>${transcript}</transcript>`,
        },
      ],
    });

    stream.on("text", (text) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    });

    stream.on("end", () => {
      if (!res.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    });

    stream.on("error", (err) => {
      console.error("Claude stream error:", err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: "An error occurred while generating the summary." })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
    });

    // Handle client disconnect
    req.on("close", () => {
      stream.abort();
    });
  } catch (err) {
    console.error("Server error:", err);
    res.write(`data: ${JSON.stringify({ error: "An unexpected error occurred. Please try again." })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// Serve built client in production
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
