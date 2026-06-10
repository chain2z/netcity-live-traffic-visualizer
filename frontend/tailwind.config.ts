import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "rgba(8, 13, 18, 0.86)",
        line: "rgba(148, 163, 184, 0.22)",
      },
    },
  },
  plugins: [],
} satisfies Config;
