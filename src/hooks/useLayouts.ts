import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const fetchLayouts = async (userId: number) => {
  const { data } = await axios.get(`/api/v1/layouts?userId=${userId}`);
  return data.data;
};

export const useLayouts = (userId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["layouts", userId],
    queryFn: () => fetchLayouts(userId),
    enabled: !!userId && enabled,
  });
};

export const useCreateLayout = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newLayout: Record<string, any>) =>
      axios.post("/api/v1/layouts", { ...newLayout, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts", userId] });
    },
  });
};

export const useUpdateLayout = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updatedLayout: { id: number; [key: number]: any }) =>
      axios.patch("/api/v1/layouts", { ...updatedLayout, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts", userId] });
    },
  });
};

export const useDeleteLayout = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      axios.delete(`/api/v1/layouts?id=${id}&userId=${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts", userId] });
    },
  });
};
