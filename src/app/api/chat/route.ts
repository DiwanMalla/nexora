import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";

export const runtime = "edge";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  let provider: any = openrouter;
  let modelId = model || "openai/gpt-4o";

  // Determine provider based on model ID or name
  if (
    modelId.includes("llama-3.3-70b-versatile") ||
    modelId.toLowerCase().includes("groq")
  ) {
    provider = groq;
    // Use the specific groq model ID if needed
    if (modelId === "llama-3.3-70b-versatile") {
      modelId = "llama-3.3-70b-versatile";
    }
  }

  try {
    const result = await generateText({
      model: provider(modelId),
      messages,
    });

    return NextResponse.json({ text: result.text }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate chat response." },
      { status: 500 },
    );
  }
}
