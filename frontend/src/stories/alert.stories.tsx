import type { Meta, StoryFn } from "@storybook/react";
import { Alert } from "@/components/alert/alert";

export default {
  title: "Components/Alert",
  component: Alert,
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
      control: { type: "select" },
      options: ["default", "destructive", "warning", "success"],
    },
    title: { control: "text" },
    description: { control: "text" },
  },
} as Meta<typeof Alert>;

const Template: StoryFn<typeof Alert> = (args) => <Alert {...args} />;

export const Default = Template.bind({});
Default.args = {
  title: "Default Alert",
  description: "This is a default alert.",
  variant: "default",
};

export const Destructive = Template.bind({});
Destructive.args = {
  title: "Destructive Alert",
  description: "This alert indicates a destructive action.",
  variant: "destructive",
};

export const Success = Template.bind({});
Success.args = {
  title: "Success Alert",
  description: "This alert indicates a successful action.",
  variant: "success",
};

export const Warning = Template.bind({});
Warning.args = {
  title: "Warning Alert",
  description: "This alert indicates a warning action.",
  variant: "warning",
};
