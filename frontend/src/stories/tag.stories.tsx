import Tag from "@/components/tag/tag";
import type { Meta, StoryObj } from "@storybook/react";
import { Circle } from "lucide-react";

const meta: Meta<typeof Tag> = {
  title: "Components/Tag",
  component: Tag,
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
  args: {
    label: "Label",
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {
  args: {},
};

export const WithCount: Story = {
  args: {
    count: 5,
  },
};

export const Dissmissable: Story = {
  args: {
    dissmissable: true,
    onRemove: () => alert("Tag removed"),
  },
};

export const WithCountAndDissmissable: Story = {
  args: {
    count: 5,
    dissmissable: true,
    onRemove: () => alert("Tag removed"),
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Circle className="h-4 w-4" />,
  },
};

export const WithEverything: Story = {
  args: {
    count: 5,
    dissmissable: true,
    onRemove: () => alert("Tag removed"),
    icon: <Circle className="h-4 w-4" />,
  },
};
