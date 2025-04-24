"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Session } from "next-auth";
import { useLayoutStore } from "@/lib/store/layoutStore";
import { createSharedDataOptions } from "@/lib/sharedDataOptions";
import { TypedLayout, TypedLayoutWithUser } from "@/types/WidgetData";
import { useSharingStore } from "@/lib/store/sharedLayoutStore";
import { useSearchUsers, useUsers } from "@/hooks/useUsers";
import { SharedDataOptions } from "@/types/WidgetData";
import { PermissionType, Prisma, SharedLayoutDataScope } from "@prisma/client";
import { Cross2Icon, Pencil2Icon } from "@radix-ui/react-icons";

interface LayoutSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: TypedLayoutWithUser | null;
  owner: Session["user"];
}

/**
 * Local UI permission choice can include a sentinel "NONE" that isn't part of PermissionType.
 */
export type PermChoice = PermissionType | "NONE";

export const LayoutSettingsModal = ({
  open,
  onOpenChange,
  layout,
  owner,
}: LayoutSettingsModalProps) => {
  const updateLayoutName = useLayoutStore((state) => state.updateLayoutName);
  const [newLayoutName, setNewLayoutName] = useState(layout?.name ?? "");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Sync incoming layout name to local state when modal re‑opens for a new layout
  useEffect(() => {
    if (layout) setNewLayoutName(layout.name ?? "");
  }, [layout]);

  const handleSaveLayoutName = () => {
    if (!layout) return;
    if (newLayoutName.trim() && newLayoutName.trim() !== layout.name) {
      updateLayoutName(layout.id, newLayoutName.trim(), owner);
    }
    onOpenChange(false);
  };

  if (!layout) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Layout Settings</DialogTitle>
            <DialogDescription>
              Change the name or manage who has access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* NAME */}
            <div>
              <Label htmlFor="layoutName">Name</Label>
              <Input
                id="layoutName"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveLayoutName()}
              />
            </div>

            {/* SHARING */}
            <div>
              <h4 className="text-sm font-medium mb-2">Shared With</h4>
              <div className="flex flex-col gap-2">
                <SharedWithList layoutId={layout.id} user={owner} />
                <Button
                  variant="outline"
                  onClick={() => setShareModalOpen(true)}
                >
                  Share
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSaveLayoutName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareLayoutModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        layoutId={layout.id}
        owner={owner}
        sharedDataOptions={createSharedDataOptions(layout as TypedLayout)}
      />
    </>
  );
};

// --------------------------------------------------
// ShareLayoutModal
// --------------------------------------------------

interface ShareLayoutModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  layoutId: number | undefined;
  owner: Session["user"];
  sharedDataOptions: SharedDataOptions;
}

