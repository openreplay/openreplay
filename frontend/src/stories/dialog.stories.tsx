import type { Meta, StoryObj } from "@storybook/react";
import ResponsiveDialog from "@/components/dialog/dialog";
import { Button } from "@/components/button/button";
import { useState } from "react";

const meta: Meta<typeof ResponsiveDialog> = {
  title: "Components/ResponsiveDialog",
  component: ResponsiveDialog,
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
    title: {
      control: "text",
      defaultValue: "Sample Dialog Title",
    },
    separator: {
      control: "boolean",
      defaultValue: true,
    },
    dismissable: {
      control: "boolean",
      defaultValue: true,
    },
    actionButtons: {
      control: "boolean",
      defaultValue: false,
    },
  },
};

export default meta;

type Story = StoryObj<typeof ResponsiveDialog>;

export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    return (
      <>
        <Button onClick={handleOpen}>Open Dialog/Drawer</Button>
        <ResponsiveDialog
          {...args}
          isOpen={isOpen}
          onClose={handleClose}
          title="Title"
        >
          Body Text.
        </ResponsiveDialog>
      </>
    );
  },
};

export const WithActionButtons: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    return (
      <>
        <Button onClick={handleOpen}>Open Dialog/Drawer</Button>
        <ResponsiveDialog
          {...args}
          isOpen={isOpen}
          onClose={handleClose}
          actionButtons
          separator
          title="Title"
        >
          Body Text.
        </ResponsiveDialog>
      </>
    );
  },
};
