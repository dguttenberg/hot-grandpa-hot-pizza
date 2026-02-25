# 🔥 Hot Grandpa Generator
### A Williamsburg Pizza Marketing Prototype

> *"If we can make your grandpa hot, we can make your pizza hot."*

---

## What It Does

Users upload a photo of any person. The app:
1. Analyzes the photo with Claude (face detection, age estimation, safety checks)
2. Dynamically builds a transformation prompt based on the analysis
3. Sends the original image + prompt to Gemini 2.5 Flash Image for transformation
4. Reveals the "hot grandpa" result side-by-side with the original
5. Lets users download or share via Web Share API (native) or clipboard (desktop fallback)

---

## Architecture

```
User Upload
    │
    ▼
POST /api/analyze   ──▶  Claude Sonnet 4.5 (Vision)
                          • Face detection
                          • Age estimation
                          • Gender presentation
                          • Safety check
                          • Notable features extraction
                          └──▶ Structured JSON
    │
    ▼
Dynamic Prompt Builder
    • Already elderly? → enhance attractiveness
    • Not elderly? → age forward to 70s, then enhance
    • Female presentation? → "hot grandma" framing
    • Pizza box atmosphere always included
    │
    ▼
POST /api/generate  ──▶  Gemini 2.5 Flash Image
                          • Input: original image (base64) + prompt
                          • Output: transformed image (base64)
    │
    ▼
Client-side Reveal
    • Side-by-side display
    • Download button
    • Web Share API (mobile) / Clipboard fallback (desktop)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + custom CSS animations |
| Vision Analysis | Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) |
| Image Generation | Gemini 2.5 Flash Image (gemini-2.5-flash-image) |
| Deployment | Vercel |

---

## Model Selection Notes

### Vision: Claude Sonnet 4.5
The brief specified claude-sonnet-4-20250514; we use claude-sonnet-4-5-20250929 (the current Sonnet 4.5), which has equivalent or better vision capabilities and is the recommended production model.

### Generation: Gemini 2.5 Flash Image
After research, gemini-2.5-flash-image is the correct current model string. This is a dedicated image generation model (not just gemini-2.5-flash with image input). It supports:
- Native image-to-image editing via multimodal input
- Identity preservation through detailed prompt instructions
- Natural language editing with visual reasoning

The brief suggested gemini-2.5-flash but that model does not output images — gemini-2.5-flash-image is the right choice for this use case.

---

## How to Run Locally

Prerequisites: Node.js 18+, npm

```bash
# 1. Clone and install
git clone <your-repo>
cd hot-grandpa
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your API keys

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

---

## Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Settings → Environment Variables
# ANTHROPIC_API_KEY and GEMINI_API_KEY
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

Important: Set your environment variables in the Vercel dashboard. Do NOT commit .env.local.

---

## Key Design Decisions

### Dynamic Prompt Construction
The prompt is never static. It branches based on:
- already_elderly → enhance vs. age-forward strategy
- gender_presentation → grandpa / grandma / neutral framing
- notable_features → anchors identity so the output looks like the same person
- Pizza box atmosphere is always woven into the scene description

### Pizza Box in the Prompt
Rather than overlaying graphics post-generation, the pizza box aesthetic is built into the generation prompt as ambient atmosphere ("an open pizza box nearby, steam rising, warm light like a beloved neighborhood pizzeria"). This integrates the brand naturally without risking text distortion from the model.

### Image Stays Client-Side
No server-side storage. The generated image exists as a base64 data URL in the browser. Download and Share operate directly from that data — simple and privacy-respecting.

### Vercel Timeout Configuration
- /api/analyze: 30 seconds (Claude calls are typically fast)
- /api/generate: 60 seconds (Gemini image generation can take 30-45s)

### Safety Pipeline
Hard stops enforced server-side via Claude analysis:
- No face detected → friendly error
- Subject appears minor → blocked
- Image flagged unsafe → blocked

---

## Known Limitations

- Identity preservation is probabilistic. Results vary — the output sometimes looks like the same person's distinguished cousin rather than an exact match.
- Processing time is 30-60 seconds for the full pipeline. The spinning pizza and rotating copy help.
- Drag-and-drop does not work on mobile — the file picker fallback covers this.
- Gemini outputs images at a fixed resolution; very high-resolution inputs don't guarantee higher-resolution outputs.
- No retry logic on API failures in this prototype — a production version should add per-step retries.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| ANTHROPIC_API_KEY | Your Anthropic API key (from console.anthropic.com) |
| GEMINI_API_KEY | Your Google AI API key (from aistudio.google.com) |
