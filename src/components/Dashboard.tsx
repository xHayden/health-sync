"use client";

import React from "react";
import { DndContext } from "@dnd-kit/core";
import "react-resizable/css/styles.css";
import DraggableResizableWidget from "./DraggableResizableWidget";
import WidgetSearchModal from "./WidgetSearchModal";
import WidgetDisplay from "./WidgetDisplay";
import { useWidgetContext } from "./LayoutContext";

const Dashboard = ({ editMode = false }: { editMode?: boolean }) => {
  const userId = 1;
  const {
    widgets,
    isInteracting,
    gridSize,
    gridOffset,
    removeWidget,
    handleDragStart,
    handleDragEnd,
    handleResizeStart,
    handleResizeStop,
    createWidget,
  } = useWidgetContext();

  // Grid overlay style visible during interactions.
  const gridBackgroundStyle = isInteracting
    ? {
        backgroundColor: "rgba(243, 244, 246, 0.5)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundImage: `
          linear-gradient(to right, #ccc 1px, transparent 1px),
          linear-gradient(to bottom, #ccc 1px, transparent 1px)
        `,
        backgroundPosition: `${gridOffset}px ${gridOffset}px`,
        pointerEvents: "none",
      }
    : {};

  return (
    <div className="relative min-h-screen">
      {editMode ? (
        <div
          className="absolute inset-0 z-0"
          style={gridBackgroundStyle as React.CSSProperties}
        />
      ) : (
        <></>
      )}

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="absolute inset-0">
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
                <WidgetDisplay widget={widget} userId={userId} />
              </div>
            </DraggableResizableWidget>
          ))}
        </div>
      </DndContext>
      {editMode ? (
        <WidgetSearchModal createWidget={createWidget} />
      ) : (
        <></>
      )}
    </div>
  );
};

export default Dashboard;
