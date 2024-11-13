const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: "true",
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        sm: "375px",
        md: "834px",
        lg: "1440px",
      },
      colors: {
        border: "hsl(var(--border))",

        input: {
          DEFAULT: "hsl(var(--input))",
          background: "hsl(var(--input-background))",
          placeholder: "hsl(var(--input-placeholder))",
          border: "hsl(var(--input-border))",
        },

        "tag-hover": "hsl(var(--tag-hover))",

        calendar: {
          DEFAULT: "hsl(var(--calendar))",
          hover: "hsl(var(--calendar-hover))",
        },

        "secondary-text": "hsl(var(--secondary-text))",

        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          hover: "hsl(var(--destructive-hover))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        accordion: {
          description: "hsl(var(--accordion-description))",
          "background-hover": "hsl(var(--accordion-background-hover))",
        },
        alert: {
          bg: "hsl(var(--alert-bg))",
          description: "hsl(var(--alert-description))",
          destructive: "hsl(var(--alert-destructive))",
          success: "hsl(var(--alert-success))",
          warning: "hsl(var(--alert-warning))",
          "border-destructive": "hsl(var(--alert-border-destructive))",
          "border-warning": "hsl(var(--alert-border-warning))",
          "bg-destructive": "hsl(var(--alert-bg-destructive))",
          "bg-success": "hsl(var(--alert-bg-success))",
          "bg-warning": "hsl(var(--alert-bg-warning))",
        },
        badge: {
          soft: "hsl(var(--badge-soft))",
          "outline-border": "hsl(var(--badge-outline-border))",
          "outline-foreground": "hsl(var(--badge-outline-foreground))",
          surface: "hsl(var(--badge-surface))",
          "surface-border": "hsl(var(--badge-surface-border))",
          "surface-foreground": "hsl(var(--badge-surface-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      fontSize: {
        "heading-h1": [
          "3rem",
          {
            lineHeight: "53px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          },
        ],
        "heading-h2": [
          "2.5rem",
          {
            lineHeight: "50px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          },
        ],
        "heading-h3": [
          "2rem",
          {
            lineHeight: "40px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          },
        ],
        "heading-h4": [
          "1.5rem",
          {
            lineHeight: "32px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "heading-h5": [
          "1.25rem",
          {
            lineHeight: "24px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "heading-h6": [
          "1rem",
          {
            lineHeight: "20px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "heading-h1-mb": [
          "2.5rem",
          {
            lineHeight: "40px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          },
        ],
        "heading-h2-mb": [
          "2rem",
          {
            lineHeight: "32px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          },
        ],
        "heading-h3-mb": [
          "1.5rem",
          {
            lineHeight: "24px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "heading-h4-mb": [
          "1.25rem",
          {
            lineHeight: "20px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "heading-h5-mb": [
          "1.125rem",
          {
            lineHeight: "18px",
            fontWeight: 500,
            letterSpacing: "-0.015em",
          },
        ],
        "heading-h6-mb": [
          "1rem",
          {
            lineHeight: "16px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          },
        ],
        "body-24": [
          "1.5rem",
          {
            lineHeight: "32px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
        "body-20": [
          "1.25rem",
          {
            lineHeight: "28px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
        "body-18": [
          "1.125rem",
          {
            lineHeight: "24px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
        "body-16": [
          "1rem",
          {
            lineHeight: "24px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
        "body-14": [
          "0.875rem",
          {
            lineHeight: "22px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
        "label-12": [
          "0.75rem",
          {
            lineHeight: "18px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "label-12-regular": [
          "0.75rem",
          {
            lineHeight: "18px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
        "label-10": [
          "0.625rem",
          {
            lineHeight: "16px",
            fontWeight: 500,
            letterSpacing: "0",
          },
        ],
        "label-10-regular": [
          "0.625rem",
          {
            lineHeight: "16px",
            fontWeight: 400,
            letterSpacing: "0",
          },
        ],
      },

      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