function PermissionSelector({
  value,
  onChange,
}: {
  value: PermChoice;
  onChange: (v: PermChoice) => void;
}) {
  const options: PermChoice[] = [
    PermissionType.READ,
    PermissionType.WRITE,
    "NONE",
  ];

  return (
    <div className="flex rounded overflow-hidden border divide-x text-sm select-none">
      {options.map((opt) => (
        <button
          key={opt}
          className={`px-3 py-1 focus:outline-none transition-colors duration-150 ${
            value === opt
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          } ${opt === "NONE" && value === opt ? "text-destructive" : ""}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ShareLayoutModal({
  open,
  onOpenChange,
  layoutId,
  owner,
  sharedDataOptions,
}: ShareLayoutModalProps) {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { shareLayout } = useSharingStore();

  const { data: allUsers, isLoading: allLoading } = useUsers();
  const { data: searchUsers, isLoading: searchLoading } = useSearchUsers(
    { name: query.trim(), email: query.trim() },
    Boolean(query.trim())
  );
  const candidateUsers = query.trim() ? searchUsers : allUsers;
  const loading = query.trim() ? searchLoading : allLoading;

  // Build items for permission matrix
  const permissionItems = useMemo(() => {
    type Item = {
      key: string;
      label: string;
      resourceType: string;
      resourceId: number | null;
      group: string;
    };

    const required: Item[] = sharedDataOptions.requiredData.map((d) => ({
      key: `req:${d}`,
      label: d,
      resourceType: d,
      resourceId: null,
      group: "Required Data",
    }));

    const dataSources: Item[] = sharedDataOptions.dataSources.map((ds) => ({
      key: `ds:${ds.id}`,
      label: ds.name,
      resourceType: ds.source,
      resourceId: Number(ds.id),
      group: ds.source,
    }));

    return [...required, ...dataSources];
  }, [sharedDataOptions]);

  // Local permission state (default NONE)
  const [permissions, setPermissions] = useState<Record<string, PermChoice>>(
    () =>
      permissionItems.reduce((acc, item) => {
        acc[item.key] = "NONE";
        return acc;
      }, {} as Record<string, PermChoice>)
  );

  const updatePermission = (key: string, value: PermChoice) =>
    setPermissions((prev) => ({ ...prev, [key]: value }));

  const groupedItems = useMemo(() => {
    return permissionItems.reduce<Record<string, typeof permissionItems>>(
      (acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
      },
      {} as Record<string, typeof permissionItems>
    );
  }, [permissionItems]);

  const buildScopes = (): SharedLayoutDataScope[] => {
    if (!layoutId) return [];
    return permissionItems
      .filter((it) => permissions[it.key] !== "NONE")
      .map((it) => ({
        id: 0, // placeholder
        sharedLayoutId: layoutId,
        resourceType: it.resourceType,
        resourceId: it.resourceId ?? null,
        permissions: [permissions[it.key] as PermissionType],
      }));
  };

  const handleShare = async () => {
    if (!selectedUserId || !layoutId) return;
    const scopes = buildScopes();
    await shareLayout({
      ownerId: owner.id,
      layoutId,
      sharedUserId: selectedUserId,
      scopes,
    });
    onOpenChange(false);
    setQuery("");
    setSelectedUserId(null);
  };

  if (!layoutId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Layout</DialogTitle>
          <DialogDescription>
            Enter an email or name to give someone view or edit access to data
            on this layout.
          </DialogDescription>
        </DialogHeader>

        {/* USER SEARCH */}
        <div className="space-y-4 mt-2">
          <Input
            type="text"
            placeholder="Email or name…"
            className="w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {!loading && candidateUsers && candidateUsers.length > 0 && (
            <ul className="max-h-40 overflow-y-auto divide-y rounded border">
              {candidateUsers.map((u: any) => (
                <li
                  key={u.id}
                  className={`p-2 cursor-pointer flex justify-between items-center hover:bg-accent ${
                    selectedUserId === u.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <span className="font-medium truncate">
                    {u.name ?? u.email}
                  </span>
                  {u.email && u.name && (
                    <span className="ml-1 text-muted-foreground">
                      ({u.email})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!loading && candidateUsers?.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </div>

        {/* PERMISSIONS MATRIX */}
        <div className="space-y-6 mt-6">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold mb-2 first:mt-0">{group}</h4>
              <ul className="divide-y rounded border bg-muted/20">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between p-2"
                  >
                    <span
                      className={`truncate ${
                        permissions[item.key] === "NONE"
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {item.label}
                    </span>
                    <PermissionSelector
                      value={permissions[item.key]}
                      onChange={(v) => updatePermission(item.key, v)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedUserId} onClick={handleShare}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SharedWithList({
  layoutId,
  user,
}: {
  layoutId: number;
  user: Session["user"];
}) {
  const {
    sharesByLayout,
    fetchSharesForLayout,
    revokeShare,
    loading: { owner: loadingOwner },
  } = useSharingStore();

  useEffect(() => {
    if (!sharesByLayout[layoutId]) {
      fetchSharesForLayout(user.id, layoutId);
    }
  }, [layoutId, sharesByLayout, user.id]);

  const shares = sharesByLayout[layoutId] ?? [];
  const loading = loadingOwner;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (shares.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No users have access yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {shares.map(
        (
          share: Prisma.SharedLayoutGetPayload<{
            include: { sharedUser: true };
          }>
        ) => (
          <div
            key={share.id}
            className="flex items-center justify-between rounded border p-2"
          >
            <span className="text-sm truncate">{share?.sharedUser?.email}</span>
            <div className="flex space-x-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => revokeShare(share.id, layoutId)}
              >
                <Cross2Icon className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  /* TODO: open scope‑editing UI */
                }}
              >
                <Pencil2Icon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
