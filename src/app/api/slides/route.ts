
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { auth } from "@clerk/nextjs/server";

export const runtime = "edge";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const SYSTEM_PROMPT = `You are a presentation assistant. 
You help the user create and refine slide decks.
You must ALWAYS respond with a JSON block containing the full slide deck state, inside a markdown code block like so:
\`\`\`json
{
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Slide 1",
      "bullets": ["Point 1", "Point 2"]
    }
  ]
}
\`\`\`
Along with the JSON, you can include a short conversational message before or after the JSON block explaining what you did, which will be shown in the chat panel. 
Whenever the user asks for changes (e.g. "make it shorter", "add a slide"), you must output the FULL updated JSON deck so the UI can render the complete presentation.`;

export async function POST(req: Request) {
  const authState = await auth();
  if (!authState.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, model } = await req.json();

  const modelId = model || "llama-3.3-70b-versatile";

  const result = await streamText({
    model: groq(modelId),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
  });

  return result.toTextStreamResponse();
}
