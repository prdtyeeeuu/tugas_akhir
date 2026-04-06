/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFFFFF',
        secondary: '#ADCEFF',
        'secondary-light': '#C3ADFF',
      },
    },
  },
  plugins: [],
}
