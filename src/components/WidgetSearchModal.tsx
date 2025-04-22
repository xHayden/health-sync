"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
// Import the consolidated widgetRegistry, its entries, and the literal widget key type.
import widgetRegistry, { WidgetValue } from "@/lib/widgetRegistry";
import { useStore } from "@/lib/store/layoutStore";

const WidgetSearchModal = () => {
  // State to track the search query and selected widget key.
  const [query, setQuery] = useState("");
  const [selectedWidgetKey, setSelectedWidgetKey] = useState<WidgetValue | null>(null);
  const createWidget = useStore((state) => state.createWidget);

  // Filter the widget entries based on the search query.
  const filteredEntries = Object.entries(widgetRegistry).filter(([, widget]) =>
    widget.name.toLowerCase().includes(query.toLowerCase())
  );

  // Get the widget metadata for the selected key.
  const selectedWidgetMeta = selectedWidgetKey ? widgetRegistry[selectedWidgetKey] : null;
  const selectedWidgetSettings = [...selectedWidgetMeta?.settings ?? []];

  return (
    <Dialog>
      <DialogTrigger className="fixed bottom-4 right-4 z-50" asChild>
        <Button className="group flex items-center p-3 overflow-visible">
          <span className="transition-transform duration-300 group-hover:rotate-90 w-4 h-4">
            <PlusIcon fontWeight="bold" className="w-4 h-4" />
          </span>
          <p className="absolute right-full mr-2 text-primary whitespace-nowrap transition-all duration-300 transform translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
            Add Widget
          </p>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 -z-10" />
        <DialogContent className="z-50 w-full h-full max-h-[70vh]">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Search Widgets</DialogTitle>
              </DialogHeader>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a widget..."
              />
              <ul className="max-h-80 overflow-auto space-y-2">
                {filteredEntries.map(([key, widget]) => (
                  <li
                    key={key}
                    onClick={() => setSelectedWidgetKey(key as WidgetValue)}
                    className={`cursor-pointer flex justify-between items-center p-3 rounded border hover:bg-foreground/10 ${
                      selectedWidgetKey === key ? "bg-foreground/10" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <h3 className="font-medium">{widget.name}</h3>
                      <p className="text-sm text-muted-foreground">{widget.description}</p>
                    </div>
                    <div className="flex justify-end">
                      {selectedWidgetKey === key && (
                        <Button
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          // Directly pass the widget key to createWidget.
                          onClick={() => createWidget(key)}
                        >
                          <PlusIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-l pl-6">
              {selectedWidgetMeta ? (
                <>
                  <h3 className="text-lg font-bold mb-2">
                    {selectedWidgetMeta.name} Preview
                  </h3>
                  <div className="w-full h-full max-h-[50vh] overflow-y-auto">
                    <selectedWidgetMeta.component {...selectedWidgetMeta.dummyData} settings={selectedWidgetSettings} />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Select a widget to see a preview here.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default WidgetSearchModal;
