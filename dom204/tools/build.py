#!/usr/bin/env python3
"""Dựng dom204-quiz.html và answer-audit.md từ các nguồn trong dom204/src.

Quy trình:
1. Đọc QUIZ.md (giữ nguyên chữ của đề) và ghép với answers/qNN.json (đáp án, gợi ý, căn cứ).
2. Đọc TRANSCRIPT.txt, tách theo bài, phần và cắt thành các đoạn để tra cứu.
3. Kiểm tra mọi trích dẫn có thật trong transcript, tự gán bài và phần cho trích dẫn.
4. Kiểm tra văn phong (không dùng dấu chấm phẩy, dấu gạch dài, hai cụm từ tuyệt đối hóa).
5. Ghi dom204-quiz.html và answer-audit.md.
"""
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
CONF = {"h": "high", "m": "medium", "l": "low"}
errors = []


def err(msg):
    errors.append(msg)


def nfc(s):
    return unicodedata.normalize("NFC", s)


def norm(s):
    """Chuẩn hóa tìm kiếm: bỏ dấu, đ thành d, chữ thường."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("đ", "d")


def collapse(s):
    return re.sub(r"\s+", " ", s).strip().lower()


# ---------------------------------------------------------------- transcript
def load_transcript():
    raw = nfc((SRC / "TRANSCRIPT.txt").read_text(encoding="utf-8"))
    sections = []
    cur = None
    for line in raw.split("\n"):
        t = line.strip()
        m = re.match(r"^###\s+\**\d+\\?\.\s+(.*?)\.mp3\**\s*$", t)
        if m:
            title = m.group(1).replace("\\_", "_")
            lesson, part = None, None
            d = re.match(r"Demo công cụ_Bài (\d+)_(.*)$", title)
            p = re.search(r"Bài (\d+)_Phần (\d)", title)
            w = re.search(r"Bài (\d+)$", title)
            if d:
                lesson, part = int(d.group(1)), "Demo " + d.group(2).strip()
            elif p:
                lesson, part = int(p.group(1)), "Phần " + p.group(2)
            elif w:
                lesson, part = int(w.group(1)), "Toàn bài"
            else:
                err("Không nhận diện được tiêu đề: " + title)
            cur = {"lesson": lesson, "part": part, "title": title, "paras": []}
            sections.append(cur)
            continue
        if not t or t == "---" or cur is None:
            continue
        t = re.sub(r"\[\d+\]", "", t)
        t = re.sub(r"\\(.)", r"\1", t)
        t = t.replace(";", ",").replace("—", "-")
        t = re.sub(r"\s+", " ", t).strip()
        if t:
            cur["paras"].append(t)
    for s in sections:
        s["text"] = "\n".join(s["paras"])
        s["flat"] = collapse(s["text"])
    return sections


def make_chunks(sections):
    chunks = []
    for s in sections:
        for para in s["paras"]:
            sents = [x for x in re.split(r"(?<=[.?!])\s+", para) if x]
            buf = []
            local = []
            for x in sents:
                buf.append(x)
                if len(buf) >= 3 or sum(len(b) for b in buf) >= 380:
                    local.append(" ".join(buf))
                    buf = []
            if buf:
                tail = " ".join(buf)
                if local and len(tail) < 120:
                    local[-1] = local[-1] + " " + tail
                else:
                    local.append(tail)
            for c in local:
                chunks.append({"l": s["lesson"], "p": s["part"], "t": c})
    return chunks


def locate(sections, quote, lesson_hint=None):
    q = collapse(quote)
    found = [s for s in sections if q in s["flat"]]
    if not found:
        return None
    if lesson_hint:
        for s in found:
            if s["lesson"] == lesson_hint:
                return s
    return found[0]


# ---------------------------------------------------------------------- quiz
def load_quiz():
    text = nfc((SRC / "QUIZ.md").read_text(encoding="utf-8"))
    lessons = {}
    cur = None
    q = None
    for line in text.split("\n"):
        m = re.match(r"^## Quiz (\d+) \(Bài (\d+)\)", line)
        if m:
            cur = int(m.group(2))
            lessons[cur] = []
            continue
        m = re.match(r"^\*\*Câu (\d+) \((1 đáp án|nhiều đáp án)\):\*\* (.*)$", line)
        if m and cur:
            q = {
                "n": int(m.group(1)),
                "type": "single" if m.group(2) == "1 đáp án" else "multi",
                "prompt": m.group(3).strip(),
                "options": [],
            }
            lessons[cur].append(q)
            continue
        if q is not None:
            m = re.match(r"^- ([A-D])\. (.*)$", line)
            if m:
                q["options"].append({"id": m.group(1), "text": m.group(2).strip()})
                continue
            m = re.match(r"^- \[ \] (.*)$", line)
            if m:
                q["options"].append({"id": "ABCD"[len(q["options"])], "text": m.group(1).strip()})
    return lessons


BANNED = [";", "—", "chắc chắn", "luôn luôn"]


def lint(label, s):
    for b in BANNED:
        if b in s:
            err(f"{label}: chứa '{b}': {s[:70]}")


# ---------------------------------------------------------------------- main
def main():
    sections = load_transcript()
    chunks = make_chunks(sections)
    quiz = load_quiz()
    titles = json.loads((SRC / "summaries.json").read_text(encoding="utf-8"))
    glossary_src = json.loads((SRC / "glossary.json").read_text(encoding="utf-8"))

    lessons = []
    audit_rows = []
    counts = {"high": 0, "medium": 0, "low": 0}
    for L in range(6, 12):
        qs = quiz.get(L, [])
        if len(qs) != 15:
            err(f"Bài {L}: có {len(qs)} câu, cần 15")
        ans_path = SRC / "answers" / f"q{L:02d}.json"
        answers = json.loads(ans_path.read_text(encoding="utf-8")) if ans_path.exists() else []
        if len(answers) != 15:
            err(f"Bài {L}: có {len(answers)} đáp án, cần 15")
        out_qs = []
        for i, qd in enumerate(qs):
            if i >= len(answers):
                break
            a = answers[i]
            qid = f"q{L}-{qd['n']}"
            ans = a["a"] if isinstance(a["a"], list) else [a["a"]]
            ids = [o["id"] for o in qd["options"]]
            if not set(ans) <= set(ids):
                err(f"{qid}: đáp án ngoài phương án")
            if qd["type"] == "single" and len(ans) != 1:
                err(f"{qid}: câu 1 đáp án nhưng có {len(ans)} đáp án")
            conf = CONF[a["c"]]
            counts[conf] += 1
            if len(a["h"]) != 3:
                err(f"{qid}: cần đúng 3 gợi ý")
            if conf != "high" and not a.get("n"):
                err(f"{qid}: thiếu note")
            sec = locate(sections, a["q"], L)
            if sec is None:
                err(f"{qid}: không tìm thấy trích dẫn trong transcript: {a['q']}")
                sec = {"lesson": L, "part": "?"}
            if len(a["q"].split()) >= 30:
                err(f"{qid}: trích dẫn dài {len(a['q'].split())} từ")
            wrong_ids = [x for x in ids if x not in ans]
            for w in wrong_ids:
                if w not in a.get("w", {}):
                    err(f"{qid}: thiếu whyWrong cho {w}")
            texts = list(a["h"]) + [a["e"], a.get("n", "")] + list(a.get("w", {}).values())
            for t in texts:
                lint(qid, t)
            for opt in qd["options"]:
                if opt["id"] in ans:
                    for h in a["h"][:2]:
                        if opt["text"].lower() in h.lower():
                            err(f"{qid}: gợi ý cấp 1 hoặc 2 chứa nguyên văn đáp án")
            src = {"lesson": sec["lesson"], "part": sec["part"], "quote": a["q"]}
            if a.get("nr"):
                src["nearest"] = True
            out_qs.append(
                {
                    "id": qid,
                    "n": qd["n"],
                    "type": qd["type"],
                    "prompt": qd["prompt"],
                    "options": qd["options"],
                    "answer": ans,
                    "confidence": conf,
                    "hints": a["h"],
                    "explanation": a["e"],
                    "whyWrong": a.get("w", {}),
                    "source": src,
                    "keywords": a["k"],
                    "note": a.get("n", ""),
                }
            )
            opt_txt = " / ".join(
                f"{o['id']}. {o['text']}" for o in qd["options"] if o["id"] in ans
            )
            audit_rows.append((L, qd["n"], ans, opt_txt, conf, a["q"], a.get("n", ""), sec, qd["type"]))
        t = titles[str(L)]
        for b in t["summary"]:
            lint(f"summary{L}", b)
        if not 5 <= len(t["summary"]) <= 8:
            err(f"Bài {L}: tóm tắt cần 5 đến 8 ý")
        lessons.append({"id": L, "title": t["title"], "summary": t["summary"], "questions": out_qs})

    glossary = []
    for g in glossary_src:
        sec = locate(sections, g["q"], g["lesson"])
        if sec is None:
            err(f"Thuật ngữ '{g['term']}': không tìm thấy trích dẫn: {g['q']}")
            sec = {"lesson": g["lesson"], "part": "?"}
        for k in ("definition", "formula"):
            if g.get(k):
                lint("glossary " + g["term"], g[k])
        entry = {
            "term": g["term"],
            "aliases": g.get("aliases", []),
            "lesson": g["lesson"],
            "definition": g["definition"],
            "source": {"lesson": sec["lesson"], "part": sec["part"], "quote": g["q"]},
        }
        if g.get("formula"):
            entry["formula"] = g["formula"]
        glossary.append(entry)

    # keywords phải tìm thấy trong glossary hoặc transcriptChunks
    gl_norm = [norm(" ".join([g["term"]] + g["aliases"])) for g in glossary]
    ch_norm = [norm(c["t"]) for c in chunks]
    for les in lessons:
        for q in les["questions"]:
            for k in q["keywords"]:
                nk = norm(k)
                if not any(nk in x for x in gl_norm) and not any(nk in x for x in ch_norm):
                    err(f"{q['id']}: từ khóa '{k}' không có trong glossary hoặc transcript")

    data = {"lessons": lessons, "glossary": glossary, "transcriptChunks": chunks}

    # ---- audit
    lines = []
    total = sum(counts.values())
    lines.append("# Bảng đáp án và căn cứ, Quiz 06 đến Quiz 11, DOM204\n")
    lines.append(
        "Đáp án suy ra từ TRANSCRIPT (quiz không kèm đáp án). Mỗi dòng có trích dẫn nguyên văn ngắn từ bài giảng.\n"
    )
    lines.append("## Thống kê mức tin cậy\n")
    lines.append("| Mức | Số câu | Ý nghĩa |\n|---|---|---|")
    lines.append(f"| high | {counts['high']} | Transcript nói trực tiếp |")
    lines.append(f"| medium | {counts['medium']} | Suy ra hợp lý từ transcript, không nói thẳng |")
    lines.append(f"| low | {counts['low']} | Transcript không đề cập hoặc mâu thuẫn với đáp án hợp lý nhất |")
    lines.append(f"| Tổng | {total} | |\n")
    lines.append("Từng bài:\n")
    lines.append("| Quiz | high | medium | low |\n|---|---|---|---|")
    for les in lessons:
        c = {"high": 0, "medium": 0, "low": 0}
        for q in les["questions"]:
            c[q["confidence"]] += 1
        lines.append(f"| Quiz {les['id']:02d} | {c['high']} | {c['medium']} | {c['low']} |")
    lines.append("\n## Bảng chi tiết\n")
    lines.append("| Quiz | Câu | Đáp án | Tin cậy | Căn cứ (trích ngắn) | Note |")
    lines.append("|---|---|---|---|---|---|")

    def cell(s):
        return s.replace("|", "/").replace("\n", " ")

    for (L, n, ans, opt_txt, conf, quote, note, sec, typ) in audit_rows:
        short = opt_txt if len(opt_txt) <= 90 else opt_txt[:87] + "..."
        where = f"Bài {sec['lesson']}, {sec['part']}"
        lines.append(
            f"| {L:02d} | {n} | {cell(', '.join(ans))} ({cell(short)}) | {conf} | "
            f"\"{cell(quote)}\" ({where}) | {cell(note)} |"
        )
    audit = "\n".join(lines) + "\n"

    for e in errors:
        print("LỖI:", e)
    print(f"Câu: {total}  high={counts['high']} medium={counts['medium']} low={counts['low']}")
    print(f"Thuật ngữ: {len(glossary)}  Đoạn transcript: {len(chunks)}")
    if errors:
        print(f"{len(errors)} lỗi, dừng.")
        sys.exit(1)

    (ROOT / "answer-audit.md").write_text(audit, encoding="utf-8")
    tpl_path = SRC / "template.html"
    if tpl_path.exists():
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        payload = payload.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
        html = tpl_path.read_text(encoding="utf-8").replace("/*__DATA__*/null", payload)
        (ROOT / "dom204-quiz.html").write_text(html, encoding="utf-8")
        print("Đã ghi dom204-quiz.html", round(len(html) / 1024), "KB")
    print("Đã ghi answer-audit.md")


if __name__ == "__main__":
    main()
