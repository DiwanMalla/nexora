import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextResponse } from "next/server";

export const runtime = "edge";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  const modelId = model || "llama-3.3-70b-versatile";

  try {
    const result = await generateText({
      model: groq(modelId),
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
