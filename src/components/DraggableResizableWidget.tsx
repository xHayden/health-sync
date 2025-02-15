import React, { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { Cross2Icon } from "@radix-ui/react-icons";

// Shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const [currentSize, setCurrentSize] = useState({ width, height });
  const [openConfirm, setOpenConfirm] = useState(false);

  useEffect(() => {
    setCurrentSize({ width, height });
  }, [width, height]);

  // Snap the drag transform to the grid.
  const snappedTransform = transform
    ? {
        x: Math.round(transform.x / gridSize) * gridSize,
        y: Math.round(transform.y / gridSize) * gridSize,
      }
    : { x: 0, y: 0 };

  // Compute the widget style: position absolute relative to the workspace.
  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    transform: transform
      ? `translate3d(${snappedTransform.x}px, ${snappedTransform.y}px, 0)`
      : undefined,
  };

  // Custom resize handle that also triggers the onResizeStart callback.
  const resizeHandle = (
    <span
      className="absolute bottom-[-6px] right-[-6px] w-10 h-10 cursor-se-resize flex items-end justify-end"
      onMouseDown={(e) => {
        onResizeStart && onResizeStart();
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        onResizeStart && onResizeStart();
        e.stopPropagation();
      }}
    >
      <span className="relative w-full h-full group">
        <span className="absolute -bottom-2 -right-2 w-2 h-10 bg-primary rounded-br-2xl rounded-tr-2xl rounded-tl-2xl group-hover:bg-primary/80" />
        <span className="absolute -bottom-2 -right-2 h-2 w-10 bg-primary rounded-br-2xl rounded-bl-2xl rounded-tl-2xl group-hover:bg-primary/80" />
      </span>
    </span>
  );

  return (
    <>
      {editMode ? (
        <>
          <ResizableBox
            width={currentSize.width}
            height={currentSize.height}
            minConstraints={[gridSize, gridSize]}
            handle={resizeHandle}
            draggableOpts={{ grid: [gridSize, gridSize] }}
            onResizeStart={onResizeStart}
            onResizeStop={(event, { size }) => {
              setCurrentSize(size);
              onResizeStop(size.width, size.height);
            }}
            style={style as any}
          >
            <div
              ref={setNodeRef}
              {...listeners}
              {...attributes}
              className="relative w-full h-full bg-background border rounded shadow"
            >
              {/* Remove (X) button */}
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenConfirm(true);
                }}
                className="absolute text-xs top-0 right-0 z-50 bg-gray-800 text-white p-1 rounded-full m-1 w-5 h-5 flex items-center justify-center hover:bg-gray-900 transition-colors duration-200"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
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
                <Button
                  variant="secondary"
                  onClick={() => setOpenConfirm(false)}
                >
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
        </>
      ) : (
        <div style={{...style, width: currentSize.width, height: currentSize.height}}>
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="relative w-full h-full bg-background border rounded shadow"
        >
            {children}
          </div>
        </div>
      )}
    </>
  );
};

export default DraggableResizableWidget;
