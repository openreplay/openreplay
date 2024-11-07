import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/shadcn-components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shadcn-components/drawer";
import Separator from "@/components/separator/separator";
import { cn } from "@/lib/utils";
import useWindowSize from "@/hooks/use-window-size";
import { X } from "lucide-react";
import { Button } from "../button/button";

type ResponsiveDialogProps = {
  children: React.ReactNode;
  title: string;
  isOpen?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  separator?: boolean;
  dismissable?: boolean;
  actionButtons?: boolean;
  className?: string;
};

const ResponsiveDialog = ({
  children,
  title,
  isOpen = true,
  onClose,
  onClick,
  separator,
  dismissable,
  className,
  actionButtons,
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
          {actionButtons && (
            <DialogFooter className="px-5">
              <Button variant={"outline"} onClick={onClose}>
                Close
              </Button>
              <Button onClick={onClick}>Primary action</Button>
            </DialogFooter>
          )}
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
        {actionButtons && (
          <DrawerFooter>
            <div className="flex justify-end gap-2">
              <Button variant={"outline"} onClick={onClose}>
                Close
              </Button>
              <Button onClick={onClick}>Primary action</Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default ResponsiveDialog;
