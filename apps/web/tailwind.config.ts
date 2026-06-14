import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#E8C4A8",
        input: "#E8C4A8",
        ring: "#E35336",
        background: "#FFF5EE",
        foreground: "#7A3010",
        primary: {
          DEFAULT: "#B83A1E",
          foreground: "#FFF5EE"
        },
        secondary: {
          DEFAULT: "#EDE8F2",
          foreground: "#5A4A6A"
        },
        muted: {
          DEFAULT: "#FFE8D2",
          foreground: "#7A3010"
        },
        accent: {
          DEFAULT: "#FDF0EC",
          foreground: "#5C1A0A"
        },
        destructive: {
          DEFAULT: "#FDF0EC",
          foreground: "#8A2B0E"
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#7A3010"
        },
        red: {
          50: "#FDF0EC",
          100: "#F8CBBE",
          200: "#EF9B84",
          400: "#E35336",
          600: "#B83A1E",
          800: "#8A2B0E",
          900: "#5C1A0A"
        },
        cream: {
          50: "#FFFAF6",
          100: "#FFF5EE",
          200: "#FFE8D2",
          400: "#FFD3AC",
          500: "#E8C4A8",
          600: "#C49070",
          800: "#7A3010"
        },
        mauve: {
          50: "#F5F2F8",
          100: "#EDE8F2",
          200: "#C8BDD4",
          400: "#9988A1",
          600: "#756480",
          800: "#5A4A6A",
          900: "#3A2848"
        },
        sienna: {
          50: "#F8EDE8",
          100: "#E8C4A8",
          200: "#C4845A",
          400: "#A04020",
          600: "#8A2B0E",
          800: "#6A1E08",
          900: "#4A1205"
        },
        palette: {
          cream: "#FFF5EE",
          creamLight: "#FFFAF6",
          creamSubtle: "#FFE8D2",
          creamBorder: "#E8C4A8",
          creamAccent: "#C49070",
          body: "#7A3010",
          heading: "#5C1A0A",
          red50: "#FDF0EC",
          red100: "#F8CBBE",
          red200: "#EF9B84",
          red400: "#E35336",
          red600: "#B83A1E",
          red800: "#8A2B0E",
          red900: "#5C1A0A",
          btnText: "#FFF5EE",
          rose: "#B83A1E",
          roseDeep: "#8A2B0E",
          roseSoft: "#F8CBBE",
          sesame: "#E8C4A8",
          sage: "#9988A1",
          sageLight: "#EDE8F2",
          sageDeep: "#5A4A6A",
          wheat: "#FFD3AC",
          clay: "#E35336",
          mint: "#EDE8F2",
          moss: "#7A3010",
          blush: "#FDF0EC",
          oxblood: "#5C1A0A"
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
        soft: "0 14px 34px rgba(92, 26, 10, 0.10), 0 2px 8px rgba(122, 48, 16, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
