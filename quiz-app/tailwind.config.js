/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", surface2: "var(--surface2)",
        ink: "var(--ink)", mute: "var(--mute)", line: "var(--line)",
        brand: "var(--brand)", brandfg: "var(--brandfg)",
        ok: "var(--ok)", okbg: "var(--okbg)", bad: "var(--bad)", badbg: "var(--badbg)",
        hint: "var(--hint)", hintbg: "var(--hintbg)",
      },
      fontFamily: { sans: ['"Be Vietnam Pro"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
    },
  },
  plugins: [],
};
