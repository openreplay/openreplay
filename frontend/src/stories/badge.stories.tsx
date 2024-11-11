import type { Meta, StoryFn } from "@storybook/react";
import { Badge, type BadgeProps } from "@/components/badge/badge";

export default {
  title: "Components/Badge",
  component: Badge,
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
      options: ["solid", "soft", "outline", "surface"],
    },
    size: {
      control: { type: "select" },
      options: ["small", "medium", "large"],
    },
  },
} as Meta;

const Template: StoryFn<BadgeProps> = (args) => <Badge {...args}>Label</Badge>;

export const Default = Template.bind({});
Default.args = {
  variant: "solid",
  size: "medium",
};

export const AllVariants = () => (
  <div className="flex flex-col gap-4">
    <Badge variant="solid">Solid</Badge>
    <Badge variant="soft">Soft</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="surface">Surface</Badge>
  </div>
);

export const Sizes = (args: Meta) => (
  <div className="flex flex-col gap-4">
    <Badge variant="solid" size="small" {...args}>
      Small
    </Badge>
    <Badge variant="solid" size="medium" {...args}>
      Medium
    </Badge>
    <Badge variant="solid" size="large" {...args}>
      Large
    </Badge>
  </div>
);
