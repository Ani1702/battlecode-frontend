/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        oxanium: ["Oxanium", "sans-serif"],
      },
      backgroundImage: {
        "hero-pattern": "url('/Landingpage.svg')",
        "top-bar": "url('/TopBar.svg')",
        "left-line": "url('/LeftLine.svg')",
        "right-line": "url('/RightLine.svg')",
        "bg-main": "url('/bg.svg')",
        "bg-waiting": "url('/bg-waiting.svg')",
        mask: "url('/mask.svg')",
      },
    },
  },
  safelist: [
    {
      pattern:
        /bg-(hero-pattern|top-bar|left-line|right-line|bg-main|bg-waiting|mask)/,
    },
  ],
  plugins: [],
};
