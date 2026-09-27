/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          500: "#3a5fcd",
          600: "#2f4fb0",
          900: "#1b2a5e",
        },
      },
    },
  },
  plugins: [],
};
