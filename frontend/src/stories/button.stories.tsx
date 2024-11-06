import type { Meta, StoryFn } from "@storybook/react";
import { Button } from "@/components/button/button";

export default {
  title: "Components/Button",
  component: Button,
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
    variant: {
      control: {
        type: "select",
      },
      options: ["primary", "secondary", "outline", "ghost", "destructive"],
    },
    size: {
      control: {
        type: "select",
      },
      options: ["default", "sm", "lg"],
    },
    disabled: {
      control: "boolean",
      description: "Simulate the disabled state",
    },
    children: {
      control: "text",
      defaultValue: "Button",
    },
  },
} as Meta;

const Template: StoryFn = (args) => <Button {...args} />;

export const AllVariants = Template.bind({});
AllVariants.args = {
  variant: "primary",
  size: "default",
  children: "Button",
  disabled: false,
};

AllVariants.parameters = {
  backgrounds: { default: "dark" },
};

export const Primary = Template.bind({});
Primary.args = {
  variant: "primary",
  size: "default",
  children: "Primary Button",
};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: "secondary",
  size: "default",
  children: "Secondary Button",
};

export const Outline = Template.bind({});
Outline.args = {
  variant: "outline",
  size: "default",
  children: "Outline Button",
};

export const Ghost = Template.bind({});
Ghost.args = {
  variant: "ghost",
  size: "default",
  children: "Ghost Button",
};

export const Destructive = Template.bind({});
Destructive.args = {
  variant: "destructive",
  size: "default",
  children: "Destructive Button",
};

export const Small = Template.bind({});
Small.args = {
  variant: "primary",
  size: "sm",
  children: "Small Button",
};

export const Large = Template.bind({});
Large.args = {
  variant: "primary",
  size: "lg",
  children: "Large Button",
};

export const Disabled = Template.bind({});
Disabled.args = {
  variant: "primary",
  size: "default",
  children: "Disabled Button",
};
