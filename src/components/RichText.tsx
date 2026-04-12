import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders text containing LaTeX ($...$ / $$...$$) and markdown (**bold**, *italic*, newlines).
 * Use this anywhere AI-generated content needs to be displayed.
 */
export function RichText({ text, block = false }: { text: string; block?: boolean }) {
  if (!text) return null;

  // Tokenise: $$...$$ (display math), $...$ (inline math),
  // bare superscripts like x^2 / x^{n+1} that the model forgot to wrap in $,
  // **bold**, *italic*, \n.
  // The bare-^ patterns come AFTER the $-patterns so dollar-wrapped math takes priority.
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\w+\^(?:\{[^}]+\}|\w+)|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\n)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const raw = m[0];

    if (raw === "\n") {
      nodes.push(<br key={key++} />);
    } else if (raw.startsWith("$$")) {
      const latex = raw.slice(2, -2);
      try {
        const html = katex.renderToString(latex, { displayMode: true, throwOnError: false, trust: false });
        nodes.push(<span key={key++} className="my-2 block text-center" dangerouslySetInnerHTML={{ __html: html }} />);
      } catch {
        nodes.push(<span key={key++}>{raw}</span>);
      }
    } else if (raw.startsWith("$")) {
      const latex = raw.slice(1, -1);
      try {
        const html = katex.renderToString(latex, { displayMode: false, throwOnError: false, trust: false });
        nodes.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
      } catch {
        nodes.push(<span key={key++}>{raw}</span>);
      }
    } else if (raw.includes("^") && !raw.startsWith("$")) {
      // bare superscript — render as inline KaTeX
      try {
        const html = katex.renderToString(raw, { displayMode: false, throwOnError: false, trust: false });
        nodes.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
      } catch {
        nodes.push(<span key={key++}>{raw}</span>);
      }
    } else if (raw.startsWith("**")) {
      nodes.push(<strong key={key++}>{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith("*")) {
      nodes.push(<em key={key++}>{raw.slice(1, -1)}</em>);
    }

    last = m.index + raw.length;
  }

  if (last < text.length) nodes.push(<span key={key++}>{text.slice(last)}</span>);

  return block ? <span className="block">{nodes}</span> : <span>{nodes}</span>;
}
