"use client";

import { useState, useMemo } from "react";
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Pencil2Icon, Cross2Icon } from "@radix-ui/react-icons";
import { useLayoutStore } from "@/lib/store/layoutStore";
import { Session } from "next-auth";
import { TypedLayoutWithUser } from "@/types/WidgetData";
import { LayoutSheet } from "../layoutSheet/LayoutSheet";
import { LayoutSettingsModal } from "./LayoutSettingsModal";
import { useSharingStore } from "@/lib/store/sharedLayoutStore";

export type DisplayLayout = TypedLayoutWithUser & {
  /** Whether this layout arrived through a share. */
  shared?: boolean;
  /** The SharedLayout row ID (needed for future features, analytics, etc.). */
  shareId?: number;
};

export function LayoutBar({
  enabled,
  user,
  editMode,
}: {
  enabled: boolean;
  user: Session["user"];
  editMode: boolean;
}) {
  const layouts = useLayoutStore((state) => state.layouts);
  const sharedLayoutsWithMe = useSharingStore(
    (state) => state.shareLayoutConnections
  );
  const currentLayout = useLayoutStore((state) => state.currentLayout);
  const switchLayout = useLayoutStore((state) => state.switchLayout);
  const hasLayoutChanged = useLayoutStore((state) => state.hasLayoutChanged);
  const updateLayoutOnDashboard = useLayoutStore(
    (state) => state.updateLayoutOnDashboard
  );
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutToEdit, setLayoutToEdit] = useState<DisplayLayout | null>(null);

  const displayLayouts = useMemo<DisplayLayout[]>(() => {
    const personalLayouts: DisplayLayout[] = (layouts ?? []).map((l) => ({
      ...l,
      shared: false,
    }));

    // Shared layouts: lift the `onDashboard` flag from the SharedLayout level
    // onto the underlying `Layout` so rendering is uniform.
    // @ts-ignore
    const sharedLayouts: DisplayLayout[] = (sharedLayoutsWithMe ?? []).map(
      (sl) => ({
        ...sl.layout,
        // Preserve existing value on the inner layout, but fall back to the
        // value declared on the share entry itself.
        onDashboard: sl.layout.onDashboard ?? sl.onDashboard ?? false,
        shared: true,
        shareId: sl.id,
      })
    );

    // Merge -> filter -> sort (oldest left, newest right)
    return [...personalLayouts, ...sharedLayouts]
      .filter((l) => l.onDashboard)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [layouts, sharedLayoutsWithMe]);

  if (!enabled) return null;

  return (
    <div className="relative">
      <Menubar className="border-0">
        <MenubarMenu>
          {displayLayouts.map((layout, index) => {
            const isCurrent = currentLayout?.id === layout.id;

            if (!editMode) {
              return (
                <Button
                  key={layout.id}
                  variant="outline"
                  className="border-b-0 rounded-b-none"
                  onClick={() => switchLayout(layout.id, user)}
                >
                  {layout.name || `Layout ${index + 1}`}
                </Button>
              );
            }

            return (
              <div
                key={layout.id}
                className={`flex justify-between hover:bg-accent items-center border rounded-md border-b-0 rounded-b-none *:w-max *:bg-transparent *:text-accent-foreground *:cursor-pointer *:hover:bg-transparent ${
                  isCurrent ? "bg-accent" : "bg-background"
                }`}
              >
                {/* Switch layout */}
                <Button
                  className="pl-3 pr-2 flex items-center gap-1"
                  onClick={() => switchLayout(layout.id, user)}
                >
                  {layout.name || `Layout ${index + 1}`}
                  {hasLayoutChanged && isCurrent && (
                    <span className="text-muted-foreground text-xs">
                      (edited)
                    </span>
                  )}
                </Button>

                {/* Edit / delete only for personal layouts */}
                {!layout.shared && (
                  <>
                    <Button
                      size="icon"
                      className="hover:text-accent-foreground/70 flex items-center justify-center"
                      onClick={() => {
                        setLayoutToEdit(layout);
                        setSettingsOpen(true);
                      }}
                    >
                      <Pencil2Icon className="w-full h-full" />
                    </Button>
                    <Button
                      size="icon"
                      className="pl-2 pr-2 hover:text-destructive flex items-center justify-center"
                      onClick={() =>
                        updateLayoutOnDashboard(layout.id, false, user)
                      }
                    >
                      <Cross2Icon className="w-full h-full" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </MenubarMenu>

        {/* New-layout button only appears in edit mode */}
        {editMode && (
          <MenubarMenu>
            <LayoutSheet user={user} />
          </MenubarMenu>
        )}
      </Menubar>

      {/* SETTINGS / PERMISSIONS MODAL */}
      <LayoutSettingsModal
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setLayoutToEdit(null);
        }}
        layout={layoutToEdit}
        owner={user}
      />
    </div>
  );
}
