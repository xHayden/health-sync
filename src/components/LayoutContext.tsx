"use client";

import React, { createContext, useContext } from "react";
import { useLayoutBar as useLayoutBarHook } from "@/hooks/useLayoutBar";
import { useWidgets } from "@/hooks/useWidgets";
import { DBLayout, Widget } from "@/types/WidgetData";

interface LayoutContextProps {
  layouts: DBLayout[] | undefined;
  currentLayout: DBLayout | undefined;
  hasLayoutChanged: boolean;
  switchLayout: (id: number) => void;
  updateCurrentLayout: (layout: DBLayout) => void;
  createNewLayout: () => void;
  saveLayout: (id: number, widgets: Widget[]) => void;
  isLoading: boolean;
  error: unknown;
}

interface WidgetContextProps {
  widgets: Widget[];
  isInteracting: boolean;
  gridSize: number;
  gridOffset: number;
  removeWidget: (id: number) => void;
  updateWidgetPosition: (id: number, deltaX: number, deltaY: number) => void;
  updateWidgetSize: (id: number, width: number, height: number) => void;
  createWidget: (widgetType: any) => void;
  handleDragStart: () => void;
  handleDragEnd: (event: any) => void;
  handleResizeStart: () => void;
  handleResizeStop: (id: number, width: number, height: number) => void;
}

const LayoutContext = createContext<LayoutContextProps | undefined>(undefined);
const WidgetContext = createContext<WidgetContextProps | undefined>(undefined);

export const LayoutProvider = ({
  userId,
  enabled,
  children,
}: {
  userId: number;
  enabled: boolean;
  children: React.ReactNode;
}) => {
  const layoutState = useLayoutBarHook(userId, enabled);
  const widgetState = useWidgets(layoutState.currentLayout, layoutState.updateCurrentLayoutWidgets);
  return (
    <LayoutContext.Provider value={layoutState}>
      <WidgetContext.Provider value={widgetState}>
        {children}
      </WidgetContext.Provider>
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext must be used within a LayoutProvider");
  }
  return context;
};

export const useWidgetContext = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidgetContext must be used within a LayoutProvider");
  }
  return context;
};

export default LayoutProvider;