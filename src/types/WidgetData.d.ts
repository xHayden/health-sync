import { WidgetMetaDataTypes, WidgetSetting } from "@/lib/widgetRegistry";
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

interface Layout {
  userId: number;
  widgets: Widget[];
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface DBLayout extends Layout, DBBase {
}