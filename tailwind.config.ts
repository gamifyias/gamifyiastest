import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        game: ['"Space Grotesk"', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Game-specific colors
        game: {
          gold: "hsl(var(--coin-gold))",
          "gold-glow": "hsl(var(--coin-glow))",
          sky: "hsl(var(--sky-blue))",
          "sky-light": "hsl(var(--sky-light))",
          pipe: "hsl(var(--pipe-green))",
          "pipe-dark": "hsl(var(--pipe-dark))",
          brick: "hsl(var(--brick-red))",
          "brick-dark": "hsl(var(--brick-dark))",
          ground: "hsl(var(--ground-brown))",
          cloud: "hsl(var(--cloud-white))",
          star: "hsl(var(--star-yellow))",
          mushroom: "hsl(var(--mushroom-red))",
          boss: "hsl(var(--boss-purple))",
        },
        admin: {
          bg: "hsl(var(--admin-bg))",
          card: "hsl(var(--admin-card))",
          border: "hsl(var(--admin-border))",
        },
        mentor: {
          bg: "hsl(var(--mentor-bg))",
          card: "hsl(var(--mentor-card))",
          accent: "hsl(var(--mentor-accent))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pixel: "0px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "coin-spin": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        "jump": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--primary) / 0.5)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-left": "slide-in-left 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "slide-in-up": "slide-in-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "coin-spin": "coin-spin 1s linear infinite",
        "jump": "jump 0.5s ease-in-out",
        "wiggle": "wiggle 0.3s ease-in-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      boxShadow: {
        "pixel": "4px 4px 0 0 rgba(0, 0, 0, 0.2)",
        "pixel-lg": "6px 6px 0 0 rgba(0, 0, 0, 0.2), 12px 12px 0 0 rgba(0, 0, 0, 0.1)",
        "glow": "0 0 20px hsl(var(--primary) / 0.5)",
        "glow-lg": "0 0 40px hsl(var(--primary) / 0.6)",
        "card-hover": "0 12px 40px -12px hsl(var(--primary) / 0.3)",
        "admin": "0 4px 24px -4px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "game-sky": "linear-gradient(180deg, hsl(200 90% 75%) 0%, hsl(200 85% 60%) 100%)",
        "game-sunset": "linear-gradient(180deg, hsl(30 80% 60%) 0%, hsl(350 70% 55%) 100%)",
        "game-night": "linear-gradient(180deg, hsl(240 30% 20%) 0%, hsl(260 40% 10%) 100%)",
        "admin-gradient": "linear-gradient(135deg, hsl(225 25% 12%) 0%, hsl(225 30% 8%) 100%)",
        "gold-gradient": "linear-gradient(135deg, hsl(45 100% 51%) 0%, hsl(40 100% 45%) 100%)",
        "success-gradient": "linear-gradient(135deg, hsl(142 70% 45%) 0%, hsl(142 60% 35%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
