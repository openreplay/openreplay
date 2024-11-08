"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shadcn-components/popover";
import { Button } from "../button/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/shadcn-components/calendar";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Label } from "@/shadcn-components/label";
import { Calendar1, Calendar1Icon, ChevronDown } from "lucide-react";

type DatePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  dateFormat?: string;
  register?: UseFormRegisterReturn;
  icon?: boolean;
  align?: "start" | "end" | "center" | undefined;
  contentStyle?: string;
};

const DatePicker = ({
  date,
  setDate,
  error,
  icon = false,
  align = "end",
  disabled = false,
  className,
  contentStyle,
  dateFormat = "dd/MM/yyyy",
}: DatePickerProps) => {
  const hasError = error !== undefined;

  return (
    <div className="mx-auto w-fit space-y-1.5">
      <Popover>
        <PopoverTrigger disabled={disabled} asChild>
          <div className="relative cursor-pointer">
            {icon && (
              <div
                className={cn(
                  "absolute inset-y-0 left-0 flex items-center pl-3",
                  !date && "text-muted-foreground",
                )}
              >
                <Calendar1Icon className="h-4 w-4" />
              </div>
            )}
            <Button
              variant={"outline"}
              disabled={disabled}
              className={cn(
                "items-center justify-between border-neutral-300 text-left text-sm font-medium shadow-none",
                !date && "text-muted-foreground",
                hasError && "border-red-500",
                icon && "pl-9 pr-2",
                className,
              )}
            >
              {date ? format(date, dateFormat) : <span>Pick a date</span>}
              <div className="mt-0.5 h-4 w-4">
                <ChevronDown />
              </div>
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-auto p-0 shadow-lg", contentStyle)}
          align={align}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {hasError && (
        <p className="text-sm font-semibold text-red-500">{error}</p>
      )}
    </div>
  );
};

export default DatePicker;
