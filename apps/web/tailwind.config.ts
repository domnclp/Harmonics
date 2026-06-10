import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#607456",
        input: "#A9B99A",
        ring: "#BA6A4C",
        background: "#EEE0CC",
        foreground: "#364A32",
        primary: {
          DEFAULT: "#607456",
          foreground: "#EEE0CC"
        },
        secondary: {
          DEFAULT: "#7F916F",
          foreground: "#EEE0CC"
        },
        muted: {
          DEFAULT: "#D8E0D0",
          foreground: "#364A32"
        },
        accent: {
          DEFAULT: "#BA6A4C",
          foreground: "#EEE0CC"
        },
        destructive: {
          DEFAULT: "#7B2525",
          foreground: "#EEE0CC"
        },
        card: {
          DEFAULT: "#F6EDE0",
          foreground: "#364A32"
        },
        palette: {
          cream: "#EEE0CC",
          creamLight: "#F6EDE0",
          sage: "#607456",
          sageLight: "#7F916F",
          sageDeep: "#364A32",
          wheat: "#D9C49E",
          clay: "#BA6A4C",
          mint: "#D8E0D0",
          moss: "#A9B99A",
          blush: "#E8CFC1",
          oxblood: "#7B2525"
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem"
      },
      fontFamily: {
        serif: ["Lora", "Merriweather", "Georgia", "Times New Roman", "serif"]
      },
      boxShadow: {
        soft: "0 14px 34px rgba(54, 74, 50, 0.14)"
      }
    }
  },
  plugins: []
} satisfies Config;
