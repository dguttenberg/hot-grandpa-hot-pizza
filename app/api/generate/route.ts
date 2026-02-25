import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../analyze/route";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const pizzaAtmosphere = `The setting should subtly evoke a warm, Italian-American atmosphere — think the kind of place where a perfect pizza box sits nearby, steam rising, warm ambient light like a beloved neighborhood pizzeria. The pizza box doesn't need to be prominent, just part of the scene's soul.`;

  if (transformation_type === "enhance_only" || already_elderly) {
    return `Enhance the attractiveness of the person in this photo while fully preserving their age, identity, and every recognizable feature. Make them look like a distinguished, confident ${subjectLabel} version of themselves. Their identity must be completely preserved — same face shape, same bone structure, same ${notable_features}. Warm flattering lighting, well-groomed, elegant and dignified. Same person — just their most radiant, magnetic elderly self. Tone: humorous, charming, tasteful. Not explicit, not sexual. ${pizzaAtmosphere} This is the platonic ideal of a ${grandparentWord} — someone you'd trust to hand you a slice and a life lesson.`;
  }

  return `Transform the person in this photo into a charming, attractive version of themselves in their 70s. This MUST look like the same person, naturally aged — preserve their facial structure, ethnicity, bone structure, and all recognizable features including ${notable_features}. Age them organically: silver or white hair (if applicable), distinguished wrinkles that tell a story, confident posture. Style them attractively: well-groomed, warm flattering light. Do NOT de-age them. Do not change their identity. Do not make them a different person. The result should be unmistakably the same individual — just the most charming, silver-fox ${subjectLabel} version of who they're becoming. Tone: humorous, warm, tasteful. Not explicit, not sexual. ${pizzaAtmosphere} This is someone who has perfected both their sourdough starter and their smile — a ${grandparentWord} worth showing off.`;
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
