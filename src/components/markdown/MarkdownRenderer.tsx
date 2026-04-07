"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { normalizeMarkdownForRender } from "@/lib/markdown/normalize-markdown";

type MarkdownRendererProps = {
  content: string;
  /** When true, `content` is already normalized — do not trim/collapse again. */
  skipNormalize?: boolean;
  className?: string;
  components?: Components;
  extraRemarkPlugins?: unknown[];
};

/**
 * Shared markdown renderer for all assistant-facing surfaces.
 * Ensures consistent GFM support (tables/lists/links), math, and normalization.
 */
export function MarkdownRenderer({
  content,
  skipNormalize = false,
  className,
  components,
  extraRemarkPlugins,
}: MarkdownRendererProps) {
  const remarkPlugins = [remarkGfm, remarkMath, ...(extraRemarkPlugins ?? [])];
  const markdown = skipNormalize ? content : normalizeMarkdownForRender(content);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins as any}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
