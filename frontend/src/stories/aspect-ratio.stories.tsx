import { AspectRatio } from "@/components/aspect-ratio/aspect-ratio";
import type { Meta, StoryObj } from "@storybook/react";

const ratioOptions = {
  [16 / 9]: "16:9",
  [3 / 2]: "3:2",
  [297 / 210]: "A4 Landscape",
  [4 / 3]: "4:3",
  [1 / 1]: "1:1",
  [9 / 16]: "9:16",
  [2 / 3]: "2:3",
  [210 / 297]: "A4 Portrait",
  [3 / 4]: "3:4",
  [5 / 2]: "5:2",
};

const meta: Meta<typeof AspectRatio> = {
  title: "Components/AspectRatio",
  component: AspectRatio,
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
    ratio: {
      control: {
        type: "select",
        labels: ratioOptions,
      },
      options: Object.keys(ratioOptions).map(parseFloat),
      description: "Aspect ratio of the component (width / height)",
    },
  },
  args: {
    ratio: 16 / 9,
  },
};

export default meta;

type Story = StoryObj<typeof AspectRatio>;

export const AllVariants: Story = {
  render: (args) => (
    <div className="mx-auto max-w-[15rem] text-center">
      <AspectRatio {...args}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="h-full w-full object-cover"
        />
      </AspectRatio>
      <p className="mt-2">
        Current Ratio: {args.ratio ? ratioOptions[args.ratio] : ""}
      </p>
    </div>
  ),
};
