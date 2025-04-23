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
import { PlusIcon, TrashIcon, Pencil2Icon } from "@radix-ui/react-icons";
import { useStore } from "@/lib/store/layoutStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Session } from "next-auth";
import { TypedLayout } from "@/types/WidgetData";

export function LayoutBar({
  enabled,
  user,
  editMode,
}: {
  enabled: boolean;
  user: Session["user"];
  editMode: boolean;
}) {
  const layouts = useStore((state) => state.layouts);
  const currentLayout = useStore((state) => state.currentLayout);
  const switchLayout = useStore((state) => state.switchLayout);
  const createLayout = useStore((state) => state.createLayout);
  const hasLayoutChanged = useStore((state) => state.hasLayoutChanged);
  const deleteLayout = useStore((state) => state.deleteLayout);
  const updateLayoutName = useStore((state) => state.updateLayoutName);

  // State to hold the layout ID selected for deletion
  const [layoutToDelete, setLayoutToDelete] = useState<number | null>(null);
  // State for editing the layout name
  const [layoutToEdit, setLayoutToEdit] = useState<number | null>(null);
  const [newLayoutName, setNewLayoutName] = useState("");

  // Confirm deletion: delete the layout then close the modal
  const confirmDelete = () => {
    if (layoutToDelete !== null) {
      deleteLayout(layoutToDelete, user);
      setLayoutToDelete(null);
    }
  };

  // Function to save the new layout name
  const handleSaveLayoutName = () => {
    if (layoutToEdit !== null) {
      updateLayoutName(layoutToEdit, newLayoutName, user);
      setLayoutToEdit(null);
    }
  };

  if (!enabled) return null;

  return (
    // Wrapping in a div with relative positioning prevents the Dialog
    // from affecting the layout of the menubar.
    <div className="relative">
      <Menubar className="border-0">
        <MenubarMenu>
          {layouts?.map((layout, index) =>
            editMode ? (
              <div
                key={layout.id}
                className={`flex justify-between hover:bg-accent items-center border rounded-md border-b-0 rounded-b-none 
                *:w-max *:bg-transparent *:text-accent-foreground *:cursor-pointer *:hover:bg-transparent ${
                  currentLayout?.id === layout.id
                    ? "bg-accent"
                    : "bg-background"
                }`}
              >
                <Button
                  className="pl-3 pr-2 flex items-center gap-1"
                  onClick={() => switchLayout(layout.id, user)}
                >
                  {layout.name || `Layout ${index + 1}`}
                  {hasLayoutChanged && currentLayout?.id === layout.id && (
                    <span className="text-muted-foreground text-xs">(edited)</span>
                  )}
                </Button>
                <Button
                  size="icon"
                  className="hover:text-accent-foreground/70 flex items-center justify-center"
                  onClick={() => {
                    setLayoutToEdit(layout.id);
                    setNewLayoutName(layout.name || `Layout ${index + 1}`);
                  }}
                >
                  <Pencil2Icon className="w-full h-full" />
                </Button>
                <Button
                  size="icon"
                  className="pl-2 pr-2 hover:text-red-500 flex items-center justify-center"
                  onClick={() => setLayoutToDelete(layout.id)}
                >
                  <TrashIcon className="w-full h-full" />
                </Button>
              </div>
            ) : (
              <Button
                key={layout.id}
                variant="outline"
                className="border-b-0 rounded-b-none"
                onClick={() => switchLayout(layout.id, user)}
              >
                {layout.name || `Layout ${index + 1}`}
              </Button>
            )
          )}
        </MenubarMenu>
        {editMode && (
          <MenubarMenu>
            <Button variant="outline" onClick={() => createLayout(user)}>
              <PlusIcon className="w-4 h-4" />
            </Button>
          </MenubarMenu>
        )}
      </Menubar>

      {/* Confirmation Modal for deleting a layout */}
      <Dialog
        open={layoutToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setLayoutToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Layout Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this layout?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLayoutToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Layout Name Modal */}
      <Dialog
        open={layoutToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setLayoutToEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Layout Name</DialogTitle>
            <DialogDescription>
              Enter a new name for your layout.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            className="w-full p-2 mt-2 border rounded-md"
            value={newLayoutName}
            onChange={(e) => setNewLayoutName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveLayoutName();
              }
            }}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLayoutToEdit(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSaveLayoutName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DashboardMenubar({
  user,
  editMode,
  layouts,
}: {
  user: Session["user"];
  editMode: boolean;
  layouts: TypedLayout[];
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [layoutBarEnabled, setLayoutBarEnabled] = useState(true);
  const currentLayout = useStore((state) => state.currentLayout);
  const saveLayout = useStore((state) => state.saveLayout);
  const createNewLayout = useStore((state) => state.createLayout);
  const setLayouts = useStore((state) => state.setLayouts);
  const setCurrentLayout = useStore((state) => state.setCurrentLayout);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (layouts) {
      setLayouts(layouts);
      if (layouts.length > 0) {
        setCurrentLayout(layouts[0]);
      } else {
        createNewLayout(user);
      }
    }
  }, [layouts, createNewLayout, setCurrentLayout, setLayouts, user]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
