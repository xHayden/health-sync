import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";
import { DBLayout, Widget } from "@/types/WidgetData";
import { WidgetType, DataTypes } from "@/types/WidgetDataEnums";
import { Session } from "next-auth";

interface LayoutStateStore {
  // Layout state
  layouts?: DBLayout[];
  currentLayout?: DBLayout;
  originalLayout?: DBLayout;
  hasLayoutChanged: boolean;
  setLayouts: (layouts: DBLayout[]) => void;
  setCurrentLayout: (layout: DBLayout) => void;
  updateCurrentLayoutWidgets: (widgets: Widget[]) => void;
  createLayout: (user: Session["user"]) => Promise<void>;
  saveLayout: (
    id: number,
    widgets: Widget[],
    user: Session["user"],
    updateCurrentLayout?: boolean
  ) => Promise<void>;
  switchLayout: (layoutId: number, user: Session["user"]) => void;
  deleteLayout: (id: number, user: Session["user"]) => Promise<void>;
  // Widget state
  widgets: Widget[];
  isInteracting: boolean;
  gridSize: number;
  gridOffset: number;
  setWidgets: (widgets: Widget[]) => void;
  removeWidget: (id: number) => void;
  updateWidgetPosition: (id: number, deltaX: number, deltaY: number) => void;
  updateWidgetSize: (id: number, width: number, height: number) => void;
  createWidget: (widgetType: WidgetType) => void;
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
  // When setting a layout, update widgets and mark no changes.
  setCurrentLayout: (layout) =>
    set({
      currentLayout: layout,
      originalLayout: layout,
      hasLayoutChanged: false,
      widgets: layout.layout?.widgets ?? [],
    }),
  // Updates the widgets in currentLayout and recalculates if the layout has changed.
  updateCurrentLayoutWidgets: (widgets) => {
    const currentLayout = get().currentLayout;
    if (currentLayout) {
      const originalWidgets = get().originalLayout?.layout?.widgets ?? [];
      const changed = calculateHasChanged(widgets, originalWidgets);
      const updatedLayout = { ...currentLayout, layout: { widgets } };
      set({ currentLayout: updatedLayout, widgets, hasLayoutChanged: changed });
    }
  },
  createLayout: async (user) => {
    try {
      const userId = user.id;
      const response = await axios.post("/api/v1/layouts", {
        layout: { widgets: [] },
        userId,
      });
      const newLayout = response.data;
      console.log(newLayout);
      set({
        currentLayout: newLayout,
        originalLayout: newLayout,
        hasLayoutChanged: false,
        layouts: [...(get().layouts ?? []), newLayout],
        widgets: newLayout.layout?.widgets ?? [],
      });
    } catch (error) {
      console.error("Error creating new layout", error);
    }
  },
  deleteLayout: async (id: number, user) => {
    try {
      const userId = user.id;
      const response = await axios.delete(`/api/v1/layouts?id=${id}&userId=${userId}`);
      if (response.status === 200) {
        const newLayouts = get().layouts?.filter((layout) => layout.id !== id);
        set({
          layouts: newLayouts,
        });
        if (get().currentLayout?.id === id) {
          if (newLayouts && newLayouts.length > 0) {
            get().switchLayout(newLayouts[newLayouts.length - 1].id, user);
          } else {
            // If there are no layouts left, create a new one.
            get().createLayout(user);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting layout", error);
    }
  },
  saveLayout: async (id, widgets, user, updateCurrentLayout = true) => {
    try {
      const userId = user.id;
      const updatedLayout = { widgets };
      const response = await axios.patch("/api/v1/layouts", {
        userId,
        id,
        ...updatedLayout,
      });
      if (
        response.status === 200 &&
        updateCurrentLayout &&
        response.data.id === get().currentLayout?.id
      ) {
        set({
          currentLayout: response.data,
          originalLayout: response.data,
          layouts: get().layouts?.map((layout) =>
            layout.id === response.data.id ? response.data : layout
          ),
          hasLayoutChanged: false,
          widgets: response.data.layout?.widgets ?? [],
        });
      }
      toast.success("Layout saved", { position: "top-center", duration: 1200 });
    } catch (error) {
      console.error("Error saving layout", error);
    }
  },
  switchLayout: (layoutId, user) => {
    const { currentLayout, layouts, hasLayoutChanged, saveLayout } = get();
    if (currentLayout && hasLayoutChanged) {
      // Save the current layout before switching if there are unsaved changes.
      saveLayout(currentLayout.id, currentLayout.layout?.widgets || [], user, false);
      set({ hasLayoutChanged: false });
    }
    if (layouts) {
      const selectedLayout = layouts.find((layout: DBLayout) => layout.id === layoutId);
      if (selectedLayout) {
        set({
          currentLayout: selectedLayout,
          originalLayout: selectedLayout,
          hasLayoutChanged: false,
          widgets: selectedLayout.layout?.widgets ?? [],
        });
      }
    }
  },
  // Widget state
  widgets: [],
  isInteracting: false,
  gridSize: 50,
  gridOffset: 25,
  setWidgets: (widgets) => set({ widgets }),
  removeWidget: (id) =>
    set((state) => ({
      widgets: state.widgets.filter((widget) => widget.id !== id),
    })),
  updateWidgetPosition: (id, deltaX, deltaY) => {
    set((state) => {
      const newWidgets = state.widgets.map((widget) => {
        if (widget.id === id) {
          let newX = widget.x + deltaX;
          let newY = widget.y + deltaY;
          if (newX < 0) newX = 0;
          if (newY < 0) newY = 0;
          return { ...widget, x: newX, y: newY };
        }
        return widget;
      });
      const originalWidgets = state.originalLayout?.layout?.widgets ?? [];
      const changed = calculateHasChanged(newWidgets, originalWidgets);
      return {
        widgets: newWidgets,
        currentLayout: state.currentLayout
          ? { ...state.currentLayout, layout: { widgets: newWidgets } }
          : state.currentLayout,
        hasLayoutChanged: changed,
      };
    });
  },
  updateWidgetSize: (id, width, height) => {
    set((state) => {
      const newWidgets = state.widgets.map((widget) =>
        widget.id === id ? { ...widget, width, height } : widget
      );
      const originalWidgets = state.originalLayout?.layout?.widgets ?? [];
      const changed = calculateHasChanged(newWidgets, originalWidgets);
      return {
        widgets: newWidgets,
        currentLayout: state.currentLayout
          ? { ...state.currentLayout, layout: { widgets: newWidgets } }
          : state.currentLayout,
        hasLayoutChanged: changed,
      };
    });
  },
  createWidget: (widgetType) => {
    set((state) => {
      const newId =
        state.widgets.length > 0 ? Math.max(...state.widgets.map((w) => w.id)) + 1 : 1;
      const gridSize = state.gridSize;
      const defaultData: Record<DataTypes, any> = {
        [DataTypes.WorkoutSummaries]: null,
        [DataTypes.SleepSummaries]: null,
        [DataTypes.ActivityDaysLevels]: null,
      };
      const requiredData: DataTypes[] = [...widgetType.requiredData];
      const newWidget: Widget = {
        id: newId,
        type: widgetType,
        x: 25,
        y: 25,
        width: gridSize * 8,
        height: gridSize * 8,
        requiredData,
        data: defaultData,
      };
      const newWidgets = [...state.widgets, newWidget];
      const originalWidgets = state.originalLayout?.layout?.widgets ?? [];
      const changed = calculateHasChanged(newWidgets, originalWidgets);
      return {
        widgets: newWidgets,
        currentLayout: state.currentLayout
          ? { ...state.currentLayout, layout: { widgets: newWidgets } }
          : state.currentLayout,
        hasLayoutChanged: changed,
      };
    });
  },
  handleDragStart: () => set({ isInteracting: true }),
  handleDragEnd: (event) => {
    const { active, delta } = event;
    const gridSize = get().gridSize;
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
