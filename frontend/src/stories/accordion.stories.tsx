import type { Meta, StoryFn } from "@storybook/react";
import { Accordion } from "@/components/accordion/accordion";

export default {
  title: "Components/Accordion",
  component: Accordion,
  parameters: {
    backgrounds: {
      default: "light",
      values: [{ name: "dark" }],
    },
    darkMode: {
      current: "dark",
      stylePreview: true,
    },
  },
  argTypes: {
    items: {
      control: "object",
      description: "List of accordion items, each with a title and description",
    },
  },
} as Meta<typeof Accordion>;

const Template: StoryFn<typeof Accordion> = (args) => <Accordion {...args} />;

export const Default = Template.bind({});
Default.args = {
  items: [
    { title: "Section 1", description: "Content for section 1" },
    { title: "Section 2", description: "Content for section 2" },
    { title: "Section 3", description: "Content for section 3" },
  ],
};
