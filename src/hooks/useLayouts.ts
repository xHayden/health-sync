import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Session } from "next-auth";

const fetchLayouts = async (userId: number) => {
  const { data } = await axios.get(`/api/v1/layouts?userId=${userId}`);
  return data.data;
};

export const useLayouts = (user: Session["user"], enabled: boolean) => {
  return useQuery({
    queryKey: ["layouts", user.id],
    queryFn: () => fetchLayouts(user.id),
    enabled: !!user.id && enabled,
  });
};

export const useCreateLayout = (user: Session["user"]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newLayout: Record<string, any>) =>
      axios.post("/api/v1/layouts", { ...newLayout, userId: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts", user.id] });
    },
  });
};

export const useUpdateLayout = (user: Session["user"]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updatedLayout: { id: number; [key: number]: any }) =>
      axios.patch("/api/v1/layouts", { ...updatedLayout, userId: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts", user.id] });
    },
  });
};

export const useDeleteLayout = (user: Session["user"]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      axios.delete(`/api/v1/layouts?id=${id}&userId=${user.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts", user.id] });
    },
  });
};

export const useSharedLayoutsByOwner = (
  ownerId: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["sharedLayouts", "owner", ownerId],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/layouts/share?ownerId=${ownerId}`
      );
      return data.data;
    },
    enabled,
  });
};

export const useSharedLayoutsForMember = (
  memberId: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["sharedLayouts", "member", memberId],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/layouts/share?memberId=${memberId}`
      );
      return data.data;
    },
    enabled,
  });
};

export const useShareLayout = (user: Session["user"]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sharePayload: {
      layoutId: number;
      sharedUserId: number;
      scopes?: Array<{
        resourceType: string;
        resourceId?: number;
        permissions: string[];
      }>;
      expires?: string;
    }) =>
      axios.post("/api/v1/layouts/share", {
        ownerId: user.id,
        ...sharePayload,
      }),
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({
        queryKey: ["sharedLayouts", "owner", user.id],
      });
    },
  });
};

export const useUpdateSharedLayout = (user: Session["user"]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updatePayload: {
      shareId: number;
      expires?: string | null;
      scopesToAdd?: Array<{
        resourceType: string;
        resourceId?: number;
        permissions: string[];
      }>;
      scopesToRemove?: number[];
    }) => axios.patch("/api/v1/layouts/share", updatePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sharedLayouts", "owner", user.id],
      });
    },
  });
};

export const useRevokeSharedLayout = (user: Session["user"]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: number) =>
      axios.delete(`/api/v1/layouts/share?shareId=${shareId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sharedLayouts", "owner", user.id],
      });
    },
  });
};
