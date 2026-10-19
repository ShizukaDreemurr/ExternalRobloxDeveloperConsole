# Ôn tập DOM204 (Quiz 06 đến Quiz 11)

- `dom204-quiz.html`: ứng dụng ôn tập, một file duy nhất, mở trực tiếp bằng trình duyệt.
- `answer-audit.md`: bảng 90 đáp án, mức tin cậy, trích dẫn căn cứ và ghi chú.
- `src/`: nguồn dữ liệu (`QUIZ.md`, `TRANSCRIPT.txt`, `answers/`, `glossary.json`, `summaries.json`) và `template.html`.
- `tools/build.py`: dựng lại `dom204-quiz.html` và `answer-audit.md`. Script kiểm tra mọi trích dẫn có thật trong transcript.
- `tools/check.cjs`: kiểm tra checklist bằng Playwright.

```
python3 -I dom204/tools/build.py
NODE_PATH=/opt/node22/lib/node_modules node dom204/tools/check.cjs
```
