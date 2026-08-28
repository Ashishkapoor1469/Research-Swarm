/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', '-apple-system', 'sans-serif'],
      },
      colors: {
        claudeBg: '#141312',
        claudeSidebar: '#181715',
        claudeCard: '#22201d',
        claudeInput: '#272522',
        claudeBorder: '#33302b',
        claudeAccent: '#d97745',
        claudeHover: '#33302c',
        claudeText: '#f0ece1',
        claudeMuted: '#a39e93',
      },
    },
  },
  plugins: [],
};
