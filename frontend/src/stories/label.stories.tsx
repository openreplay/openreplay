import type { Meta, StoryFn } from "@storybook/react";
import Label, { type LabelProps } from "@/components/label/label";
import { CircleHelp } from "lucide-react";

export default {
  title: "Components/Label",
  component: Label,
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
    badgeVariant: {
      control: { type: "select" },
      options: ["solid", "outline", "soft", "surface"],
    },
    required: {
      control: { type: "boolean" },
    },
  },
} as Meta;

const Template: StoryFn<LabelProps> = (args) => <Label {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: "Username",
  required: false,
  badgeVariant: "outline",
  helperText: "Please enter your username",
};

export const WithBadge = Template.bind({});
WithBadge.args = {
  label: "Username",
  required: true,
  badge: "New",
  badgeVariant: "outline",
  helperText: "Please enter your username",
};

export const WithIconAndBadge = Template.bind({});
WithIconAndBadge.args = {
  label: "Info",
  required: true,
  icon: CircleHelp,
  badge: "Updated",
  badgeVariant: "outline",
  helperText: "This is a helper text to help user",
};
