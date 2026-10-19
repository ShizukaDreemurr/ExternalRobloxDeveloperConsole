import { Fragment, type ReactNode } from "react";

function inline(s: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith("**") ? <strong key={`${key}b${i++}`}>{t.slice(2, -2)}</strong> : <em key={`${key}i${i++}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Markdown tối giản: đoạn, danh sách -, 1., bảng |, **đậm**, *nghiêng*. Không dùng innerHTML. */
export default function Md({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (!ln.trim()) { i++; continue; }
    if (ln.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      const body = rows.filter((r) => !r.every((c) => /^-+$/.test(c)));
      blocks.push(
        <table key={k++}>
          <thead><tr>{body[0].map((c, j) => <th key={j}>{inline(c, `h${j}`)}</th>)}</tr></thead>
          <tbody>{body.slice(1).map((r, a) => <tr key={a}>{r.map((c, b) => <td key={b}>{inline(c, `c${a}${b}`)}</td>)}</tr>)}</tbody>
        </table>,
      );
    } else if (/^- /.test(ln)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      blocks.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t, `u${j}`)}</li>)}</ul>);
    } else if (/^\d+\. /.test(ln)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
      blocks.push(<ol key={k++}>{items.map((t, j) => <li key={j}>{inline(t, `o${j}`)}</li>)}</ol>);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(- |\d+\. |\|)/.test(lines[i])) para.push(lines[i++]);
      blocks.push(<p key={k++} className="my-1.5">{para.map((t, j) => <Fragment key={j}>{j > 0 && " "}{inline(t, `p${j}`)}</Fragment>)}</p>);
    }
  }
  return <div className="md text-sm">{blocks}</div>;
}
