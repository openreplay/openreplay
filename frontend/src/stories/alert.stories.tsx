import type { Meta, StoryFn } from "@storybook/react";
import { Alert } from "@/components/alert";

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
      options: ["default", "destructive", "info", "success"],
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

export const Info = Template.bind({});
Info.args = {
  title: "Info Alert",
  description: "This alert provides informational content.",
  variant: "info",
};

export const Success = Template.bind({});
Success.args = {
  title: "Success Alert",
  description: "This alert indicates a successful action.",
  variant: "success",
};
