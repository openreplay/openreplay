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
    badgeColor: {
      control: { type: "select" },
      options: ["primary", "success", "warning", "danger", "info"],
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
  badgeColor: "primary",
  size: "medium",
};

export const Variants = () => (
  <div className="flex flex-col gap-4">
    <Badge variant="solid" badgeColor="primary" size="medium">
      Solid Primary
    </Badge>
    <Badge variant="soft" badgeColor="success" size="medium">
      Soft Success
    </Badge>
    <Badge variant="outline" badgeColor="warning" size="medium">
      Outline Warning
    </Badge>
    <Badge variant="surface" badgeColor="danger" size="medium">
      Surface Danger
    </Badge>
  </div>
);

export const Colors = () => (
  <div className="flex flex-col gap-4">
    <Badge variant="solid" badgeColor="primary" size="medium">
      Primary
    </Badge>
    <Badge variant="solid" badgeColor="success" size="medium">
      Success
    </Badge>
    <Badge variant="solid" badgeColor="warning" size="medium">
      Warning
    </Badge>
    <Badge variant="solid" badgeColor="danger" size="medium">
      Danger
    </Badge>
    <Badge variant="solid" badgeColor="info" size="medium">
      Info
    </Badge>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-col gap-4">
    <Badge variant="solid" badgeColor="primary" size="small">
      Small
    </Badge>
    <Badge variant="solid" badgeColor="primary" size="medium">
      Medium
    </Badge>
    <Badge variant="solid" badgeColor="primary" size="large">
      Large
    </Badge>
  </div>
);
