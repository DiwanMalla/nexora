/**
 * Remark plugin: wraps specific Omni report sections into custom nodes.
 *
 * It targets h2 headings like:
 * - "## ✅ Verified in retrieved artifacts"
 * - "## 🛠️ Documented / planned (not verified wired)"
 * - "## ⚠️ Uncertain / not verified from retrieved files"
 * - "## Top 3 beta-readiness priorities"
 *
 * Each targeted section becomes a custom node type `omniSection` so the UI
 * can render it as a visually distinct "report card" block.
 */
export function remarkOmniReportSections() {
  return (tree: any) => {
    const children: any[] = Array.isArray(tree?.children)
      ? tree.children
      : [];
    if (!children.length) return;

    type Kind = "verified" | "documented" | "uncertain" | "priorities";

    const classifyKind = (title: string): Kind | null => {
      const t = title.toLowerCase();
      if (t.includes("verified") && t.includes("retrieved")) return "verified";
      if (t.includes("documented") && (t.includes("planned") || t.includes("not verified"))) {
        return "documented";
      }
      if (t.includes("uncertain") || (t.includes("not verified") && t.includes("retrieved"))) {
        return "uncertain";
      }
      if (t.includes("top 3") && t.includes("beta-readiness")) return "priorities";
      // Fallback: allow "beta-readiness priorities" without the emoji.
      if (t.includes("beta-readiness") && t.includes("priorit")) return "priorities";
      return null;
    };

    const headingToText = (node: any): string => {
      const parts: string[] = [];
      const walk = (n: any) => {
        if (!n) return;
        if (n.type === "text" && typeof n.value === "string") {
          parts.push(n.value);
          return;
        }
        if (Array.isArray(n.children)) {
          for (const c of n.children) walk(c);
        }
      };
      walk(node);
      return parts.join("").trim();
    };

    const out: any[] = [];

    for (let i = 0; i < children.length; i++) {
      const node = children[i];

      const isTargetH2 =
        node?.type === "heading" && node?.depth === 2 && Array.isArray(node.children);
      if (!isTargetH2) {
        out.push(node);
        continue;
      }

      const title = headingToText(node);
      const kind = classifyKind(title);

      if (!kind) {
        out.push(node);
        continue;
      }

      // Collect nodes until the next h2.
      const sectionNodes: any[] = [];
      let j = i + 1;
      for (; j < children.length; j++) {
        const next = children[j];
        if (next?.type === "heading" && next?.depth === 2) break;
        sectionNodes.push(next);
      }

      out.push({
        type: "omniSection",
        kind,
        title,
        children: sectionNodes,
      });

      i = j - 1;
    }

    tree.children = out;
  };
}

