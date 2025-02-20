import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";
import { DBLayout, Widget } from "@/types/WidgetData";
import { Session } from "next-auth";
import widgetRegistry, { WidgetValue, WidgetMetaDataTypes, WidgetSetting } from "@/lib/widgetRegistry";

interface LayoutStateStore {
  // Layout state
  layouts?: DBLayout[];
  currentLayout?: DBLayout;
  originalLayout?: DBLayout;
  hasLayoutChanged: boolean;
  setLayouts: (layouts: DBLayout[]) => void;
  setCurrentLayout: (layout: DBLayout) => void;
  updateCurrentLayoutWidgets: (widgets: Widget[]) => void;
  createLayout: (user: Session["user"], name?: string) => Promise<void>;
  updateLayoutName: (
    id: number,
    name: string,
    user: Session["user"]
  ) => Promise<void>;
  saveLayout: (id: number, user: Session["user"]) => Promise<void>;
  switchLayout: (layoutId: number, user: Session["user"]) => void;
  deleteLayout: (id: number, user: Session["user"]) => Promise<void>;

  // Grid state and widget interactions
  isInteracting: boolean;
  gridSize: number;
  gridOffset: number;
  updateWidgetPosition: (id: number, deltaX: number, deltaY: number) => void;
  updateWidgetSize: (id: number, width: number, height: number) => void;
  updateWidgetSettings: (id: number, newSettings: WidgetSetting[]) => void;
  // Note: Instead of passing a widget meta, we pass the widget key.
  createWidget: (widgetKey: WidgetValue) => void;
  removeWidget: (id: number) => void;
  handleDragStart: () => void;
  handleDragEnd: (event: any) => void;
  handleResizeStart: () => void;
  handleResizeStop: (id: number, width: number, height: number) => void;
}

const calculateHasChanged = (newWidgets: Widget[], originalWidgets: Widget[]) =>
  JSON.stringify(newWidgets) !== JSON.stringify(originalWidgets);

