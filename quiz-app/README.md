# Ôn Quiz 06 → 11 · BUS1052 Nhập môn Quản trị kinh doanh

Web app ôn tập tự chứa (React + TypeScript + Tailwind, build ra **một file** `dist/index.html`, chạy offline).

- 90 câu (6 quiz × 15), nhãn “1 đáp án / Nhiều đáp án”, chấm đúng khi chọn đủ & không thừa (có “đúng một phần”).
- **Gợi ý 3 bậc**, **Học từng bước** (5 bước, có máy tính nhanh), **tra cứu không dấu** luôn hiện ngay khi làm bài.
- Chế độ: Luyện tập · Thi thử (15 phút/15 câu, khóa gợi ý & tutor) · Ôn câu sai · Flashcard · Trộn tất cả.
- 76 thẻ kiến thức có nguồn `Bài X · Phần Y`, lấy từ bài giảng (chuẩn hóa lỗi chép tự động).

## Lệnh

```bash
npm install
npm run dev        # chạy dev
npm test           # Vitest: normalizeVi, chấm multi, tìm kiếm, storage lỗi
npm run validate   # kiểm tra toàn vẹn dữ liệu (90 câu, đáp án, liên kết thẻ, gợi ý không lộ đáp án…)
npm run build      # validate + tsc + vite build → dist/index.html
npm run parse-quiz # (tuỳ chọn) sinh lại src/data/questions.base.json từ sources/quiz_6_11.md
```

## Cấu trúc

`src/data` (câu hỏi `m06…m11` + `questions.base.json`, thẻ kiến thức `k06…k11`, `glossary.ts`) · `src/lib` (normalizeVi, search, scoring, storage, progress, session) · `src/components` · `scripts/validate-data.ts` · `ANSWER_AUDIT.md`.

Phím tắt khi làm bài: `A–D` chọn · `Enter` kiểm tra/qua câu · `H` gợi ý · `T` học từng bước · `/` tra cứu · `←/→` chuyển câu.

> `sources/transcript.txt` (bài giảng) không được commit; đặt lại file đó vào `sources/` nếu muốn đối chiếu thêm.
