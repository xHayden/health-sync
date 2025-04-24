import { SharedDataOptions, TypedLayout } from "@/types/WidgetData";

export const createSharedDataOptions = (
  currentLayout: TypedLayout
): SharedDataOptions => {
  if (!currentLayout)
    return {
      requiredData: [],
      dataSources: [],
    };

  const requiredData = [
    ...new Set(
      (currentLayout?.widgets || [])
        .flatMap((widget) => widget.requiredData || [])
        .filter((item) => item != null)
    ),
  ];

  const dataSources = (currentLayout?.widgets || []).flatMap((widget) => {
    const setting = widget.settings?.find((s) => s.key === "dataSource");
    if (setting?.source != null && setting?.value != null) {
      return [
        {
          source: setting.source,
          id: setting.value.toString(),
          name: setting.label,
        },
      ];
    }
    return [];
  });

  return {
    requiredData, // determined by widget, regardless of settings
    dataSources, // determined by widget setttings
  };
};
