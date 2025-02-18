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

export type DraggableResizableWidgetProps = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  gridSize: number;
  children: React.ReactNode;
  editMode: boolean;
  onResizeStop: (width: number, height: number) => void;
  onResizeStart?: () => void;
  onRemove: () => void;
};

const WidgetOptionsMenu: React.FC<{
  onSettingsClick: (e: React.MouseEvent) => void;
  onRemoveClick: (e: React.MouseEvent) => void;
}> = React.memo(({ onSettingsClick, onRemoveClick }) => {
  return (
    <div className="absolute top-0 right-0 z-50 m-3">
      <Button
        className="bg-secondary text-secondary-foreground border-secondary-foreground border hover:bg-primary hover:text-primary-foreground transition-colors duration-200 rounded-4xl"
        onClick={onSettingsClick}
      >
        Edit
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
  children,
  onResizeStop,
  onResizeStart,
  onRemove,
  editMode,
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
          ["--handle-color" as string]: "#fff",
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
            className="relative w-full h-full bg-background border-2 border-foreground rounded-4xl shadow"
          >
            <WidgetOptionsMenu
              onSettingsClick={(e) => {
                e.stopPropagation();
                setOpenSettings(true);
              }}
              onRemoveClick={(e) => {
                e.stopPropagation();
                setOpenConfirm(true);
              }}
            />
            {children}
          </div>
        </ResizableBox>
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
        <Dialog open={openSettings} onOpenChange={setOpenSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Widget Settings</DialogTitle>
              <DialogDescription>
                Configure your widget settings below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Settings content goes here.
              </p>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenSettings(false)}>
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
        style={{ ...style, width: currentSize.width, height: currentSize.height }}
      >
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="relative w-full h-full bg-background border-2 border-foreground rounded-4xl shadow"
        >
          {children}
        </div>
      </div>
    );
  }
};

export default React.memo(DraggableResizableWidget);
