import type {Config} from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
        {
            "sukura": {
                "primary": "#A2A2A2",  // Sukura-2 | Soft gray for highlights
                "secondary": "#808080", // Sukura-4 | Mid-gray for contrast
                "accent": "#5E5E5E",    // Sukura-5 | Dark gray for slight contrast
                "neutral": "#3C3C3C",   // Sukura-6 | Very dark gray for neutral elements
                "base-100": "#000000",  // Sukura-3 | **Black background**
                "base-200": "#3C3C3C",  // Slightly lighter dark background elements
                "base-300": "#5E5E5E",  // Borders, card backgrounds
                "info": "#A2A2A2",      // Light gray for information elements
                "success": "#808080",   // Slightly lighter gray
                "warning": "#5E5E5E",   // Dark gray alert
                "error": "#C3C3C3",     // Brightest gray for error messages
            }
        }
    ],
  }
};
export default config;
