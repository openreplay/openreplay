import React from "react";
import type { Meta, StoryFn } from "@storybook/react";
import { Accordion } from "@/components/accordion";

export default {
  title: "Components/Accordion",
  component: Accordion,
  parameters: {
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#1a1a1a" },
      ],
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

export const DarkMode = Template.bind({});
DarkMode.args = {
  ...Default.args,
};
DarkMode.parameters = {
  backgrounds: { default: "dark" },
};

export const HoverState = Template.bind({});
HoverState.args = {
  ...Default.args,
};
HoverState.parameters = {
  pseudo: { hover: true },
};

export const FocusState = Template.bind({});
FocusState.args = {
  ...Default.args,
};
FocusState.parameters = {
  pseudo: { focus: true },
};

export const OpenState = Template.bind({});
OpenState.args = {
  items: [
    { title: "Section 1", description: "Content for section 1" },
    { title: "Section 2", description: "Content for section 2" },
  ],
};