export const useStore = create<LayoutStateStore>((set, get) => ({
  // Layout state
  layouts: undefined,
  currentLayout: undefined,
  originalLayout: undefined,
  hasLayoutChanged: false,

  setLayouts: (layouts) => set({ layouts }),

  setCurrentLayout: (layout) =>
    set({
      currentLayout: layout,
      originalLayout: layout,
      hasLayoutChanged: false,
    }),

  updateCurrentLayoutWidgets: (widgets) => {
    const { currentLayout, originalLayout } = get();
    if (currentLayout) {
      const originalWidgets = originalLayout?.widgets ?? [];
      const changed = calculateHasChanged(widgets, originalWidgets);
      set({
        currentLayout: { ...currentLayout, widgets },
        hasLayoutChanged: changed,
      });
    }
  },

  createLayout: async (user, name) => {
    try {
      const userId = user.id;
      const num = (get().layouts?.length ?? 0) + 1;
      const response = await axios.post("/api/v1/layouts", {
        widgets: [],
        userId,
        name: name ?? `Layout ${num}`,
      });
      const newLayout = response.data;
      set((state) => ({
        currentLayout: newLayout,
        originalLayout: newLayout,
        hasLayoutChanged: false,
        layouts: [...(state.layouts ?? []), newLayout],
      }));
    } catch (error) {
      console.error("Error creating new layout", error);
    }
  },

  deleteLayout: async (id, user) => {
    try {
      const userId = user.id;
      const response = await axios.delete(
        `/api/v1/layouts?id=${id}&userId=${userId}`
      );
      if (response.status === 200) {
        set((state) => {
          const newLayouts = state.layouts?.filter(
            (layout) => layout.id !== id
          );
          if (state.currentLayout?.id === id) {
            if (newLayouts && newLayouts.length > 0) {
              set({ hasLayoutChanged: false }); // Don't trigger a save.
              get().switchLayout(newLayouts[newLayouts.length - 1].id, user);
            } else {
              // If there are no layouts left, create a new one.
              get().createLayout(user);
            }
          }
          return { layouts: newLayouts };
        });
      }
    } catch (error) {
      console.error("Error deleting layout", error);
    }
  },

  saveLayout: async (id, user) => {
    try {
      const { currentLayout } = get();
      if (!currentLayout) return;
      const userId = user.id;
      const response = await axios.patch("/api/v1/layouts", {
        userId,
        id: currentLayout.id,
        widgets: currentLayout.widgets,
      });
      if (response.status === 200 && response.data.id === currentLayout.id) {
        set((state) => ({
          currentLayout: response.data,
          originalLayout: response.data,
          hasLayoutChanged: false,
          layouts: state.layouts?.map((layout) =>
            layout.id === response.data.id ? response.data : layout
          ),
        }));
      }
      toast.success(`Saved Layout: ${currentLayout.name}`, {
        position: "top-center",
        duration: 1200,
      });
    } catch (error) {
      console.error("Error saving layout", error);
    }
  },

  updateLayoutName: async (id, name, user) => {
    try {
      const userId = user.id;
      const response = await axios.patch("/api/v1/layouts", {
        userId,
        id,
        name,
      });
      if (response.status === 200) {
        set((state) => ({
          layouts: state.layouts?.map((layout) =>
            layout.id === id ? response.data : layout
          ),
        }));
      }
    } catch (error) {
      console.error("Error updating layout name", error);
    }
  },

  switchLayout: async (layoutId, user) => {
    const { currentLayout, layouts, hasLayoutChanged, saveLayout } = get();
    if (currentLayout && hasLayoutChanged) {
      // Save unsaved changes before switching.
      await saveLayout(currentLayout.id, user);
      set({ hasLayoutChanged: false });
    }
    if (layouts) {
      const selectedLayout = layouts.find(
        (layout: DBLayout) => layout.id === layoutId
      );
      if (selectedLayout) {
        set({
          currentLayout: selectedLayout,
          originalLayout: selectedLayout,
          hasLayoutChanged: false,
        });
      }
    }
  },

  // Grid state and widget interactions
  isInteracting: false,
  gridSize: 50,
  gridOffset: 25,

  updateWidgetPosition: (id, deltaX, deltaY) => {
    const { currentLayout, originalLayout, gridSize } = get();
    if (!currentLayout) return;
    const newWidgets = currentLayout.widgets.map((widget) => {
      if (widget.id === id) {
        let newX = widget.x + deltaX;
        let newY = widget.y + deltaY;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        return { ...widget, x: newX, y: newY };
      }
      return widget;
    });
    const originalWidgets = originalLayout?.widgets ?? [];
    const changed = calculateHasChanged(newWidgets, originalWidgets);
    set({
      currentLayout: { ...currentLayout, widgets: newWidgets },
      hasLayoutChanged: changed,
    });
  },

  updateWidgetSize: (id, width, height) => {
    const { currentLayout, originalLayout } = get();
    if (!currentLayout) return;
    const newWidgets = currentLayout.widgets.map((widget) =>
      widget.id === id ? { ...widget, width, height } : widget
    );
    const originalWidgets = originalLayout?.widgets ?? [];
    const changed = calculateHasChanged(newWidgets, originalWidgets);
    set({
      currentLayout: { ...currentLayout, widgets: newWidgets },
      hasLayoutChanged: changed,
    });
  },

  updateWidgetSettings: (id: number, newSettings: WidgetSetting[]) => {
    const { currentLayout, originalLayout } = get();
    if (!currentLayout) return;
    const newWidgets = currentLayout.widgets.map(widget =>
      widget.id === id ? { ...widget, settings: newSettings } : widget
    );
    const originalWidgets = originalLayout?.widgets ?? [];
    const changed = calculateHasChanged(newWidgets, originalWidgets);
    set({
      currentLayout: { ...currentLayout, widgets: newWidgets },
      hasLayoutChanged: changed,
    });
  },
  

  createWidget: (widgetKey: WidgetValue) => {
    const { currentLayout, gridSize, originalLayout } = get();
    if (!currentLayout) return;
    // Look up the widget metadata using the widget key.
    const widgetMeta = widgetRegistry[widgetKey];
    const newId =
      currentLayout.widgets.length > 0
        ? Math.max(...currentLayout.widgets.map((w) => w.id)) + 1
        : 1;
    const requiredData: WidgetMetaDataTypes[] = [...widgetMeta.requiredData];
    const newWidget: Widget = {
      id: newId,
      type: widgetKey,
      x: 25,
      y: 25,
      width: gridSize * 8,
      height: gridSize * 8,
      requiredData,
      data: {},
      settings: widgetMeta.settings,
    };
    const newWidgets = [...currentLayout.widgets, newWidget];
    const originalWidgets = originalLayout?.widgets ?? [];
    const changed = calculateHasChanged(newWidgets, originalWidgets);
    set({
      currentLayout: { ...currentLayout, widgets: newWidgets },
      hasLayoutChanged: changed,
    });
  },

  removeWidget: (id) => {
    const { currentLayout, originalLayout } = get();
    if (!currentLayout) return;
    const newWidgets = currentLayout.widgets.filter(
      (widget) => widget.id !== id
    );
    const originalWidgets = originalLayout?.widgets ?? [];
    const changed = calculateHasChanged(newWidgets, originalWidgets);
    set({
      currentLayout: { ...currentLayout, widgets: newWidgets },
      hasLayoutChanged: changed,
    });
  },

  handleDragStart: () => set({ isInteracting: true }),

  handleDragEnd: (event) => {
    const { active, delta } = event;
    const { gridSize } = get();
    const snappedDeltaX = Math.round(delta.x / gridSize) * gridSize;
    const snappedDeltaY = Math.round(delta.y / gridSize) * gridSize;
    get().updateWidgetPosition(active.id, snappedDeltaX, snappedDeltaY);
    set({ isInteracting: false });
  },

  handleResizeStart: () => set({ isInteracting: true }),

  handleResizeStop: (id, width, height) => {
    get().updateWidgetSize(id, width, height);
    set({ isInteracting: false });
  },
}));
