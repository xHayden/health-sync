"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrashIcon, PencilIcon } from "lucide-react";
import { useLayoutStore } from "@/lib/store/layoutStore";
import { LayoutSettingsModal } from "../menubar/LayoutSettingsModal";
import { Session } from "next-auth";
import { TypedLayoutWithUser } from "@/types/WidgetData";
import { UserShare, useSharingStore } from "@/lib/store/sharedLayoutStore";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";

interface LayoutSheetProps {
  user: Session["user"];
}

export const LayoutSheet = ({ user }: LayoutSheetProps) => {
  const layouts = useLayoutStore((state) => state.layouts);
  const updateLayoutOnDashboard = useLayoutStore(
    (state) => state.updateLayoutOnDashboard
  );
  const deleteLayout = useLayoutStore((state) => state.deleteLayout);
  const createLayout = useLayoutStore((state) => state.createLayout);

  const sharedLayoutsWithMe = useSharingStore(
    (state) => state.shareLayoutConnections
  );

  const updateOnDashboardShared = useSharingStore(
    (state) => state.updateLayoutOnDashboard
  );
  const fetchSharedLayoutsWithMe = useSharingStore(
    (state) => state.fetchSharedWithMe
  );

  const [layoutToDelete, setLayoutToDelete] = useState<number | null>(null);
  const [layoutToEdit, setLayoutToEdit] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!sharedLayoutsWithMe || sharedLayoutsWithMe.length == 0) {
      fetchSharedLayoutsWithMe(user.id);
    }
  }, []);

  const handleCreate = () => createLayout(user);

  const handleConfirmDelete = () => {
    if (layoutToDelete !== null) {
      deleteLayout(layoutToDelete, user);
      setLayoutToDelete(null);
    }
  };

  const openEdit = (layout: TypedLayoutWithUser) => {
    setLayoutToEdit(layout.id);
    setSettingsOpen(true);
  };

  return (
    <>
      {/* MAIN SHEET */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="transition-colors">
            <HamburgerMenuIcon className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col gap-0">
          <SheetHeader>
            <SheetTitle>Edit Layouts</SheetTitle>
            <SheetDescription>
              Manage the layouts available on your dashboard.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">
              <h2>My Layouts</h2>
              {layouts?.map((layout) => (
                <div
                  key={layout.id}
                  className="flex justify-between items-center p-4 bg-muted rounded-xl shadow-sm transition-colors hover:shadow-md"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold leading-tight break-words">
                      {layout.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Owner: {layout.user?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(layout.createdAt).toLocaleDateString()} • Last
                      updated {new Date(layout.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Widgets: {layout.widgets.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={layout.onDashboard}
                      onCheckedChange={(checked) =>
                        updateLayoutOnDashboard(layout.id, checked, user)
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(layout)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="max"
                      variant="ghost"
                      onClick={() => setLayoutToDelete(layout.id)}
                    >
                      <TrashIcon className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 pb-4">
              <h2>Shared Layouts</h2>
              {sharedLayoutsWithMe?.map((shareConnection: UserShare) => {
                const layout: TypedLayoutWithUser =
                  shareConnection.layout as unknown as TypedLayoutWithUser;
                if (!layout) return null;

                return (
                  <div
                    key={layout.id}
                    className="flex justify-between items-center p-4 bg-muted rounded-xl shadow-sm transition-colors hover:shadow-md"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold leading-tight break-words">
                        {layout.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Owner:{" "}
                        {layout.user?.name ??
                          shareConnection.owner.name ??
                          "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(layout.createdAt).toLocaleDateString()} • Last
                        updated{" "}
                        {new Date(layout.updatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Widgets: {layout.widgets.length}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={shareConnection.onDashboard ?? false}
                        onCheckedChange={(checked) =>
                          updateOnDashboardShared(
                            shareConnection.id,
                            checked,
                            user
                          )
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        // onClick={() => openEdit(layout)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="max"
                        variant="ghost"
                        onClick={() => setLayoutToDelete(layout.id)}
                      >
                        <TrashIcon className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <SheetFooter className="pt-4">
            <Button variant="default" onClick={handleCreate}>
              Create Layout
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* DELETE CONFIRMATION */}
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
              Are you sure you want to delete this layout? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLayoutToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SETTINGS / PERMISSIONS MODAL */}
      <LayoutSettingsModal
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setLayoutToEdit(null);
        }}
        layout={
          layoutToEdit !== null
            ? layouts?.find((l) => l.id === layoutToEdit) ?? null
            : null
        }
        owner={user}
      />
    </>
  );
};
