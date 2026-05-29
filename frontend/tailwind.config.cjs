/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090a0f",
        card: "#11131c",
        cardLight: "#181b28",
        borderDark: "rgba(255, 255, 255, 0.06)",
        borderLight: "rgba(255, 255, 255, 0.12)",
        emeraldAccent: "#10b981",
        violetAccent: "#8b5cf6",
        indigoAccent: "#6366f1",
        textMain: "#f3f4f6",
        textMuted: "#9ca3af",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      boxShadow: {
        neonEmerald: "0 0 15px rgba(16, 185, 129, 0.25)",
        neonViolet: "0 0 15px rgba(139, 92, 246, 0.25)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      }
    },
  },
  plugins: [],
}
