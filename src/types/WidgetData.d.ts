import { WidgetMetaDataTypes, WidgetSetting } from "@/lib/widgetRegistry";
import { Layout as PrismaLayout } from "@prisma/client";
import { DBBase } from "./Prisma";
export interface Widget {
  id: number;
  type: WidgetRequiredData;
  x: number;
  y: number;
  width: number;
  height: number;
  requiredData: WidgetMetaDataTypes[];
  data: {
    [value in WidgetMetaDataTypes]?: any;
  };
  settings: WidgetSetting[];
}

/**
 * Just like the Prisma Layout model, but with
 * widgets: Widget[] instead of Json[] | null.
 */
export type TypedLayout = Omit<PrismaLayout, "widgets"> & {
  widgets: Widget[];
};