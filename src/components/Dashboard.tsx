"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { DndContext } from "@dnd-kit/core";
import "react-resizable/css/styles.css";
import DraggableResizableWidget from "./DraggableResizableWidget";
import WidgetDisplay from "./WidgetDisplay";
import { useStore } from "@/lib/store/layoutStore";
import { toast } from "sonner";
import { Session } from "next-auth";
import { DBLayout } from "@/types/WidgetData";

const Dashboard = ({ user, editMode = false, layouts }: { editMode?: boolean, user: Session["user"], layouts: DBLayout[] }) => {
  const widgets = useStore((state) => state.widgets);
  const isInteracting = useStore((state) => state.isInteracting);
  const gridSize = useStore((state) => state.gridSize);
  const gridOffset = useStore((state) => state.gridOffset);
  const removeWidget = useStore((state) => state.removeWidget);
  const handleDragStart = useStore((state) => state.handleDragStart);
  const handleDragEnd = useStore((state) => state.handleDragEnd);
  const handleResizeStart = useStore((state) => state.handleResizeStart);
  const handleResizeStop = useStore((state) => state.handleResizeStop);
  const createWidget = useStore((state) => state.createWidget);

  const editToastDisplayed = useRef(false);

  const gridBackgroundStyle = useMemo(() => {
    if (!isInteracting) return {};
    return {
      backgroundColor: "rgba(243, 244, 246, 0.5)",
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundImage: `
        linear-gradient(to right, #ccc 1px, transparent 1px),
        linear-gradient(to bottom, #ccc 1px, transparent 1px)
      `,
      backgroundPosition: `${gridOffset}px ${gridOffset}px`,
      pointerEvents: "none" as const,
    };
  }, [isInteracting, gridSize, gridOffset]);

  useEffect(() => {
    if (editMode) {
      if (editToastDisplayed.current) return;
      editToastDisplayed.current = true;
      setTimeout(() => {
        toast.warning(
          "Edit mode is enabled. Some widgets might not work as expected.",
          {
            duration: Infinity,
            closeButton: true,
          }
        );
      }, 0);
    }
  }, [editMode]);

  return (
    <div className="relative min-h-screen">
      {editMode && <div className="absolute inset-0 z-0" style={gridBackgroundStyle} />}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="z-0">
          {widgets.map((widget) => (
            <DraggableResizableWidget
              key={widget.id}
              id={widget.id}
              x={widget.x}
              y={widget.y}
              width={widget.width}
              height={widget.height}
              gridSize={gridSize}
              onResizeStart={handleResizeStart}
              onResizeStop={(w, h) => handleResizeStop(widget.id, w, h)}
              onRemove={() => removeWidget(widget.id)}
              editMode={editMode}
            >
              <div className="w-full h-full flex items-center justify-center">
                <WidgetDisplay widget={widget} user={user} />
              </div>
            </DraggableResizableWidget>
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default Dashboard;
