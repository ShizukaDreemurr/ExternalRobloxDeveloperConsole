import { describe, it, expect, vi } from "vitest";
import { normalizeVi } from "./normalizeVi";
import { gradeAnswer, toTen } from "./scoring";
import { searchKnowledge, highlightParts } from "./search";

describe("normalizeVi", () => {
  it("bỏ dấu, đ→d, chữ thường, giữ độ dài", () => {
    expect(normalizeVi("Số Dư Đảm Phí")).toBe("so du dam phi");
    expect(normalizeVi("Hiệu ứng ROI DA")).toBe("hieu ung roi da");
    const s = "Quản trị chuỗi cung ứng đúng lúc";
    expect(normalizeVi(s).length).toBe(s.normalize("NFC").length);
  });
});

describe("gradeAnswer", () => {
  const q = { answer: ["B", "C", "D"] as ("A" | "B" | "C" | "D")[] };
  it("multi: đủ và không thừa mới đúng", () => {
    expect(gradeAnswer(q, ["D", "B", "C"])).toBe("correct");
    expect(gradeAnswer(q, ["B", "C"])).toBe("partial");
    expect(gradeAnswer(q, ["A", "B", "C", "D"])).toBe("wrong");
    expect(gradeAnswer(q, ["A"])).toBe("wrong");
    expect(gradeAnswer(q, [])).toBe("blank");
  });
  it("single", () => {
    expect(gradeAnswer({ answer: ["A"] }, ["A"])).toBe("correct");
    expect(gradeAnswer({ answer: ["A"] }, ["B"])).toBe("wrong");
  });
  it("điểm /10", () => { expect(toTen(12, 15)).toBe(8); expect(toTen(0, 0)).toBe(0); });
});

describe("searchKnowledge", () => {
  it("tìm không dấu: so du dam phi → thẻ SDĐP", () => {
    expect(searchKnowledge("so du dam phi")[0].card.id).toBe("b08-sddp");
  });
  it("roi da → bullwhip", () => {
    expect(searchKnowledge("roi da")[0].card.id).toBe("b09-tich-hop-bullwhip");
  });
  it("kpi dan dat → KPI kết quả/dẫn dắt", () => {
    expect(searchKnowledge("kpi dan dat")[0].card.id).toBe("b11-kpi-tinh-chat");
  });
  it("viết tắt & sai chính tả nhẹ", () => {
    expect(searchKnowledge("sddp")[0].card.id).toBe("b08-sddp");
    expect(searchKnowledge("hoa von").some((h) => h.card.id === "b08-hoa-von")).toBe(true);
    expect(searchKnowledge("herzbeg").some((h) => h.card.id === "b06-herzberg")).toBe(true);
  });
  it("lọc theo bài", () => {
    expect(searchKnowledge("chi phi", 8).every((h) => h.card.lesson === 8)).toBe(true);
  });
  it("truy vấn quá ngắn trả rỗng", () => { expect(searchKnowledge("a")).toEqual([]); });
  it("highlight không dấu", () => {
    const parts = highlightParts("Số dư đảm phí là R − VC", "so du dam phi");
    expect(parts.find((p) => p.hit)?.text).toBe("Số dư đảm phí");
  });
});

describe("storage lỗi không crash", () => {
  it("localStorage ném lỗi vẫn chạy bằng bộ nhớ đệm", async () => {
    const bad = {
      getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); },
    };
    vi.stubGlobal("localStorage", bad);
    const s = await import("./storage");
    expect(() => s.saveJSON("k", { a: 1 })).not.toThrow();
    expect(s.loadJSON("k", { a: 0 })).toEqual({ a: 1 });
    expect(s.loadJSON("missing", 5)).toBe(5);
    vi.unstubAllGlobals();
  });
  it("không có localStorage", async () => {
    vi.stubGlobal("localStorage", undefined);
    const s = await import("./storage");
    expect(() => s.safeSet("x", "1")).not.toThrow();
    expect(s.safeGet("x")).toBe("1");
    vi.unstubAllGlobals();
  });
});

describe("chất lượng kết quả tìm kiếm", () => {
  it("không trả thẻ mờ nhạt cho truy vấn rõ ràng", () => {
    const ids = searchKnowledge("so du dam phi").map((h) => h.card.id);
    expect(ids[0]).toBe("b08-sddp");
    expect(ids).not.toContain("b06-thue-ngoai");
  });
  it("các từ khóa quan trọng đều ra thẻ đúng đầu tiên", () => {
    const cases: [string, string][] = [
      ["maslow", "b06-maslow"], ["covey", "b10-ma-tran-covey"], ["jit", "b10-tinh-gon-lean"], ["slack", "b10-slack"],
      ["tuyen 1", "b11-ba-tuyen"], ["ebit", "b08-don-bay"], ["thanh toan nhanh", "b08-thanh-khoan"], ["bctc", "b07-4-bctc"],
      ["dinh phi", "b08-dinh-phi-bien-phi"], ["ma tran rui ro", "b11-ma-tran-rui-ro"],
    ];
    for (const [q, id] of cases) expect(searchKnowledge(q).map((h) => h.card.id), q).toContain(id);
  });
});
