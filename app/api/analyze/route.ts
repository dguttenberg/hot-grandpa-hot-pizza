import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export interface AnalysisResult {
  face_detected: boolean;
  appears_minor: boolean;
  estimated_age_range: string;
  already_elderly: boolean;
  gender_presentation: "male" | "female" | "neutral";
  safe_to_process: boolean;
  transformation_type: "age_up_and_enhance" | "enhance_only";
  notable_features: string;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analyze this photo and return ONLY a JSON object with no other text or markdown. The JSON must have exactly these fields:

{
  "face_detected": boolean (true if a human face is clearly visible),
  "appears_minor": boolean (true if the person appears under 18 - err on side of caution),
  "estimated_age_range": string (e.g. "20s", "30s", "40s", "50s", "60s", "70s+"),
  "already_elderly": boolean (true if the person appears 65 or older),
  "gender_presentation": "male" | "female" | "neutral",
  "safe_to_process": boolean (false if image contains nudity, violence, or inappropriate content),
  "transformation_type": "age_up_and_enhance" | "enhance_only",
  "notable_features": string (brief comma-separated list of distinctive physical features that anchor identity: hair color/style, facial hair, glasses, skin tone, bone structure, etc.)
}

Rules:
- If no face is detected, set face_detected to false and safe_to_process to false
- If appears_minor is true, set safe_to_process to false
- transformation_type should be "enhance_only" if already_elderly is true, otherwise "age_up_and_enhance"
- notable_features should help an image model recreate this specific person's look

Return ONLY the JSON object, no other text.`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Clean up response in case there's any markdown
    const cleanedText = textContent.text
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    const analysis: AnalysisResult = JSON.parse(cleanedText);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
