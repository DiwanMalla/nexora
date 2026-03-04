import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        { error: message || "Failed to fetch Groq models." },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to Groq API." },
      { status: 500 },
    );
  }
}
