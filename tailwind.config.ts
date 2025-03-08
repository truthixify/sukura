import type {Config} from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
        backgroundImage: {
            "gradient-primary": "linear-gradient(45deg, #42B3FF, #7852F3)",
            "gradient-secondary": "linear-gradient(45deg, #6875A9, #292E43)",
        },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
        {
            sukura: {
                primary: "#7AFB96",
                secondary: "#FFFFFF",
                accent: "#FFFFFF",
                neutral: "#FFFFFF",
                "base-100": "000000",
                "base-200": "#232837",
                "base-300": "#292E43",
                info: "#FFFFFF",
                success: "#7AFB96",
                warning: "#FFFFFF",
                error: "#FFFFFF"
            },
        },
    ]
  }
};
export default config;
