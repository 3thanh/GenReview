/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        approve: "#22c55e",
        reject: "#ef4444",
        variant: "#a855f7",
        ideas: "#3b82f6",
        star: "#f59e0b",
      },
      animation: {
        "slide-up": "slideUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fadeIn 200ms ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
