/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        'field-green': 'var(--field-green)',
        success: 'var(--success)',
        light: 'var(--light)',
        dark: 'var(--dark)'
      },
      boxShadow: {
        'hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }
    }
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  }
}