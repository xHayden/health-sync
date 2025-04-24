import React, {
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DataSourceManagerDialog from "./DataSourceManagerDialog";
import { DropdownDataSource } from "./DropdownDataSource";
import widgetRegistry from "@/lib/widgetRegistry";
import { Widget } from "@/types/WidgetData";
import WidgetDisplay from "./WidgetDisplay";
import { Session } from "next-auth";
import { useLayoutStore } from "@/lib/store/layoutStore";

export interface DraggableResizableWidgetProps {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  gridSize: number;
  editMode: boolean;
  onResizeStop: (w: number, h: number) => void;
  onResizeStart?: () => void;
  onRemove: () => void;
  widget: Widget;
  user: Session["user"];
}

const WidgetOptionsMenu = ({
  onSettingsClick,
}: {
  onSettingsClick: (e: React.MouseEvent) => void;
}) => (
  <div className="absolute top-0 right-0 z-50 m-3">
    <Button
      className="bg-secondary text-secondary-foreground border-secondary-foreground border hover:bg-primary hover:text-primary-foreground transition-colors duration-200 rounded-4xl"
      onClick={onSettingsClick}
    >
      Settings
    </Button>
  </div>
)
;
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
  /* Drag / Resize */
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: !editMode,
  });
  const [currentSize, setCurrentSize] = useState({ width, height });
  useEffect(() => {
    setCurrentSize({ width, height });
  }, [width, height]);

  const snappedTransform = useMemo(
    () =>
      transform
        ? {
            x: Math.round(transform.x / gridSize) * gridSize,
            y: Math.round(transform.y / gridSize) * gridSize,
          }
        : { x: 0, y: 0 },
    [transform, gridSize]
  );
  const shellStyle: React.CSSProperties = useMemo(
    () => ({
      position: "absolute",
      left: x,
      top: y,
      padding: "0.5rem",
      transform: transform
        ? `translate3d(${snappedTransform.x}px, ${snappedTransform.y}px, 0)`
        : undefined,
    }),
    [x, y, transform, snappedTransform]
  );

  /* Dropdown settings & values */
  const dropdownSettings = useMemo(
    () => widget.settings.filter((s) => s.type === "dropdown"),
    [widget.settings]
  );
  const [dropdownValues, setDropdownValues] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        dropdownSettings.map((s) => [
          s.key,
          (s.value ?? s.defaultValue ?? "").toString(),
        ])
      )
  );
  useEffect(() => {
    setDropdownValues((prev) => {
      const next = { ...prev };
      dropdownSettings.forEach((s) => {
        if (!(s.key in next)) next[s.key] = "";
      });
      return next;
    });
  }, [dropdownSettings]);

  /* Resize handle */
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
          onResizeStart?.();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          onResizeStart?.();
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

  /* Manage dialog state */
  const [manageSource, setManageSource] = useState<string | null>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);

  const handleResizeStop = useCallback(
    (_e: any, { size }: { size: { width: number; height: number } }) => {
      setCurrentSize(size);
      onResizeStop(size.width, size.height);
    },
    [onResizeStop]
  );

  const handleSaveSettings = useCallback(() => {
    const newSettings = widget.settings.map((setting) => {
      if (setting.type === "dropdown") {
        return {
          ...setting,
          value: dropdownValues[setting.key],
        } as typeof setting;
      }
      const el = document.getElementById(
        setting.key
      ) as HTMLInputElement | null;
      if (!el) return setting;
      if (setting.type === "boolean") {
        const checked =
          el.getAttribute("aria-checked") === "true" || el.checked === true;
        return { ...setting, value: checked };
      }
      if (setting.type === "number") {
        return { ...setting, value: Number(el.value) };
      }
      return { ...setting, value: el.value };
    });
    const { updateWidgetSettings, currentLayout, saveLayout } =
      useLayoutStore.getState();
    // @ts-ignore
    updateWidgetSettings(widget.id, newSettings);
    if (currentLayout) saveLayout(currentLayout.id, user);
    setOpenSettings(false);
  }, [dropdownValues, widget, user]);

  type WidgetRegistryKeys = keyof typeof widgetRegistry;
  const meta = widgetRegistry[widget.type as WidgetRegistryKeys];

  if (!user) return <></>;

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
          style={shellStyle}
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

        <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Removal</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this widget? This action cannot be undone.
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

        <Dialog open={openSettings} onOpenChange={setOpenSettings}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Widget Settings</DialogTitle>
              <DialogDescription>Configure {meta.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {widget.settings.map((setting) => (
                <div key={setting.key} className="flex flex-col space-y-1">
                  <Label htmlFor={setting.key} className="text-sm font-medium">
                    {setting.label}
                  </Label>

                  {setting.type === "boolean" && (
                    <Checkbox
                      id={setting.key}
                      defaultChecked={
                        (setting.value ?? setting.defaultValue) === "true"
                      }
                    />
                  )}

                  {setting.type === "text" && (
                    <Input
                      id={setting.key}
                      type="text"
                      defaultValue={
                        (setting.value ?? setting.defaultValue) as string
                      }
                    />
                  )}

                  {setting.type === "number" && (
                    <Input
                      id={setting.key}
                      type="number"
                      defaultValue={
                        (setting.value ?? setting.defaultValue) as number
                      }
                    />
                  )}

                  {setting.type === "select" && (
                    <Select
                      defaultValue={
                        (setting.value ?? setting.defaultValue) as string
                      }
                    >
                      <SelectTrigger id={setting.key}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(setting as any).options.map((o: any) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {setting.type === "color" && (
                    <Input
                      id={setting.key}
                      className="w-12 h-8"
                      type="color"
                      defaultValue={
                        (setting.value ?? setting.defaultValue) as string
                      }
                    />
                  )}

                  {setting.type === "dropdown" && (
                    <DropdownDataSource
                      source={setting.source!}
                      userId={user.id}
                      value={dropdownValues[setting.key]}
                      onChange={(val: any) =>
                        setDropdownValues((prev) => ({
                          ...prev,
                          [setting.key]: val,
                        }))
                      }
                      onManage={() => setManageSource(setting.source!)}
                    />
                  )}

                  {setting.description && (
                    <small className="text-xs text-muted-foreground">
                      {setting.description}
                    </small>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="pt-4">
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

        <DataSourceManagerDialog
          source={manageSource ?? ""}
          userId={user.id}
          open={manageSource !== null}
          onOpenChange={(v) => (v ? null : setManageSource(null))}
        />
      </>
    );
  }

  /* View mode */
  return (
    <div
      style={{
        ...shellStyle,
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
};

export default React.memo(DraggableResizableWidget);
