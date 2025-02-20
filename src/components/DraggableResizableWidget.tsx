import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import widgetRegistry, {
  SelectWidgetSetting,
  WidgetMeta,
  WidgetSetting,
  WidgetValue,
} from "@/lib/widgetRegistry";
import { Widget } from "@/types/WidgetData";
import WidgetDisplay from "./WidgetDisplay";
import { Session } from "next-auth";
import { useStore } from "@/lib/store/layoutStore";

export type DraggableResizableWidgetProps = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  gridSize: number;
  editMode: boolean;
  onResizeStop: (width: number, height: number) => void;
  onResizeStart?: () => void;
  onRemove: () => void;
  widget: Widget;
  user: Session["user"];
};

const WidgetOptionsMenu: React.FC<{
  onSettingsClick: (e: React.MouseEvent) => void;
}> = React.memo(({ onSettingsClick }) => {
  return (
    <div className="absolute top-0 right-0 z-50 m-3">
      <Button
        className="bg-secondary text-secondary-foreground border-secondary-foreground border hover:bg-primary hover:text-primary-foreground transition-colors duration-200 rounded-4xl"
        onClick={onSettingsClick}
      >
        Settings
      </Button>
    </div>
  );
});

const DraggableResizableWidget: React.FC<DraggableResizableWidgetProps> = ({
  id,
  x,
  y,
  width,
  height,
  gridSize,
  onResizeStop,
  onResizeStart,
  onRemove,
  editMode,
  widget,
  user,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: !editMode,
  });
  const [currentSize, setCurrentSize] = useState({ width, height });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    setCurrentSize({ width, height });
  }, [width, height]);

  const snappedTransform = useMemo(() => {
    if (!transform) return { x: 0, y: 0 };
    return {
      x: Math.round(transform.x / gridSize) * gridSize,
      y: Math.round(transform.y / gridSize) * gridSize,
    };
  }, [transform, gridSize]);

  const style = useMemo(
    () => ({
      position: "absolute" as const,
      left: x,
      top: y,
      padding: "0.5rem",
      transform: transform
        ? `translate3d(${snappedTransform.x}px, ${snappedTransform.y}px, 0)`
        : undefined,
    }),
    [x, y, transform, snappedTransform]
  );

  const resizeHandle = useMemo(
    () => (
      <span
        className="group absolute bottom-4 right-4 cursor-se-resize group-hover:[--handle-color:#ccc]"
        style={{
          ["--handle-size" as string]: "3.5rem",
          ["--handle-border" as string]: "4px",
          ["--handle-color" as string]: "var(--primary)",
          width: "var(--handle-size)",
          height: "var(--handle-size)",
        }}
        onMouseDown={(e) => {
          onResizeStart && onResizeStart();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          onResizeStart && onResizeStart();
          e.stopPropagation();
        }}
      >
        <span
          className="block w-full h-full rounded-full transition-colors duration-200"
          style={{
            background: `conic-gradient(
              from 270deg,
              transparent 0deg 180deg,
              var(--handle-color) 180deg 270deg,
              transparent 270deg 360deg
            )`,
            WebkitMask: `radial-gradient(
              circle at center,
              transparent calc(var(--handle-size) / 2 - var(--handle-border)),
              white calc(var(--handle-size) / 2 - var(--handle-border))
            )`,
            mask: `radial-gradient(
              circle at center,
              transparent calc(var(--handle-size) / 2 - var(--handle-border)),
              white calc(var(--handle-size) / 2 - var(--handle-border))
            )`,
          }}
        />
      </span>
    ),
    [onResizeStart]
  );

  const handleResizeStop = useCallback(
    (event: any, { size }: { size: { width: number; height: number } }) => {
      setCurrentSize(size);
      onResizeStop(size.width, size.height);
    },
    [onResizeStop]
  );

  // Save settings by updating the "value" property (not defaultValue)
  const handleSaveSettings = useCallback(() => {
    // TODO: Add check to ensure that the settings are valid.
    const newSettings = widget.settings.map((setting) => {
      const input = document.getElementById(
        setting.key
      ) as HTMLInputElement | null;
      if (!input) return setting;
      let newValue;
      if (setting.type === "boolean") {
        newValue = input.ariaChecked; // not sure why this needs to be ariaChecked
      } else if (setting.type === "number") {
        newValue = Number(input.value);
      } else {
        newValue = input.value;
      }
      return { ...setting, value: newValue };
    });
    const { updateWidgetSettings, currentLayout, saveLayout } =
      useStore.getState();
    updateWidgetSettings(widget.id, newSettings as WidgetSetting[]);
    if (currentLayout) {
      saveLayout(currentLayout.id, user);
    }
    setOpenSettings(false);
  }, [widget, user]);

  if (editMode) {
    return (
      <>
        <ResizableBox
          width={currentSize.width}
          height={currentSize.height}
          minConstraints={[gridSize, gridSize]}
          handle={resizeHandle}
          draggableOpts={{ grid: [gridSize, gridSize] }}
          onResizeStart={onResizeStart}
          onResizeStop={handleResizeStop}
          style={style}
        >
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="relative w-full h-full bg-background border-2 border-muted-foreground rounded-4xl shadow"
          >
            <WidgetOptionsMenu
              onSettingsClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenSettings(true);
              }}
            />
            <div className="w-full h-full flex items-center justify-center">
              <WidgetDisplay widget={widget} user={user} />
            </div>
          </div>
        </ResizableBox>

        {/* Confirm Removal Dialog */}
        <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Removal</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this widget?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onRemove();
                  setOpenConfirm(false);
                }}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog with Save Settings option */}
        <Dialog open={openSettings} onOpenChange={setOpenSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Widget Settings</DialogTitle>
              <DialogDescription>
                (Configure settings for{" "}
                {widgetRegistry[widget.type as WidgetValue].name})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {widget.settings?.map((setting: WidgetSetting) => {
                return (
                  <div key={setting.key} className="flex flex-col space-y-1">
                    <Label
                    htmlFor={setting.key}
                    className="text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    {setting.label}
                  </Label>
                  {setting.type === "boolean" ? (
                    <Checkbox
                      id={setting.key}
                      defaultChecked={
                        (typeof setting.value !== "undefined"
                          ? setting.value === "true"
                          : setting.defaultValue === "true") as boolean
                      }
                    />
                  ) : setting.type === "text" ? (
                    <Input
                      id={setting.key}
                      type="text"
                      defaultValue={
                        (setting.value as string) ??
                        (setting.defaultValue as string)
                      }
                    />
                  ) : setting.type === "number" ? (
                    <Input
                      id={setting.key}
                      type="number"
                      defaultValue={
                        (setting.value as number) ??
                        (setting.defaultValue as number)
                      }
                    />
                  ) : setting.type === "select" ? (
                    <Select
                      defaultValue={
                        (setting.value as string) ??
                        (setting.defaultValue as string)
                      }
                    >
                      <SelectTrigger id={setting.key}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {(setting as SelectWidgetSetting).options.map(
                          (option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  ) : setting.type === "color" ? (
                    <Input
                      id={setting.key}
                      className="w-12 h-8"
                      type="color"
                      defaultValue={
                        (setting.value as string) ??
                        (setting.defaultValue as string)
                      }
                    />
                  ) : null}
                  {setting.description && (
                    <small className="text-xs text-muted-foreground">
                      {setting.description}
                    </small>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="default" onClick={handleSaveSettings}>
                Save Settings
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onRemove();
                  setOpenSettings(false);
                }}
              >
                Delete Widget
              </Button>
              <Button
                variant="secondary"
                onClick={() => setOpenSettings(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  } else {
    return (
      <div
        style={{
          ...style,
          width: currentSize.width,
          height: currentSize.height,
        }}
      >
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="relative w-full h-full bg-background border-2 border-muted-foreground rounded-4xl shadow"
        >
          <div className="w-full h-full flex items-center justify-center">
            <WidgetDisplay widget={widget} user={user} />
          </div>
        </div>
      </div>
    );
  }
};

export default React.memo(DraggableResizableWidget);
