import { tavilyImageSearch } from "@/lib/search";

type ImageSearchBody = {
  query?: string;
};

function shouldFetchImages(query: string): boolean {
  const normalized = query.toLowerCase();

  if (normalized.length < 4) {
    return false;
  }

  if (
    /\b(code|coding|debug|bug|error|stack trace|typescript|javascript|react|nextjs|next\.js|api|sql|database|function|class|component|tailwind|css)\b/i.test(
      normalized,
    )
  ) {
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImageSearchBody;
    const query = body.query?.trim();

    if (!query) {
      return Response.json({ images: [], skipped: true });
    }

    if (!shouldFetchImages(query)) {
      return Response.json({ images: [], skipped: true });
    }

    const images = await tavilyImageSearch(query, { maxResults: 8 });

    return Response.json({
      images,
      skipped: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image search failed";

    return Response.json(
      {
        images: [],
        skipped: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
