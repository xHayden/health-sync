import { useState, useEffect } from "react";
import { useCreateLayout, useLayouts, useUpdateLayout } from "./useLayouts";
import { DBLayout, Widget } from "@/types/WidgetData"; // adjust the path if needed

export const useLayoutBar = (userId: number, enabled: boolean) => {
  const { data: layouts, isLoading, error } = useLayouts(userId, enabled);
  const createLayoutMutation = useCreateLayout(userId);
  const updateLayoutMutation = useUpdateLayout(userId);
  
  const [currentLayout, setCurrentLayout] = useState<DBLayout | undefined>();
  const [originalLayout, setOriginalLayout] = useState<DBLayout | undefined>();
  const [hasLayoutChanged, setHasLayoutChanged] = useState(false);

  // When layouts are loaded, default to the first available layout if none is selected.
  useEffect(() => {
    if (layouts && layouts.length > 0 && !currentLayout) {
      setCurrentLayout(layouts[0]);
      setOriginalLayout(layouts[0]);
    }
  }, [layouts, currentLayout]);

  useEffect(() => {
    if (currentLayout && originalLayout && currentLayout.id == originalLayout.id) {
      const originalWidgets = originalLayout.layout?.widgets || [];
      const currentWidgets = currentLayout.layout?.widgets || [];
      if (JSON.stringify(currentWidgets) !== JSON.stringify(originalWidgets)) {
        setHasLayoutChanged(true);
      } else {
        setHasLayoutChanged(false);
      }
    }
  }, [currentLayout, originalLayout]);

  const saveLayout = (id: number, widgets: Widget[], updateCurrentLayout: boolean = true) => {
    const updatedLayout = {
      id: id,
      widgets: widgets,
    };

    // Use the mutation's onSuccess to update the original layout once saved.
    updateLayoutMutation.mutate(updatedLayout, {
      onSuccess: (data) => {
        if (updateCurrentLayout && data.data.id == currentLayout?.id) {
          setCurrentLayout(data.data);
          setOriginalLayout(data.data);
          setHasLayoutChanged(false);
        }
      },
    });
  };

  const updateCurrentLayout = (layout: DBLayout) => {
    setCurrentLayout(layout);
    setOriginalLayout(layout);
  };

  const updateCurrentLayoutWidgets = (widgets: Widget[]) => {
    if (currentLayout) {
      setCurrentLayout({ ...currentLayout, layout: { widgets } });
    }
  };

  const createNewLayout = () => {
    createLayoutMutation.mutate(
      {
        layout: {
          widgets: [],
        },
        userId: userId,
      },
      {
        onSuccess: (data) => {
          setCurrentLayout(data.data);
          setOriginalLayout(data.data);
        },
      }
    );
  };

  const switchLayout = (layoutId: number) => {
    if (currentLayout && hasLayoutChanged) {
      saveLayout(currentLayout.id, currentLayout.layout?.widgets || [], false);
      setHasLayoutChanged(false);
    }
    if (layouts) {
      const selectedLayout = layouts.find(
        (layout: DBLayout) => layout.id === layoutId
      );
      if (selectedLayout) {
        setCurrentLayout(selectedLayout);
        setOriginalLayout(selectedLayout); // switch layout will also set the original layout
      }
    }
  };

  return {
    layouts,
    currentLayout,
    switchLayout,
    isLoading,
    error,
    createNewLayout,
    saveLayout,
    updateCurrentLayout,
    updateCurrentLayoutWidgets,
    hasLayoutChanged,
  };
};
