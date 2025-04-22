import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDataSource } from "@/hooks/useDataSource";

interface Props {
  source: string;
  userId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function DataSourceManagerDialog({
  source,
  userId,
  open,
  onOpenChange,
}: Props) {
  const { items, create, update, remove, isLoading } = useDataSource(
    source,
    userId
  );
  const [drafts, setDrafts] = useState<Record<number, Partial<any>>>({});
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  function handleField(id: number, field: string, value: any) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage {source}</DialogTitle>
          <DialogDescription>
            Rename items, change their underlying value, or delete them. Changes
            are saved instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {items.map((it) => {
            const draft = drafts[it.id] ?? {};
            return (
              <div
                key={it.id}
                className="grid grid-cols-[1fr_auto] items-end gap-4 border p-3 rounded-2xl"
              >
                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`name-${it.id}`}>Name</Label>
                    <Input
                      id={`name-${it.id}`}
                      defaultValue={it.label}
                      onBlur={(e) =>
                        update(it.id, { label: e.currentTarget.value })
                      }
                      onChange={(e) => handleField(it.id, "label", e.target.value)}
                    />
                  </div>
                  {typeof it.value === "number" && (
                    <div>
                      <Label htmlFor={`val-${it.id}`}>Value</Label>
                      <Input
                        id={`val-${it.id}`}
                        type="number"
                        defaultValue={it.value as number}
                        onBlur={(e) =>
                          update(it.id, { value: Number(e.currentTarget.value) })
                        }
                        onChange={(e) => handleField(it.id, "value", e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  className="h-fit"
                  onClick={() => setPendingDelete(it.id)}
                >
                  Delete
                </Button>
              </div>
            );
          })}
          <Button onClick={() => create()}>+ Add new</Button>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete confirmation nested dialog */}
      <Dialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this item? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete !== null) remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}