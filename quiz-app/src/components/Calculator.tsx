import { useState } from "react";
import type { CalcId } from "../types";

interface Def {
  title: string;
  fields: { k: string; label: string; def: number }[];
  out: (v: Record<string, number>) => { label: string; value: string }[];
}
const n = (x: number, d = 0) => (Number.isFinite(x) ? x.toLocaleString("vi-VN", { maximumFractionDigits: d }) : "—");

const sddp: Def = {
  title: "Số dư đảm phí & hòa vốn",
  fields: [
    { k: "P", label: "Giá bán / SP (đ)", def: 7000 }, { k: "Q", label: "Sản lượng bán", def: 13000 },
    { k: "v", label: "Biến phí / SP (đ)", def: 4000 }, { k: "FC", label: "Định phí (đ)", def: 100_000_000 },
  ],
  out: ({ P, Q, v, FC }) => [
    { label: "R = P × Q", value: n(P * Q) }, { label: "VC = v × Q", value: n(v * Q) },
    { label: "SDĐP = R − VC", value: n(P * Q - v * Q) },
    { label: "SDĐP so với định phí", value: P * Q - v * Q > FC ? "SDĐP > FC → LÃI" : P * Q - v * Q < FC ? "SDĐP < FC → LỖ" : "SDĐP = FC → HÒA VỐN" },
    { label: "Hòa vốn Q = FC / (P − v)", value: P > v ? n(FC / (P - v), 0) + " SP" : "—" },
  ],
};
const DEFS: Record<CalcId, Def> = {
  sddp, hoavon: sddp,
  tyleno: { title: "Tỷ lệ nợ", fields: [{ k: "no", label: "Tổng nợ phải trả", def: 21800 }, { k: "ts", label: "Tổng tài sản", def: 64900 }],
    out: ({ no, ts }) => [{ label: "Tỷ lệ nợ = Nợ / Tài sản", value: n((no / ts) * 100, 2) + " %" }] },
  nhanh: { title: "Thanh toán nhanh", fields: [{ k: "tsnh", label: "Tài sản ngắn hạn", def: 1500 }, { k: "htk", label: "Hàng tồn kho", def: 600 }, { k: "nnh", label: "Nợ ngắn hạn", def: 1200 }],
    out: ({ tsnh, htk, nnh }) => [{ label: "(TSNH − HTK) / Nợ NH", value: n((tsnh - htk) / nnh, 2) + " lần" }] },
  trailai: { title: "Khả năng thanh toán lãi vay", fields: [{ k: "ebit", label: "EBIT", def: 500 }, { k: "lv", label: "Chi phí lãi vay", def: 100 }],
    out: ({ ebit, lv }) => [{ label: "EBIT / Lãi vay", value: n(ebit / lv, 2) + " lần" }, { label: "Nếu EBIT tăng 20%, lãi vay giữ nguyên", value: n((ebit * 1.2) / lv, 2) + " lần (tăng)" }] },
  vcsh: { title: "Vốn chủ sở hữu", fields: [{ k: "ts", label: "Tổng tài sản", def: 1000 }, { k: "no", label: "Tổng nợ phải trả", def: 600 }],
    out: ({ ts, no }) => [{ label: "VCSH = Tài sản − Nợ", value: n(ts - no) }] },
  dtthuan: { title: "Doanh thu thuần", fields: [{ k: "dt", label: "Doanh thu", def: 200 }, { k: "gg", label: "Giảm giá + chiết khấu", def: 10 }, { k: "tl", label: "Hàng bán bị trả lại", def: 5 }, { k: "th", label: "Thuế TTĐB/XK", def: 15 }],
    out: ({ dt, gg, tl, th }) => [{ label: "Doanh thu thuần = DT − giảm trừ", value: n(dt - gg - tl - th) + " (triệu)" }] },
  lngop: { title: "Lợi nhuận gộp", fields: [{ k: "dtt", label: "Doanh thu thuần", def: 1200 }, { k: "gv", label: "Giá vốn hàng bán", def: 900 }],
    out: ({ dtt, gv }) => [{ label: "LN gộp = DT thuần − Giá vốn", value: n(dtt - gv) }, { label: "Biên LN gộp", value: n(((dtt - gv) / dtt) * 100, 1) + " %" }] },
  thue: { title: "Thuế TNDN", fields: [{ k: "ln", label: "LN kế toán trước thuế", def: 500 }, { k: "ts", label: "Thuế suất (%)", def: 20 }],
    out: ({ ln, ts }) => [{ label: "Thuế = LN trước thuế × thuế suất", value: n((ln * ts) / 100) }, { label: "LN sau thuế", value: n(ln - (ln * ts) / 100) }] },
};

export default function Calculator({ id }: { id: CalcId }) {
  const def = DEFS[id];
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(def.fields.map((f) => [f.k, f.def])));
  const out = def.out(vals);
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 text-sm font-bold">🧮 Máy tính nhanh: {def.title}</div>
      <p className="mb-2 text-xs text-mute">Số liệu mẫu lấy từ ví dụ trong bài giảng — bạn có thể sửa để thử.</p>
      <div className="grid grid-cols-2 gap-2">
        {def.fields.map((f) => (
          <label key={f.k} className="text-xs text-mute">
            {f.label}
            <input type="number" inputMode="decimal" value={Number.isFinite(vals[f.k]) ? vals[f.k] : ""}
              onChange={(e) => setVals({ ...vals, [f.k]: e.target.value === "" ? NaN : Number(e.target.value) })}
              className="mt-0.5 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink" />
          </label>
        ))}
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        {out.map((o) => <div key={o.label} className="flex justify-between gap-2 rounded-lg bg-surface2 px-2.5 py-1.5"><dt className="text-mute">{o.label}</dt><dd className="font-bold">{o.value}</dd></div>)}
      </dl>
    </div>
  );
}
