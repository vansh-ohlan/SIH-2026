import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14213D",
          light: "#233257",
          dark: "#0B1226",
        },
        parchment: {
          DEFAULT: "#EFEEE4",
          dark: "#E3E1D2",
        },
        ochre: {
          DEFAULT: "#C08A28",
          light: "#DDA84B",
          dark: "#8F6518",
        },
        land: {
          DEFAULT: "#2F5233",
          light: "#3E6B43",
        },
        brick: {
          DEFAULT: "#B0432D",
          light: "#C96448",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-lines":
          "linear-gradient(rgba(20,33,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,33,61,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
    },
  },
  plugins: [],
};
export default config;
