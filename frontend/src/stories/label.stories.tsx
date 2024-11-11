import type { Meta, StoryFn } from "@storybook/react";
import Label, { type LabelProps } from "@/components/label/label";
import { Info } from "lucide-react";

export default {
  title: "Components/CustomLabel",
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
    variant: {
      control: { type: "select" },
      options: ["default", "muted"],
    },
    size: {
      control: { type: "select" },
      options: ["default", "sm", "lg"],
    },
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
  variant: "default",
  size: "default",
  required: false,
  helperText: "Please enter your username",
};

export const WithBadge = Template.bind({});
WithBadge.args = {
  label: "Username",
  required: true,
  badge: "New",
  badgeVariant: "solid",
  helperText: "Please enter your username",
};

export const WithIconAndBadge = Template.bind({});
WithIconAndBadge.args = {
  label: "Info",
  required: true,
  icon: Info,
  badge: "Updated",
  badgeVariant: "outline",
  helperText: "Additional information here",
};

export const Sizes = () => (
  <div className="space-y-4">
    <Label label="Small Label" size="sm" />
    <Label label="Default Label" size="default" />
    <Label label="Large Label" size="lg" />
  </div>
);

export const Variants = () => (
  <div className="space-y-4">
    <Label label="Default Variant" variant="default" />
    <Label label="Muted Variant" variant="muted" helperText="Muted text" />
  </div>
);
