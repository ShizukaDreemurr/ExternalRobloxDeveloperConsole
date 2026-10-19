// Kiểm tra toàn vẹn dữ liệu: fail (exit 1) nếu vi phạm bất kỳ quy tắc nào.
import { questions } from "../src/data/questions";
import { knowledge } from "../src/data/knowledge";
import { normalizeVi } from "../src/lib/normalizeVi";

const errors: string[] = [];
const err = (m: string) => errors.push(m);
const cardIds = new Set(knowledge.map((k) => k.id));
if (cardIds.size !== knowledge.length) err("Trùng id thẻ kiến thức");

if (questions.length !== 90) err(`Số câu = ${questions.length}, cần 90`);
for (const lesson of [6, 7, 8, 9, 10, 11]) {
  const n = questions.filter((q) => q.quiz === lesson).length;
  if (n !== 15) err(`Quiz ${lesson} có ${n} câu, cần 15`);
}
const seen = new Set<string>();
for (const q of questions) {
  if (seen.has(q.id)) err(`${q.id}: trùng id`);
  seen.add(q.id);
  const keys = new Set(q.options.map((o) => o.key));
  if (q.options.length !== 4) err(`${q.id}: cần 4 phương án`);
  if (q.answer.length === 0) err(`${q.id}: đáp án rỗng`);
  for (const a of q.answer) if (!keys.has(a)) err(`${q.id}: đáp án ${a} không tồn tại`);
  if (q.type === "single" && q.answer.length !== 1) err(`${q.id}: single nhưng có ${q.answer.length} đáp án`);
  if (q.type === "multi" && q.answer.length < 2) err(`${q.id}: multi nhưng <2 đáp án`);
  if (q.knowledgeIds.length === 0) err(`${q.id}: thiếu knowledgeIds`);
  for (const id of q.knowledgeIds) if (!cardIds.has(id)) err(`${q.id}: knowledgeId ${id} không tồn tại`);
  if (!q.explanation || q.notes.some((n) => !n)) err(`${q.id}: thiếu giải thích/ghi chú`);
  if (q.hints.some((h) => !h)) err(`${q.id}: thiếu gợi ý`);
  const correct = q.options.filter((o) => q.answer.includes(o.key)).map((o) => normalizeVi(o.text));
  for (const i of [0, 1] as const) {
    const h = normalizeVi(q.hints[i]);
    for (const c of correct) if (c.length >= 6 && h.includes(c)) err(`${q.id}: gợi ý bậc ${i + 1} chứa nguyên văn đáp án đúng “${c}”`);
  }
}
for (const k of knowledge) {
  if (!/^Bài (6|7|8|9|10|11) · Phần [12]( & [12])?$/.test(k.source)) err(`${k.id}: source không hợp lệ “${k.source}”`);
  for (const r of k.related) if (!cardIds.has(r)) err(`${k.id}: related ${r} không tồn tại`);
  if (k.keywords.length === 0) err(`${k.id}: thiếu keywords`);
}
for (const lesson of [6, 7, 8, 9, 10, 11]) {
  const n = knowledge.filter((k) => k.lesson === lesson).length;
  if (n < 8) err(`Bài ${lesson} chỉ có ${n} thẻ (<8)`);
}
if (errors.length) {
  console.error(`✗ ${errors.length} lỗi dữ liệu:\n` + errors.map((e) => " - " + e).join("\n"));
  process.exit(1);
}
const verify = questions.filter((q) => q.confidence === "verify").length;
console.log(`✓ Dữ liệu hợp lệ: ${questions.length} câu, ${knowledge.length} thẻ kiến thức, ${verify} câu “đang đối chiếu”.`);
