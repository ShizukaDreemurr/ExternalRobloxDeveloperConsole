// Parse sources/quiz_6_11.md -> src/data/questions.base.json (nguyên văn đề & phương án)
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync(new URL("../sources/quiz_6_11.md", import.meta.url), "utf8");
const out: unknown[] = [];
let quiz = 0;
let cur: any = null;
for (const raw of md.split(/\r?\n/)) {
  const line = raw.trim();
  const qz = line.match(/^## Quiz (\d+)/);
  if (qz) { quiz = Number(qz[1]); continue; }
  const q = line.match(/^\*\*Câu (\d+) \((1 đáp án|nhiều đáp án)\):\*\*\s*(.+)$/);
  if (q) {
    cur = {
      id: `q${String(quiz).padStart(2, "0")}-${String(q[1]).padStart(2, "0")}`,
      quiz, number: Number(q[1]),
      type: q[2] === "1 đáp án" ? "single" : "multi",
      prompt: q[3], options: [],
    };
    out.push(cur);
    continue;
  }
  const o = line.match(/^- ([ABCD])\. (.+)$/);
  if (o && cur) cur.options.push({ key: o[1], text: o[2] });
}
writeFileSync(new URL("../src/data/questions.base.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`Parsed ${out.length} questions`);
