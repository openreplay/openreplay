import type { Meta, StoryObj } from "@storybook/react";
import Radio from "@/components/radio/radio";

const meta: Meta<typeof Radio> = {
  title: "Components/Radio",
  component: Radio,
  args: {
    title: "Enable Notifications",
    description: "Receive notifications for updates and promotions.",
    disabled: false,
  },
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
    title: { control: "text" },
    description: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Radio>;

export const Default: Story = {
  render: (args) => <Radio {...args} />,
};
