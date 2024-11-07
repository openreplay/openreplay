import type { Meta, StoryObj } from "@storybook/react";
import Checkbox from "@/components/checkbox/checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
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
    label: {
      control: "text",
      description: "Label text for the checkbox",
    },
    description: {
      control: "text",
      description: "Description text for the checkbox",
    },
  },
  args: {
    label: "",
    description: "",
  },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: (args) => <Checkbox {...args} />,
};

export const WithLabel: Story = {
  render: (args) => <Checkbox {...args} />,
  args: {
    label: "Accept Terms",
    description: "Please accept the terms and conditions.",
  },
};
