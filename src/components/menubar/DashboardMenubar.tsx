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
import { useLayoutStore } from "@/lib/store/layoutStore";
import { Session } from "next-auth";
import { SharedLayoutWithSharedUserAndOwner, TypedLayout, TypedLayoutWithUser } from "@/types/WidgetData";
import { LayoutBar } from "./LayoutBar";

export default function DashboardMenubar({
  user,
  editMode,
  userLayouts,
  sharedLayouts,
}: {
  user: Session["user"];
  editMode: boolean;
  userLayouts: TypedLayoutWithUser[],
  sharedLayouts: SharedLayoutWithSharedUserAndOwner[]
}) {
  const { theme, setTheme } = useTheme();
  const [layoutBarEnabled, setLayoutBarEnabled] = useState(true);
  const currentLayout = useLayoutStore((state) => state.currentLayout);
  const saveLayout = useLayoutStore((state) => state.saveLayout);
  const createNewLayout = useLayoutStore((state) => state.createLayout);
  const stateLayouts = useLayoutStore((state) => state.layouts);
  const setLayouts = useLayoutStore((state) => state.setLayouts);
  const setCurrentLayout = useLayoutStore((state) => state.setCurrentLayout);
  const setSharedLayouts = useLayoutStore((state) => state.setSharedLayouts);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (userLayouts && !stateLayouts) {
      setLayouts(userLayouts);
    }
    if (sharedLayouts) {
      setSharedLayouts(sharedLayouts.map(sh => sh.layout));
    }
    if (userLayouts) {
      if (
        userLayouts.length > 0 &&
        (!currentLayout || !currentLayout?.onDashboard)
      ) {
        for (const l of userLayouts) {
          if (l.onDashboard) {
            setCurrentLayout(l);
          }
        }
      }
    } else {
      createNewLayout(user);
    }
  }, [
    userLayouts,
    sharedLayouts,
    setSharedLayouts,
    stateLayouts,
    createNewLayout,
    setCurrentLayout,
    setLayouts,
    user,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCommand = event.metaKey || event.ctrlKey;
      if (isCommand && event.key.toLowerCase() === "l") {
        event.preventDefault();
        createNewLayout(user);
      } else if (isCommand && event.key.toLowerCase() === "p") {
        event.preventDefault();
        window.print();
      } else if (isCommand && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (currentLayout && currentLayout.widgets) {
          saveLayout(currentLayout.id, user);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [currentLayout, saveLayout, createNewLayout, user]);

  return (
    <div className="flex justify-between border-b">
      <Menubar className="border-0">
        <MenubarMenu>
          <MenubarTrigger>Dashboard</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => createNewLayout(user)}>
              New Layout <MenubarShortcut>⌘L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => window.print()}>
              Print <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            {currentLayout &&
              currentLayout.widgets &&
              currentLayout.widgets.length > 0 && (
                <MenubarItem onClick={() => saveLayout(currentLayout.id, user)}>
                  Save Layout <MenubarShortcut>⌘S</MenubarShortcut>
                </MenubarItem>
              )}
            {pathname !== "/dashboard/edit" ? (
              <MenubarItem onClick={() => router.push("/dashboard/edit")}>
                Enter Edit Mode
              </MenubarItem>
            ) : (
              <MenubarItem onClick={() => router.push("/dashboard")}>
                Exit Edit Mode
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Settings</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setLayoutBarEnabled(!layoutBarEnabled)}>
              {layoutBarEnabled ? "Disable Layout Bar" : "Enable Layout Bar"}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setTheme("light")}>Light</MenubarItem>
            <MenubarItem onClick={() => setTheme("dark")}>Dark</MenubarItem>
            <MenubarItem onClick={() => setTheme("system")}>System</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <LayoutBar enabled={layoutBarEnabled} user={user} editMode={editMode} />
    </div>
  );
}
