import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import DateRangePicker from "@/components/calendar/date-range-picker";
import type { DateRange } from "react-day-picker";

const meta: Meta<typeof DateRangePicker> = {
  title: "Components/DateRangePicker",
  component: DateRangePicker,
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
    date: { control: "date", description: "Selected date range" },
    error: { control: "text", description: "Error message if any" },
    disabled: {
      control: "boolean",
      description: "Disable the date range picker",
    },
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
type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
  render: (args) => {
    const [selectedDate, setSelectedDate] = React.useState<
      DateRange | undefined
    >(undefined);
    return (
      <DateRangePicker
        {...args}
        date={selectedDate}
        setDate={setSelectedDate}
      />
    );
  },
};

export const WithError: Story = {
  render: (args) => {
    const [selectedDate, setSelectedDate] = React.useState<
      DateRange | undefined
    >(undefined);
    return (
      <DateRangePicker
        {...args}
        date={selectedDate}
        setDate={setSelectedDate}
        error="Please select a date range"
      />
    );
  },
};

export const Disabled: Story = {
  render: (args) => {
    const [selectedDate, setSelectedDate] = React.useState<
      DateRange | undefined
    >(undefined);
    return (
      <DateRangePicker
        {...args}
        date={selectedDate}
        setDate={setSelectedDate}
        disabled
      />
    );
  },
};
