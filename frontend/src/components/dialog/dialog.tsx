import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/shadcn-components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shadcn-components/drawer";
import Separator from "@/components/separator/separator";
import { cn } from "@/lib/utils";
import useWindowSize from "@/hooks/use-window-size";
import { X } from "lucide-react";

type ResponsiveDialogProps = {
  children: React.ReactNode;
  title: string;
  isOpen?: boolean;
  onClose?: () => void;
  separator?: boolean;
  dismissable?: boolean;
  className?: string;
};

const ResponsiveDialog = ({
  children,
  title,
  isOpen = true,
  onClose,
  separator,
  dismissable,
  className,
}: ResponsiveDialogProps) => {
  const { isDesktop } = useWindowSize();

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn("px-0 sm:max-w-[35rem]", className)}>
          <DialogHeader className={cn("px-5")}>
            <DialogTitle className="font-semibold">{title}</DialogTitle>
            {dismissable && (
              <DialogClose className="absolute right-4 top-3 text-neutral-500 dark:text-neutral-400">
                <X />
              </DialogClose>
            )}
          </DialogHeader>
          {separator && <Separator />}
          <div className="px-5 text-sm">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className={cn("h-[50vh] px-0", className)}>
        <DrawerHeader className="px-5 pb-6 text-left">
          <DrawerTitle className="font-semibold">{title}</DrawerTitle>
        </DrawerHeader>
        {separator && <Separator />}
        <div className="px-5 py-6 text-sm">{children}</div>
      </DrawerContent>
    </Drawer>
  );
};

export default ResponsiveDialog;
