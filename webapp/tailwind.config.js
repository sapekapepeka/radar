/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        radar: {
          "primary": "#e4d9ff",
          "secondary": "#9f86e0",
          "green": "#34d399",
          "red": "#f43f5e",
          "panel": "#150f26"
        }
      },
    },
  },
  plugins: [],
}

