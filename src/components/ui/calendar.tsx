"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 calendar-container", className)}
      classNames={{
        // This outer container makes sure the calendar fills the available space
        months: "flex flex-col sm:flex-row gap-2 w-full h-full",
        month: "flex flex-col gap-4 w-full h-full",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-[clamp(0.8rem,1vw+0.5rem,1.2rem)] font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        // Use table-fixed so that cells have equal width
        table: "w-full table-fixed border-collapse h-full",
        // Remove flex on tbody so the native table layout works as expected
        tbody: "w-full h-full",
        // Head row as a grid with 7 columns
        head_row: "grid grid-cols-7",
        // Use flex-1 for each header cell and center the text
        head_cell:
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
        // Each row is a grid with 7 equal columns
        row: "grid grid-cols-7 flex-1",
        // Each cell uses relative positioning
        cell: "relative p-0 text-center text-sm",
        // The day button fills its cell and is square (aspect-square)
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "w-full h-full aspect-square text-[clamp(0.5rem,6cqw,1.5rem)]"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
