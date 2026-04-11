/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cream: "#F5F5F0",
        canvas: "#1f1f1b",
        surface: "#FFFFFF",
        ink: "#1A1A18",
        terracotta: {
          DEFAULT: "#AE5630",
          hover: "#C4683F",
        },
        dark: {
          bg: "#1f1f1b",
          surface: "#26261f",
          text: "#ededea",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 0.25rem 1.25rem rgba(0,0,0,0.035)",
        "soft-dark": "0 0.25rem 1.25rem rgba(0,0,0,0.15)",
      },
      borderColor: {
        DEFAULT: "rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
