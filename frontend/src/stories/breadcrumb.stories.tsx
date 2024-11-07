import type { Meta, StoryFn } from "@storybook/react";
import { Breadcrumb } from "@/components/breadcrumb/breadcrumb";
import { Slash, ChevronRight } from "lucide-react";

export default {
  title: "Components/Breadcrumb",
  component: Breadcrumb,
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
    separator: {
      control: {
        type: "select",
      },
      options: ["Slash", "Chevron"],
      mapping: {
        Slash: <Slash className="-rotate-12" />,
        Chevron: <ChevronRight />,
      },
    },
  },
} as Meta<typeof Breadcrumb>;

const Template: StoryFn<typeof Breadcrumb> = (args) => <Breadcrumb {...args} />;

export const Default = Template.bind({});
Default.args = {
  items: [
    { label: "Home", href: "/" },
    { label: "Category", href: "/category" },
    { label: "Subcategory", href: "/category/subcategory" },
    { label: "Product", isCurrent: true },
  ],
};

export const WithCustomSeparator = Template.bind({});
WithCustomSeparator.args = {
  items: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/dashboard/settings" },
    { label: "Profile", isCurrent: true },
  ],
  separator: <ChevronRight />,
};
