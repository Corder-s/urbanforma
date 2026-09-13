/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Colours are RGB triplets from tokens.css so opacity modifiers keep
      // working (`bg-primary/10`) while themes re-declare the same tokens.
      // Light values are identical to the hex palette this app has always
      // shipped; `onBrand` is deliberately never themed (foreground on brand
      // fills must stay white in every theme).
      colors: {
        canvas: "rgb(var(--color-canvas-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface-rgb) / <alpha-value>)",
          2: "rgb(var(--color-surface-2-rgb) / <alpha-value>)",
        },
        // Key is dashed because 40+ existing class names are `text-on-brand` /
        // `bg-on-brand`. Tailwind does not kebab-case theme keys, so a camelCase
        // `onBrand` key silently generated nothing and every one of those
        // utilities was dead (primary buttons inherited their label colour).
        "on-brand": "rgb(var(--color-on-brand-rgb) / <alpha-value>)",
        scrim: "rgb(var(--color-scrim-rgb) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary-rgb) / <alpha-value>)",
          dark: "rgb(var(--color-primary-dark-rgb) / <alpha-value>)",
          light: "rgb(var(--color-primary-light-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent-rgb) / <alpha-value>)",
          light: "rgb(var(--color-accent-light-rgb) / <alpha-value>)",
        },
        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        muted: "rgb(var(--color-muted-rgb) / <alpha-value>)",
        faint: "rgb(var(--color-faint-rgb) / <alpha-value>)",
        success: "rgb(var(--color-success-rgb) / <alpha-value>)",
        danger: "rgb(var(--color-danger-rgb) / <alpha-value>)",
        warning: "rgb(var(--color-warning-rgb) / <alpha-value>)",
        line: {
          DEFAULT: "rgb(var(--color-border-rgb) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong-rgb) / <alpha-value>)",
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
      // Shadows reference the tokens so a theme can re-declare depth.
      boxShadow: {
        card: "var(--shadow-card)",
        soft: "var(--shadow-soft)",
        glow: "var(--shadow-glow)",
        float: "var(--shadow-float)",
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
