#!/usr/bin/env node
/* Kiểm tra dom204-quiz.html theo checklist mục 8.
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node dom204/tools/check.cjs [--shots] */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'dom204-quiz.html');
const URL = 'file://' + FILE;
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = process.env.SHOT_DIR || path.resolve(__dirname, '..', '..', 'tmp-shots');
const results = [];
function ok(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail || '' });
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

async function newPage(browser, opts) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...(opts || {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**://fonts.gstatic.com/**', (r) => r.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch();
  const { ctx, page, errors } = await newPage(browser);
  await page.goto(URL);
  await page.waitForSelector('h1');

  /* ---- 1 đến 6: dữ liệu ---- */
  const D = await page.evaluate(() => JSON.parse(JSON.stringify(DATA)));
  const qs = D.lessons.flatMap((l) => l.questions);
  const ids = new Set(qs.map((q) => q.id));
  ok('Đủ 6 bài x 15 câu = 90 câu, id không trùng', D.lessons.length === 6 && D.lessons.every((l) => l.questions.length === 15) && qs.length === 90 && ids.size === 90, `${qs.length} câu, ${ids.size} id`);
  const ansOk = qs.every((q) => {
    const oids = q.options.map((o) => o.id);
    const inside = q.answer.every((a) => oids.includes(a));
    return inside && (q.type === 'single' ? q.answer.length === 1 : q.answer.length >= 1);
  });
  ok('Mọi answer thuộc options, single có 1 đáp án, multi có ít nhất 1', ansOk);
  ok('Mọi câu có đủ 3 gợi ý, explanation, source.quote', qs.every((q) => q.hints.length === 3 && q.hints.every(Boolean) && q.explanation && q.source && q.source.quote));
  ok('Câu confidence khác high đều có note', qs.every((q) => q.confidence === 'high' || (q.note && q.note.length > 10)));
  const bad = [];
  (function walk(o, p) {
    if (typeof o === 'string') { if (/[;—]/.test(o)) bad.push(p + ': ' + o.slice(0, 40)); }
    else if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '[' + i + ']'));
    else if (o && typeof o === 'object') Object.keys(o).forEach((k) => walk(o[k], p + '.' + k));
  })(D, 'DATA');
  ok('Không chuỗi nội dung nào chứa ; hoặc —', bad.length === 0, bad.slice(0, 3).join(' | '));
  const gl = D.glossary.map((g) => norm([g.term].concat(g.aliases).join(' ')));
  const ch = D.transcriptChunks.map((c) => norm(c.t));
  const missing = [];
  qs.forEach((q) => q.keywords.forEach((k) => { const n = norm(k); if (!gl.some((x) => x.includes(n)) && !ch.some((x) => x.includes(n))) missing.push(q.id + ':' + k); }));
  ok('Mọi keyword tìm thấy trong glossary hoặc transcriptChunks', missing.length === 0, missing.slice(0, 5).join(', '));
  ok('Thuật ngữ và đoạn bài giảng có dữ liệu', D.glossary.length >= 90 && D.transcriptChunks.length > 500, `${D.glossary.length} thuật ngữ, ${D.transcriptChunks.length} đoạn`);

  /* ---- 7: tìm kiếm không phân biệt dấu và hoa thường ---- */
  async function searchCounts(text) {
    await page.fill('#sq', text);
    await page.waitForTimeout(350);
    return page.$$eval('#results .grp h3 .tag', (els) => els.map((e) => e.textContent.trim()).join(','));
  }
  await page.keyboard.press('/');
  await page.waitForSelector('#panel.open');
  const a = await searchCounts('toi uu');
  const b = await searchCounts('TỐI ƯU');
  const c = await searchCounts('tối ưu');
  ok('Tìm "toi uu" và "TỐI ƯU" cho cùng kết quả', a === b && b === c && a !== '0,0,0', `${a} | ${b} | ${c}`);
  await searchCounts('toi uu gmv');
  const hasTerm = await page.$$eval('#results .res b', (els) => els.some((e) => /tối ưu GMV/i.test(e.textContent)));
  ok('Gõ "toi uu gmv" ra thuật ngữ có "tối ưu GMV"', hasTerm);
  const grpTitles = await page.$$eval('#results .grp h3', (els) => els.map((e) => e.textContent.replace(/\d+/g, '').trim()));
  ok('Kết quả chia 3 nhóm: Thuật ngữ, Đoạn bài giảng, Câu hỏi liên quan', grpTitles.join('|') === 'Thuật ngữ|Đoạn bài giảng|Câu hỏi liên quan', grpTitles.join('|'));
  await searchCounts('đ');
  const dd = await searchCounts('dau tu');
  ok('Đ được xử lý như d (gõ "dau tu" có kết quả)', dd.split(',').some((x) => +x > 0), dd);
  // lọc theo bài
  await searchCounts('gmv');
  const before = await page.$$eval('#results .grp h3 .tag', (e) => e.map((x) => +x.textContent).join(','));
  await page.click('[data-act=lchip][data-l="10"]');
  await page.waitForTimeout(350);
  const after = await page.$$eval('#results .grp h3 .tag', (e) => e.map((x) => +x.textContent).join(','));
  ok('Lọc theo bài làm giảm kết quả', before !== after, `${before} -> ${after}`);
  await page.click('[data-act=lchip][data-l="10"]');
  // câu hỏi chưa làm không lộ đáp án
  await searchCounts('seeding');
  const leak = await page.$$eval('#results .grp:nth-of-type(3) .res', (els) => els.some((e) => /Đáp án:/.test(e.textContent)));
  ok('Câu hỏi chưa làm không hiện đáp án trong tra cứu', !leak);
  await searchCounts('a');
  const moreBtn = await page.$('[data-act=more]');
  ok('Có nút Xem thêm khi trên 10 kết quả', !!moreBtn);
  if (moreBtn) { const n1 = await page.$$eval('#results .res', (e) => e.length); await moreBtn.click(); const n2 = await page.$$eval('#results .res', (e) => e.length); ok('Xem thêm hiện thêm kết quả', n2 > n1, `${n1} -> ${n2}`); }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('Esc đóng panel tra cứu', !(await page.$eval('#panel', (e) => e.classList.contains('open'))));
  await page.keyboard.press('Control+k');
  ok('Ctrl+K mở panel tra cứu', await page.$eval('#panel', (e) => e.classList.contains('open')));
  await page.keyboard.press('Escape');

  /* ---- luồng ôn tập ---- */
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('[data-act=start][data-l="6"]');
  await page.waitForSelector('.prompt');
  const p1 = await page.$eval('.prompt', (e) => e.textContent);
  ok('Câu 1 Bài 6 hiện đúng đề', p1.includes('IN HOA'));
  ok('Hiện badge 1 đáp án và Cần kiểm chứng', (await page.$$eval('.qmeta .badge', (e) => e.map((x) => x.textContent).join('|'))).includes('Cần kiểm chứng'));
  // gợi ý lần lượt
  await page.click('[data-act=hint]');
  await page.click('[data-act=hint]');
  ok('Gợi ý mở từng cấp (2 cấp sau 2 lần bấm)', (await page.$$('.hints li')).length === 2);
  // chọn sai
  const wrongIdx = await page.evaluate(() => { const q = DATA.lessons[0].questions[0]; return q.options.findIndex((o) => !q.answer.includes(o.id)); });
  await page.click(`.opt >> nth=${wrongIdx}`);
  ok('Chọn sai: banner sai, tô đỏ và xanh', (await page.$('.banner.bad')) && (await page.$('.opt.bad')) && (await page.$('.opt.ok')));
  ok('Hiện giải thích, trích dẫn, chip từ khóa, note', (await page.$('.quote')) && (await page.$$('.chip[data-act=kw]')).length >= 2 && (await page.$('.note')));
  const qlabel = await page.$eval('.quote small', (e) => e.textContent);
  ok('Nhãn trích dẫn "Theo bài giảng Bài X, Phần Y"', /^Theo bài giảng Bài 6, Phần \d/.test(qlabel), qlabel);
  ok('Câu sai tự vào danh sách sai', await page.evaluate(() => !!JSON.parse(localStorage.getItem('dom204_progress_v1')).wrong['q6-1']));
  // chip từ khóa mở tra cứu mà không mất trạng thái
  await page.click('.chip[data-act=kw] >> nth=0');
  await page.waitForSelector('#panel.open');
  ok('Chip từ khóa mở tra cứu với từ khóa', (await page.inputValue('#sq')).length > 0);
  await page.keyboard.press('Escape');
  ok('Đóng tra cứu vẫn giữ trạng thái câu đang làm', (await page.$('.banner.bad')) !== null);
  // chuyển câu bằng bàn phím, chọn bằng phím
  await page.keyboard.press('ArrowRight');
  const p2 = await page.$eval('.prompt', (e) => e.textContent);
  ok('Mũi tên phải sang câu 2', p2.includes('hashtag'));
  await page.keyboard.press('h');
  ok('Phím H mở gợi ý', (await page.$$('.hints li')).length === 1);
  await page.keyboard.press('4');
  ok('Phím 4 chọn phương án thứ 4 và chấm ngay', (await page.$('.banner')) !== null);
  // tiến độ
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('dom204_progress_v1')));
  ok('Lưu tiến độ vào localStorage key dom204_progress_v1', stats && stats.v === 1 && Object.keys(stats.q).length >= 2 && stats.wrong['q6-1']);
  await page.reload();
  await page.waitForSelector('.prompt');
  ok('Tải lại vẫn giữ tiến độ (chuyển tới câu chưa làm)', (await page.$$('.num.ok, .num.bad')).length >= 2);
  // câu nhiều đáp án: bài 8 câu 4
  await page.goto(URL + '#/');
  await page.click('[data-act=start][data-l="8"]');
  await page.waitForSelector('.prompt');
  await page.click('.num >> nth=3');
  ok('Câu nhiều đáp án có nút Kiểm tra bị khóa khi chưa chọn', await page.$eval('[data-act=check]', (e) => e.disabled));
  ok('Badge Nhiều đáp án', (await page.$$eval('.qmeta .badge', (e) => e.map((x) => x.textContent).join('|'))).includes('Nhiều đáp án'));
  await page.click('.opt >> nth=0');
  await page.click('.opt >> nth=1');
  await page.keyboard.press('Tab'); // không chấm ngay
  ok('Multi: chọn chưa chấm', (await page.$('.banner')) === null);
  await page.click('[data-act=check]');
  ok('Multi: kiểm tra chấm đúng khi chọn 2 trong 4', (await page.$('.banner.bad')) !== null && (await page.$$('.opt.missed')).length === 2);
  // kết quả
  await page.click('.num >> nth=14');
  await page.click('[data-act=results]');
  ok('Màn kết quả hiện điểm x/15 và câu sai', (await page.$('.score')) && (await page.$$('.rl li')).length >= 1);
  // ôn câu sai: làm đúng 2 lần liên tiếp thì rời danh sách
  await page.goto(URL + '#/');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dom204_progress_v1')); s.wrong = { 'q6-1': { streak: 0 } }; localStorage.setItem('dom204_progress_v1', JSON.stringify(s)); });
  await page.reload();
  ok('Nút Ôn câu sai hiện số lượng', (await page.$eval('[data-act=wrongpage]', (e) => e.textContent)).includes('(1)'));
  for (let round = 0; round < 2; round++) {
    await page.click('[data-act=wrongpage]');
    await page.click('[data-act=startwrong]');
    await page.waitForSelector('.prompt');
    const ci = await page.evaluate(() => { const q = DATA.lessons[0].questions[0]; return q.options.findIndex((o) => q.answer.includes(o.id)); });
    await page.click(`.opt >> nth=${ci}`);
    ok(`Ôn câu sai lần ${round + 1}: chấm đúng`, (await page.$('.banner.ok')) !== null);
    await page.goto(URL + '#/');
    await page.reload();
  }
  ok('Đúng 2 lần liên tiếp thì rời danh sách sai', (await page.$eval('[data-act=wrongpage]', (e) => e.textContent)).includes('(0)'));
  // xáo trộn phương án vẫn chấm đúng
  await page.check('[data-set=shuffleO]');
  await page.click('[data-act=start][data-l="7"]');
  await page.waitForSelector('.prompt');
  await page.click('.num >> nth=0');
  const correctText = await page.evaluate(() => { const q = DATA.lessons[1].questions[0]; return q.options.find((o) => q.answer.includes(o.id)).text; });
  await page.click(`.opt:has(.txt:text-is("${correctText}"))`);
  ok('Xáo trộn phương án: nhãn đánh lại nhưng chấm đúng theo id gốc', (await page.$('.banner.ok')) !== null);
  const labels = await page.$$eval('.opt .lab', (e) => e.map((x) => x.textContent).join(''));
  ok('Nhãn A B C D được đánh lại theo thứ tự hiển thị', labels === 'ABCD');
  // tóm tắt
  await page.goto(URL + '#/summary/8');
  await page.waitForSelector('.formula');
  ok('Trang tóm tắt có ý chính, thuật ngữ và khối công thức', (await page.$$('.bul li')).length >= 5 && (await page.$$('.term')).length >= 10 && (await page.$$('.formula')).length >= 3);
  // đặt lại tiến độ có hộp xác nhận
  await page.goto(URL + '#/');
  await page.click('[data-act=resetall]');
  ok('Đặt lại tiến độ có hộp xác nhận', await page.$eval('#modal', (e) => e.classList.contains('show')));
  await page.click('#mYes');
  const after2 = await page.evaluate(() => JSON.parse(localStorage.getItem('dom204_progress_v1')));
  ok('Sau xác nhận tiến độ được xóa', Object.keys(after2.q).length === 0);
  // chủ đề
  await page.click('#themeBtn');
  const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok('Nút chuyển giao diện sáng tối hoạt động', th === 'dark' || th === 'light', th);
  ok('Không có lỗi console trong luồng thường', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();

  /* ---- localStorage bị chặn ---- */
  const blocked = await newPage(browser);
  await blocked.page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await blocked.page.goto(URL);
  await blocked.page.waitForSelector('h1');
  await blocked.page.click('[data-act=start][data-l="9"]');
  await blocked.page.waitForSelector('.prompt');
  await blocked.page.click('.opt >> nth=0');
  const okBlocked = (await blocked.page.$('.banner')) !== null;
  await blocked.page.goto(URL + '#/');
  const notice = await blocked.page.$('.notice');
  ok('Chặn localStorage: app vẫn chạy và báo thông tin', okBlocked && !!notice && blocked.errors.length === 0, blocked.errors.slice(0, 2).join(' | '));
  await blocked.ctx.close();

  /* ---- bố cục ---- */
  const layoutFails = [];
  for (const w of [360, 768, 1280]) {
    const L = await newPage(browser, { viewport: { width: w, height: 800 } });
    const pg = L.page;
    await pg.goto(URL);
    await pg.waitForSelector('h1');
    const check = async (label) => {
      const r = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
      if (r.sw > r.cw || r.bw > r.cw) layoutFails.push(`${w}px ${label}: scrollWidth ${r.sw} > ${r.cw}`);
      const tiny = await pg.evaluate(() => Array.from(document.querySelectorAll('button:not([disabled]), input[type=checkbox]')).filter((b) => { const t = b.closest('label') || b; const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5) && !b.closest('.panel:not(.open)'); }).map((b) => (b.textContent || b.getAttribute('data-set') || '').trim().slice(0, 20)));
      if (tiny.length) layoutFails.push(`${w}px ${label}: vùng bấm nhỏ ${tiny.slice(0, 4).join(',')}`);
    };
    if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });
    const shot = async (n) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOT_DIR, `${n}-${w}.png`), fullPage: false }); };
    await check('home'); await shot('home');
    await pg.click('[data-act=start][data-l="8"]'); await pg.waitForSelector('.prompt');
    await check('practice');
    await pg.click('[data-act=hint]');
    await pg.click('.opt >> nth=0');
    await check('practice-feedback'); await shot('practice');
    await pg.click('.num >> nth=3'); await pg.click('.opt >> nth=0'); await pg.click('[data-act=check]');
    await check('multi-feedback');
    await pg.click('.num >> nth=14'); await pg.click('[data-act=results]');
    await check('results');
    await pg.goto(URL + '#/summary/11'); await pg.waitForSelector('.formula, .term');
    await check('summary'); await shot('summary');
    await pg.goto(URL + '#/wrong'); await pg.waitForSelector('.card');
    await check('wrong');
    await pg.goto(URL + '#/'); await pg.click('[data-act=search]'); await pg.waitForSelector('#panel.open');
    await pg.fill('#sq', 'toi uu gmv'); await pg.waitForTimeout(350);
    await check('search'); await shot('search');
    L.errors.length && layoutFails.push(`${w}px lỗi console: ${L.errors[0]}`);
    await L.ctx.close();
  }
  ok('Hiển thị đúng ở 360px, 768px, 1280px, không cuộn ngang, vùng bấm đủ 44px', layoutFails.length === 0, layoutFails.slice(0, 4).join(' | '));

  /* ---- dark mode theo hệ thống ---- */
  const dk = await newPage(browser, { colorScheme: 'dark' });
  await dk.page.goto(URL);
  const bg = await dk.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok('Dark mode theo prefers-color-scheme', bg === 'rgb(16, 20, 29)', bg);
  await dk.ctx.close();

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length}/${results.length} mục đạt`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
