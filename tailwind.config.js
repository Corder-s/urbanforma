/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F9FF",
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#EEF4FF",
        },
        primary: {
          DEFAULT: "#2563EB",
          dark: "#1D4ED8",
          light: "#3B82F6",
        },
        accent: {
          DEFAULT: "#06B6D4",
          light: "#67E8F9",
        },
        ink: "#0F172A",
        muted: "#64748B",
        faint: "#94A3B8",
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#D97706",
        line: {
          DEFAULT: "#DCE6F2",
          strong: "#C4D4EA",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        card: "0 24px 60px -28px rgba(37, 99, 235, 0.35)",
        soft: "0 12px 32px -18px rgba(15, 76, 149, 0.30)",
        glow: "0 10px 30px -12px rgba(37, 99, 235, 0.55)",
        float: "0 18px 40px -18px rgba(15, 76, 149, 0.45)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(26px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "floaty-soft": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        drift: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(46px)" },
        },
        "drift-slow": {
          "0%": { transform: "translateX(-30px)" },
          "100%": { transform: "translateX(30px)" },
        },
        pop: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.9)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.8s ease both",
        "rise-in": "rise-in 0.7s cubic-bezier(0.22,0.7,0.2,1) both",
        "card-in": "card-in 0.6s cubic-bezier(0.22,0.7,0.2,1) both",
        floaty: "floaty 6s ease-in-out infinite",
        "floaty-soft": "floaty-soft 5s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite alternate",
        "drift-slow": "drift-slow 22s ease-in-out infinite alternate",
        pop: "pop 0.4s ease both",
      },
    },
  },
  plugins: [],
};
