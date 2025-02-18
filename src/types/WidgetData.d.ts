import { DataTypes, WidgetType } from "./WidgetDataEnums";
import { DBBase } from "./Prisma";

export interface Widget {
  id: number;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  requiredData: DataTypes[];
  data: {
    [value in DataTypes]: any;
  };
}

interface Layout {
  userId: number;
  layout: LayoutInternal;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface LayoutInternal {
  widgets?: Widget[];
}

export interface DBLayout extends Layout, DBBase {
}