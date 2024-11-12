import type { Meta, StoryFn } from "@storybook/react";
import Input from "@/components/form/input";
import type InputProps from "@/components/form/input";
import { Mail } from "lucide-react";

export default {
  title: "Components/Input",
  component: Input,
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
    label: { control: "text" },
    error: { control: "text" },
    helperText: { control: "text" },
    inputIcon: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} as Meta;

const Template: StoryFn<typeof InputProps> = (args) => (
  <div className="w-full max-w-[20rem]">
    <Input {...args} />
  </div>
);

export const Default = Template.bind({});
Default.args = {
  label: "Username",
  placeholder: "Enter your username",
};

export const WithError = Template.bind({});
WithError.args = {
  label: "Email",
  placeholder: "Enter your email",
  error: "Invalid email address",
};

export const WithHelperText = Template.bind({});
WithHelperText.args = {
  label: "Password",
  placeholder: "Enter your password",
  helperText: "Must be at least 8 characters",
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  label: "Email",
  placeholder: "Enter your email",
  inputIcon: <Mail className="h-4 w-4" />,
};

export const RequiredField = Template.bind({});
RequiredField.args = {
  label: "Full Name",
  placeholder: "Enter your full name",
  required: true,
};
