/** @type { import('@storybook/react').Preview } */
import "@/styles/global.css";
import { themes } from "@storybook/theming";

const preview = {
  parameters: {
    darkMode: {
      dark: { ...themes.dark, appBg: "black" },
      light: { ...themes.light, appBg: "white" },
      current: "light",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
