import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../analyze/route";

function buildPrompt(analysis: AnalysisResult): string {
  const { already_elderly, gender_presentation, notable_features, transformation_type } = analysis;

  const subjectLabel =
    gender_presentation === "female"
      ? "hot grandma"
      : gender_presentation === "male"
      ? "hot grandpa"
      : "distinguished silver-fox elder";

  const grandparentWord =
    gender_presentation === "female"
      ? "grandmother"
      : gender_presentation === "male"
      ? "grandfather"
      : "grandparent";

  const pizzaAtmosphere = `Background: a warmly lit, intimate Italian-American setting — a worn wooden table, the corner of an open pizza box with steam rising, candlelight or golden hour light casting a flattering glow. The pizza box is part of the scene, not the focus.`;

  if (transformation_type === "enhance_only" || already_elderly) {
    return `Take the person in this photo and make them DRAMATICALLY, UNDENIABLY attractive while fully preserving their age and identity. Think George Clooney or Helen Mirren at peak silver-fox power. Keep every recognizable feature — same face shape, bone structure, ${notable_features} — but crank up the magnetism to 11. Perfect silver hair, chiseled or elegant bone structure catching the light, piercing confident eyes, a slight knowing smile. Impeccably styled: sharp clothing, flawless grooming, the kind of person who walks into a room and everyone notices. This is not subtle. This is HOT. Dramatically flattering cinematic lighting. Tone: over-the-top charming, tasteful, not explicit or sexual — just impossibly attractive. ${pizzaAtmosphere}`;
  }

  return `Transform the person in this photo into the most DRAMATICALLY HOT version of themselves in their early 70s — think peak silver-fox or silver-vixen energy. This MUST be unmistakably the same person — preserve their facial structure, ethnicity, bone structure, and all distinctive features including ${notable_features}. Age them into their most attractive possible self: thick silver or white hair styled perfectly, distinguished laugh lines that somehow make them more attractive, jawline still sharp, eyes piercing and full of life. Style them like they just stepped off a yacht or out of a Fellini film — impeccable clothing, perfect grooming, radiating effortless confidence. Cinematic lighting that makes them look like a movie star. This should make people look twice and say "wait, THAT'S a grandpa?!" Tone: dramatically attractive, humorous, tasteful — not explicit or sexual, just absurdly, over-the-top HOT. Do NOT de-age. Do not change their identity. Same person — just the hottest possible version of their future self. ${pizzaAtmosphere}`;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType, analysis } = await request.json();

    if (!imageBase64 || !mimeType || !analysis) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(analysis as AnalysisResult);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract the generated image from the response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No response parts from Gemini");
    }

    let generatedImageBase64: string | null = null;
    let responseText: string | null = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedImageBase64 = part.inlineData.data;
      }
      if (part.text) {
        responseText = part.text;
      }
    }

    if (!generatedImageBase64) {
      console.error("Gemini response parts:", JSON.stringify(parts, null, 2));
      console.error("Gemini text response:", responseText);
      throw new Error("No image generated in response");
    }

    return NextResponse.json({
      imageBase64: generatedImageBase64,
      mimeType: "image/png",
      prompt, // included for debugging/README
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
