import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Pretendard", "Noto Sans KR", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#0b0e16",
          900: "#10131c",
          850: "#141824",
          800: "#191d2a",
          700: "#252b3a",
          600: "#333b4f",
        },
        line: "#394153",
        signal: "#b3c5ff",
        mint: "#4edea3",
        amber: "#f6b756",
        coral: "#ff8f87",
      },
    },
  },
  plugins: [],
} satisfies Config;
