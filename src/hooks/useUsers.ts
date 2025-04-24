import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const fetchAllUsers = async () => {
  const { data } = await axios.get<{ data: any[] }>("/api/v1/users");
  return data.data;
};

const fetchSearchUsers = async (params: { name?: string; email?: string }) => {
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.append("name", params.name);
  if (params.email) searchParams.append("email", params.email);

  const { data } = await axios.get<{ data: any[] }>(
    `/api/v1/users/search?${searchParams.toString()}`
  );
  return data.data;
};

/**
 * Fetch the full list of users
 */
export const useUsers = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["users", "all"],
    queryFn: fetchAllUsers,
    enabled,
  });
};

/**
 * Fetch users matching `name` and/or `email`.
 * Only runs when at least one param is present.
 */
export const useSearchUsers = (
  params: { name?: string; email?: string },
  enabled: boolean = Boolean(params.name || params.email)
) => {
  return useQuery({
    queryKey: ["users", "search", params],
    queryFn: () => fetchSearchUsers(params),
    enabled,
  });
};

/**
 * Create a new user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newUser: Record<string, any>) =>
      axios.post("/api/v1/users", newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
    },
  });
};

/**
 * Update an existing user (expects at least an `id` field)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updatedUser: { id: number; [key: string]: any }) =>
      axios.patch("/api/v1/users", updatedUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
    },
  });
};

/**
 * Delete a user by id
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => axios.delete(`/api/v1/users?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
    },
  });
};
