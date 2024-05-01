/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2c1e3aff",
        secondary: "#00FF00"
      }
    },
  },
  plugins: [],
};
