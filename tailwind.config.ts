import { type Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(250, 250, 250)",
        foreground: "rgb(30, 30, 30)",
        dark: {
          background: "rgb(10, 10, 10)",
          foreground: "rgb(240, 240, 240)",
        },
      },
    },
  },
};

export default config;
