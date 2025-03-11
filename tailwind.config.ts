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
        animation: {
            colorCycle1: "colorCycle 4s infinite linear 0s",
            colorCycle2: "colorCycle 4s 0.15s infinite linear 0.2s",
            colorCycle3: "colorCycle 4s 0.3s infinite linear 0.4s",
            colorCycle4: "colorCycle 4s 0.45s infinite linear 0.6s",
            colorCycle5: "colorCycle 4s 0.6s infinite linear 0.8s",
            colorCycle6: "colorCycle 4s 0.75s infinite linear 1s",
            colorCycle7: "colorCycle 4s 0.9s infinite linear 1.2s",
            colorCycle8: "colorCycle 4s 1.05s infinite linear 1.4s",
        },
          keyframes: {
            colorCycle: {
              "0%": { fill: "#D9D9D9" },
              "50%": { fill: "#2D2D2D" },
              "100%": { fill: "#D9D9D9" },
            },
        },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
        {
            sukura: {
                primary: "#11192F",
                secondary: "#FFFFFF",
                accent: "#FFFFFF",
                neutral: "#FFFFFF",
                "base-100": "#0B0D12",
                "base-200": "#181920",
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
