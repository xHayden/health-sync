"use client";
import { useState, useEffect } from "react";
import { Widget, DBLayout } from "@/types/WidgetData";
import { WidgetType } from "@/types/WidgetDataEnums";
import { DataTypes } from "@/types/WidgetDataEnums";

export const useWidgets = (currentLayout?: DBLayout, updateCurrentLayoutWidgets?: (widgets: Widget[]) => void) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);
  const gridSize = 100;
  const gridOffset = gridSize / 2;

  // Update the widget state when the current layout changes.
  useEffect(() => {
    if (currentLayout) {
      setWidgets(currentLayout.layout?.widgets ?? []);
    }
  }, [currentLayout?.id]);

  useEffect(() => {
    if (updateCurrentLayoutWidgets) {
      updateCurrentLayoutWidgets(widgets);
    }
  }, [widgets]);

  const removeWidget = (id: number) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
  };

  const updateWidgetPosition = (id: number, deltaX: number, deltaY: number) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === id
          ? { ...widget, x: widget.x + deltaX, y: widget.y + deltaY }
          : widget
      )
    );
  };

  const updateWidgetSize = (id: number, width: number, height: number) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === id ? { ...widget, width, height } : widget
      )
    );
  };

  const createWidget = (widgetType: WidgetType) => {
    // Generate a new widget ID.
    const newId =
      widgets.length > 0 ? Math.max(...widgets.map((w) => w.id)) + 1 : 1;

    // Default data for each data type.
    const defaultData: Record<DataTypes, any> = {
      [DataTypes.WorkoutSummaries]: null,
      [DataTypes.SleepSummaries]: null,
      [DataTypes.ActivityDaysLevels]: null,
    };
    const requiredData: DataTypes[] = [...widgetType.requiredData];

    const newWidget: Widget = {
      id: newId,
      type: widgetType,
      x: 50,
      y: 50,
      width: gridSize * 2,
      height: gridSize * 2,
      requiredData,
      data: defaultData,
    };

    setWidgets((prevWidgets) => [...prevWidgets, newWidget]);
  };

  const handleDragStart = () => {
    setIsInteracting(true);
  };

  const handleDragEnd = (event: any) => {
    const { active, delta } = event;
    const snappedDeltaX = Math.round(delta.x / gridSize) * gridSize;
    const snappedDeltaY = Math.round(delta.y / gridSize) * gridSize;
    updateWidgetPosition(active.id, snappedDeltaX, snappedDeltaY);
    setIsInteracting(false);
  };

  const handleResizeStart = () => {
    setIsInteracting(true);
  };

  const handleResizeStop = (id: number, width: number, height: number) => {
    updateWidgetSize(id, width, height);
    setIsInteracting(false);
  };

  return {
    widgets,
    setWidgets,
    isInteracting,
    gridSize,
    gridOffset,
    removeWidget,
    updateWidgetPosition,
    updateWidgetSize,
    createWidget,
    handleDragStart,
    handleDragEnd,
    handleResizeStart,
    handleResizeStop,
  };
};
