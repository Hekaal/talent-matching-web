/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Warna brand PRD — dipakai untuk grafik, fill, dan aksen non-teks
        navy: "#1E2761",
        teal: "#00A896",
        ice: "#EEF3FE",
        light: "#F7F9FC",
        coral: "#F96167",
        amber: "#F2A007",
        muted: "#5A6178",

        // ── Turunan aksesibel — dipakai saat warna membawa teks (WCAG AA)
        "navy-deep": "#161D4A", // permukaan gelap (header, hero)
        "navy-mist": "#9AA0BC", // teks sekunder di atas navy — 6.2:1
        "teal-700": "#00796B", // fill tombol + teks putih — 5.3:1
        "teal-ink": "#00695C", // teks/ikon teal di permukaan terang — 6.6:1
        "amber-ink": "#8F5B00", // teks amber di permukaan terang — 5.7:1
        "coral-ink": "#B3283A", // teks coral di permukaan terang — 6.4:1

        line: "#DFE5F0", // hairline border
        "line-strong": "#C8D2E4", // border yang perlu lebih tegas
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Skala tipografi tetap — hindari nilai arbitrer yang tersebar
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }], // 11px
        xs: ["0.75rem", { lineHeight: "1.125rem" }], // 12px
        sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        base: ["0.9375rem", { lineHeight: "1.5rem" }], // 15px
        lg: ["1.0625rem", { lineHeight: "1.625rem" }], // 17px
        xl: ["1.375rem", { lineHeight: "1.875rem" }], // 22px
        "2xl": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.01em" }], // 28px
        "3xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }], // 36px
        "4xl": ["2.875rem", { lineHeight: "3.125rem", letterSpacing: "-0.025em" }], // 46px
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        raise: "0 8px 24px -12px rgba(22, 29, 74, 0.35)",
        panel: "0 1px 2px rgba(22, 29, 74, 0.04)",
      },
    },
  },
  plugins: [],
};
