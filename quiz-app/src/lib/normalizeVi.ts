/** Chuẩn hóa tiếng Việt để so khớp: chữ thường, bỏ dấu, đ→d. Giữ nguyên độ dài chuỗi (NFC) để ánh xạ highlight. */
function normChar(c: string): string {
  const r = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
  return r.length === 1 ? r : r[0] ?? c;
}

export function normalizeVi(s: string): string {
  let out = "";
  for (const c of s.normalize("NFC")) out += normChar(c);
  return out;
}

export function tokenize(s: string): string[] {
  return normalizeVi(s).split(/[^a-z0-9]+/).filter(Boolean);
}
