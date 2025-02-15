"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Button } from "./ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { DBLayout } from "@/types/WidgetData";
import { useLayoutContext } from "./LayoutContext";

export function LayoutBar({
  enabled,
  userId,
}: {
  enabled: boolean;
  userId: number;
}) {
  const { layouts, currentLayout, switchLayout, createNewLayout, hasLayoutChanged, saveLayout } =
    useLayoutContext();

  return enabled ? (
    <Menubar className="border-0">
      <MenubarMenu>
        {layouts
          ? layouts.map((layout: DBLayout, index: number) => (
              <Button
                key={layout.id}
                variant={
                  currentLayout?.id === layout.id ? "default" : "outline"
                }
                className="border-b-0 rounded-b-none"
                onClick={() => {
                  switchLayout(layout.id);
                }}
              >
                Layout {index + 1}
                { hasLayoutChanged && currentLayout?.id === layout.id ? <span className="text-accent">*</span> : <></>}
              </Button>
            ))
          : null}
      </MenubarMenu>
      <MenubarMenu>
        <Button variant="outline" onClick={createNewLayout}>
          <PlusIcon className="w-4 h-4" />
        </Button>
      </MenubarMenu>
    </Menubar>
  ) : null;
}

export default function DashboardMenubar({ userId }: { userId: number }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [layoutBarEnabled, setLayoutBarEnabled] = useState(true);
  const { currentLayout, saveLayout, createNewLayout } = useLayoutContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global keyboard shortcuts for dashboard actions
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for macOS (metaKey) or Windows/Linux (ctrlKey)
      const isCommand = event.metaKey || event.ctrlKey;
  
      // ⌘/Ctrl + T: New Layout
      if (isCommand && event.key.toLowerCase() === "l") {
        event.preventDefault();
        console.log("New Layout");
        createNewLayout();
      }
      // ⌘/Ctrl + P: Print
      else if (isCommand && event.key.toLowerCase() === "p") {
        event.preventDefault();
        console.log("Print");
        window.print();
      }
      // ⌘/Ctrl + S: Save Layout
      else if (isCommand && event.key.toLowerCase() === "s") {
        console.log("Save Layout");
        event.preventDefault();
        if (currentLayout && currentLayout.layout.widgets) {
          console.log(currentLayout.layout.widgets);
          saveLayout(currentLayout.id, currentLayout.layout.widgets);
        }
      }
    };
  
    // Use capture phase in case some components are stopping propagation
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [currentLayout, saveLayout, createNewLayout]);  

  return (
    <div className="flex justify-between">
      <Menubar className="border-0">
        <MenubarMenu>
          <MenubarTrigger>Dashboard</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={createNewLayout}>
              New Layout <MenubarShortcut>⌘L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => window.print()}>
              Print <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            {currentLayout && currentLayout.layout?.widgets ? (
              <MenubarItem
                onClick={() => {
                  saveLayout(
                    currentLayout.id,
                    currentLayout.layout.widgets ?? []
                  );
                }}
              >
                Save Layout <MenubarShortcut>⌘S</MenubarShortcut>
              </MenubarItem>
            ) : null}
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Settings</MenubarTrigger>
          <MenubarContent>
            {pathname !== "/dashboard/edit" ? (
              <MenubarItem onClick={() => {
                router.push("/dashboard/edit");
              }}>Edit Dashboard</MenubarItem>
            ) : (
              <MenubarItem onClick={() => {
                router.push("/dashboard");
              }}>Exit Editor</MenubarItem>
            )}
            <MenubarItem onClick={() => setLayoutBarEnabled(!layoutBarEnabled)}>
              {layoutBarEnabled ? "Disable Layout Bar" : "Enable Layout Bar"}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* 🌗 Theme Switcher */}
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setTheme("light")}>Light</MenubarItem>
            <MenubarItem onClick={() => setTheme("dark")}>Dark</MenubarItem>
            <MenubarItem onClick={() => setTheme("system")}>System</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <LayoutBar enabled={layoutBarEnabled} userId={userId} />
    </div>
  );
}
