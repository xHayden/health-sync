import { create } from "zustand";
import axios from "axios";
import { Prisma, SharedLayoutDataScope } from "@prisma/client";
import { useLayoutStore } from "./layoutStore";
import { TypedLayoutWithUser } from "@/types/WidgetData";
import { Session } from "next-auth";

/**
 * A single share record returned from the API. We eagerly include the sharedUser
 * (and also the related layout+owner in case the UI needs it later).
 */
export type OwnerShare = Prisma.SharedLayoutGetPayload<{
  include: {
    sharedUser: true;
    layout: { include: { user: true } };
  };
}>;

export type UserShare = Prisma.SharedLayoutGetPayload<{
  include: {
    owner: true;
    layout: { include: { user: true } };
  };
}>;

/**
 * Payload expected by POST /api/v1/layouts/share (mirrors the server route).
 * Dates are sent as ISO strings so they can be serialised safely.
 */
export interface CreateSharePayload {
  ownerId: number;
  layoutId: number;
  sharedUserId: number;
  scopes: SharedLayoutDataScope[];
  /** Optional ISO timestamp */
  expires?: string;
}

interface SharingState {
  /** Shares grouped by *layoutId* for layouts OWNED by the current user */
  sharesByLayout: Record<number, OwnerShare[]>;
  /** Layouts that have been shared *with* the current user */
  shareLayoutConnections: UserShare[];

  loading: {
    owner?: boolean;
    sharedWithMe?: boolean;
  };
  error?: string;

  updateLayoutOnDashboard: (
    id: number,
    onDashboard: boolean,
    user: Session["user"]
  ) => Promise<void>;

  /** Fetch shares for every layout owned by `ownerId` (usually the current user) */
  fetchSharesByOwner: (ownerId: number) => Promise<void>;
  /** Fetch layouts that were shared with `sharedUserId` (the current user) */
  fetchSharesForLayout: (ownerId: number, layoutId: number) => Promise<void>;
  fetchSharedWithMe: (sharedUserId: number) => Promise<void>;
  /** Delete an individual share */
  revokeShare: (shareId: number, layoutId: number) => Promise<void>;
  /** Create a new share */
  shareLayout: (payload: CreateSharePayload) => Promise<void>;
}

export const useSharingStore = create<SharingState>(
  (set, get) =>
    ({
      sharesByLayout: {},
      shareLayoutConnections: [],
      loading: {},

      async fetchSharesByOwner(ownerId) {
        set((s) => ({ loading: { ...s.loading, owner: true } }));
        try {
          const { data } = await axios.get(
            `/api/v1/layouts/share?ownerId=${ownerId}`
          );
          const shares: OwnerShare[] = data.data;

          // Fan-out the result into a map keyed by layoutId
          const byLayout: Record<number, OwnerShare[]> = {};
          shares.forEach((sh) => {
            byLayout[sh.layoutId] = [...(byLayout[sh.layoutId] ?? []), sh];
          });

          set({ sharesByLayout: byLayout });
        } catch (e) {
          console.error(e);
          set({ error: "Failed to load shares for your layouts" });
        } finally {
          set((s) => ({ loading: { ...s.loading, owner: false } }));
        }
      },

      async fetchSharesForLayout(ownerId, layoutId) {
        set((s) => ({ loading: { ...s.loading, owner: true } }));
        try {
          // grab _all_ shares for this owner…
          const { data } = await axios.get(
            `/api/v1/layouts/share?ownerId=${ownerId}`
          );
          const shares: OwnerShare[] = data.data;
          // …but only keep those for our one layout
          const filtered = shares.filter((sh) => sh.layoutId === layoutId);
          // write it back — even if filtered === []
          set((s) => ({
            sharesByLayout: {
              ...s.sharesByLayout,
              [layoutId]: filtered,
            },
          }));
        } catch (e) {
          console.error(e);
          set({ error: "Failed to load shares for layout" });
        } finally {
          set((s) => ({ loading: { ...s.loading, owner: false } }));
        }
      },

      async fetchSharedWithMe(sharedUserId) {
        set((s) => ({ loading: { ...s.loading, sharedWithMe: true } }));
        try {
          const { data } = await axios.get(
            `/api/v1/layouts/share?sharedUserId=${sharedUserId}`
          );
          const shares = data.data as UserShare[];
          set({ shareLayoutConnections: shares });

          /* Push the layouts into LayoutStore so the UI can read .sharedLayouts */
          const layouts = shares.map(
            (sh) => sh.layout
          ) as unknown as TypedLayoutWithUser[];
          useLayoutStore.getState().setSharedLayouts(layouts);
        } catch (e) {
          console.error(e);
          set({ error: "Failed to load layouts shared with you" });
        } finally {
          set((s) => ({ loading: { ...s.loading, sharedWithMe: false } }));
        }
      },

      updateLayoutOnDashboard: async (shareId, onDashboard, user) => {
        try {
          const userId = user.id;

          await axios.patch("/api/v1/layouts/share", {
            userId,
            shareId,
            onDashboard,
          });

          set((state) => ({
            shareLayoutConnections: state.shareLayoutConnections.map((share) =>
              share.id === shareId
                ? {
                    ...share,
                    onDashboard
                  }
                : share
            ),
          }));
        } catch (error) {
          console.error("Error updating layout dashboard status", error);
          set({ error: "Failed to update layout dashboard status" });
        }
      },

      async revokeShare(shareId, layoutId) {
        try {
          await axios.delete(`/api/v1/layouts/share?shareId=${shareId}`);
          const current = get().sharesByLayout[layoutId] ?? [];
          set((s) => ({
            sharesByLayout: {
              ...s.sharesByLayout,
              [layoutId]: current.filter((sh) => sh.id !== shareId),
            },
          }));
        } catch (e) {
          console.error(e);
          set({ error: "Failed to revoke share" });
        }
      },

      async shareLayout(payload) {
        try {
          const { data } = await axios.post("/api/v1/layouts/share", payload);
          // Keep owner view in sync if we're the owner
          set((s) => ({
            sharesByLayout: {
              ...s.sharesByLayout,
              [payload.layoutId]: [
                ...(s.sharesByLayout[payload.layoutId] ?? []),
                data as OwnerShare,
              ],
            },
          }));
        } catch (e) {
          console.error(e);
          set({ error: "Failed to share layout" });
        }
      },
    } as SharingState)
);
