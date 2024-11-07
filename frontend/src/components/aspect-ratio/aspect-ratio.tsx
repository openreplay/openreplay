import type { AspectRatioProps } from "@radix-ui/react-aspect-ratio";
import { AspectRatio as ShadAspectRatio } from "@/shadcn-components/aspect-ratio";

const AspectRatio = ({ ratio, children, ...props }: AspectRatioProps) => {
  return (
    <ShadAspectRatio ratio={ratio} {...props}>
      {children}
    </ShadAspectRatio>
  );
};

export { AspectRatio };
