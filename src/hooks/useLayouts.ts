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
