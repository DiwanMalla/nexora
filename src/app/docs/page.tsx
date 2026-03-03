import Link from "next/link";
import { Nav } from "@/components/layout/Nav";
import { GlassPanel } from "@/components/layout/GlassPanel";

const docLinks = [
  { name: "Readme", path: "Readme.md" },
  { name: "Planning", path: "Planning.md" },
  { name: "Architecture", path: "Architecture.md" },
  { name: "ENV", path: "ENV.md" },
  { name: "Milestones", path: "MILESTONES.md" },
  { name: "Database", path: "DATABASE.md" },
  { name: "API", path: "API.md" },
  { name: "Agents", path: "AGENTS.md" },
  { name: "UI Components", path: "UI_COMPONENTS.md" },
  { name: "Competitors", path: "COMPETITORS.md" },
];

export default function DocsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen px-4 pt-28 pb-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold text-white">Documentation</h1>
          <p className="mt-2 text-gray-400">
            All docs live in the <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">docs/</code> folder in the repo.
          </p>
          <GlassPanel className="mt-8 space-y-2 p-6">
            <p className="text-sm text-gray-400">
              Open <strong className="text-white">docs/docs.html</strong> in your browser to browse everything in one page. Or open individual files:
            </p>
            <ul className="mt-4 space-y-2">
              {docLinks.map(({ name, path }) => (
                <li key={path}>
                  <span className="font-medium text-white">{name}</span>
                  <span className="mx-2 text-gray-500">·</span>
                  <code className="text-sm text-cyan">{path}</code>
                </li>
              ))}
            </ul>
          </GlassPanel>
          <Link
            href="/"
            className="mt-8 inline-block text-cyan hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
