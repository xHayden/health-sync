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

type LayoutWithUser = Prisma.LayoutGetPayload<{
  include: {
    user: true;
  };
}>;

type SharedLayoutWithOwner = SharedLayout & {
  layout: Layout;
  owner: { id: number; name: string | null; email: string | null };
  dataScopes: SharedLayoutDataScope[];
};

type SharedLayoutWithSharedUser = SharedLayout & {
  layout: Layout;
  sharedUser: { id: number; name: string | null; email: string | null };
  dataScopes: SharedLayoutDataScope[];
};

type SharedLayoutWithSharedUserAndOwner = SharedLayoutWithSharedUser &
  SharedLayoutWithOwner;

/**
 * Just like the Prisma Layout model, but with
 * widgets: Widget[] instead of Json[] | null.
 */
export type TypedLayout = Omit<PrismaLayout, "widgets"> & {
  widgets: Widget[];
};

export type TypedLayoutWithUser = Omit<LayoutWithUser, "widgets"> & {
  widgets: Widget[];
};

export interface SharedDataOptions {
  requiredData: string[];
  dataSources: { source: string; id: string; name: string }[];
}
