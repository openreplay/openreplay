import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import DatePicker from "@/components/calendar/date-picker";

const meta: Meta<typeof DatePicker> = {
  title: "Components/DatePicker",
  component: DatePicker,
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
    date: { control: "date", description: "Selected date" },
    error: { control: "text", description: "Error message if any" },
    disabled: { control: "boolean", description: "Disable the date picker" },
    icon: { control: "boolean", description: "Show calendar icon" },
    align: {
      control: { type: "select" },
      options: ["start", "end", "center"],
      description: "Alignment of the date picker content",
    },
    contentStyle: {
      control: "text",
      description: "Additional styles for the content popover",
    },
    dateFormat: {
      control: "text",
      description: "Date format displayed in the trigger button",
    },
  },
  args: {
    icon: true,
    align: "center",
    dateFormat: "dd/MM/yyyy",
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: (args) => {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
      undefined,
    );
    return (
      <DatePicker {...args} date={selectedDate} setDate={setSelectedDate} />
    );
  },
};

export const WithError: Story = {
  render: (args) => {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
      undefined,
    );
    return (
      <DatePicker
        {...args}
        date={selectedDate}
        setDate={setSelectedDate}
        error="Please select a date"
      />
    );
  },
};

export const Disabled: Story = {
  render: (args) => {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
      undefined,
    );
    return (
      <DatePicker
        {...args}
        date={selectedDate}
        setDate={setSelectedDate}
        disabled
      />
    );
  },
};
