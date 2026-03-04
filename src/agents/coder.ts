/**
 * Coder agent: code generation, debugging, run in sandbox (E2B).
 * @see docs/AGENTS.md (P1)
 */

export const CODER_SLUG = "coder";

export type CoderInput = {
  query: string;
  code?: string;
  runInSandbox?: boolean;
};

export type CoderOutput = {
  content: string;
  codeBlocks?: string[];
  runResult?: { stdout?: string; stderr?: string };
};

/** Stub: will be implemented with LangGraph + E2B sandbox. */
export async function runCoder(_input: CoderInput): Promise<CoderOutput> {
  return {
    content: "",
  };
}
