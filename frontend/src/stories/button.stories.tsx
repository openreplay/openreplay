import React from "react";
import type { Meta, StoryFn } from "@storybook/react";
import { Button, buttonVariants } from "@/components/button/button";

export default {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: {
        type: "select",
        options: ["primary", "secondary", "secondary-outline"],
      },
    },
    size: {
      control: {
        type: "select",
        options: ["default", "sm", "lg"],
      },
    },
    disabled: {
      control: "boolean",
    },
    children: {
      control: "text",
      defaultValue: "Button",
    },
  },
} as Meta;

const Template: StoryFn = (args) => <Button {...args} />;

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

export const SecondaryOutline = Template.bind({});
SecondaryOutline.args = {
  variant: "secondary-outline",
  size: "default",
  children: "Secondary Outline Button",
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
  disabled: true,
};
