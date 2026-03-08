import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

const adminUsersQueryKey = (
  searchQ: string,
  roleFilterValue: string | undefined,
  disabledFilter: boolean | undefined,
  cursor: number | undefined,
) =>
  [
    ...ADMIN_USERS_QUERY_KEY,
    searchQ,
    roleFilterValue,
    disabledFilter,
    cursor,
  ] as const;

export function useAdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, [location]);

  const [searchQ, setSearchQ] = useState(() => searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") || "all");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || "all",
  );
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [disableDialog, setDisableDialog] = useState<{
    userId: number;
    isDisabling: boolean;
  } | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const updateUrlParams = (q: string, role: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    const queryString = params.toString();
    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : "/admin/users",
    );
  };

  const disabledFilter = useMemo(() => {
    return statusFilter === "all" ? undefined : statusFilter === "true";
  }, [statusFilter]);

  const roleFilterValue = useMemo(() => {
    return roleFilter === "all" ? undefined : roleFilter;
  }, [roleFilter]);

  const { data: usersResponse, isLoading: isUsersLoading } = useQuery({
    queryKey: adminUsersQueryKey(
      searchQ,
      roleFilterValue,
      disabledFilter,
      cursor,
    ),
    queryFn: () =>
      api.adminGetUsers({
        q: searchQ,
        role: roleFilterValue,
        disabled: disabledFilter,
        limit: 20,
        cursor,
      }),
  });

  const disableUserMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api.adminDisableUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      toast({
        title: "User disabled",
        description: "User account has been disabled.",
      });
      setDisableDialog(null);
      setDisableReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: (id: number) => api.adminEnableUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      toast({
        title: "User enabled",
        description: "User account has been re-enabled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({
      id,
      role,
    }: {
      id: number;
      role: "admin" | "buyer" | "seller";
    }) => api.adminSetUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      toast({
        title: "Role updated",
        description: "User role has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearchChange = (newQ: string) => {
    setSearchQ(newQ);
    setCursor(undefined);
    updateUrlParams(newQ, roleFilter, statusFilter);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCursor(undefined);
    updateUrlParams(searchQ, value, statusFilter);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCursor(undefined);
    updateUrlParams(searchQ, roleFilter, value);
  };

  const handlePreviousPage = () => setCursor(undefined);
  const handleNextPage = () => {
    if (usersResponse?.nextCursor) {
      setCursor(usersResponse.nextCursor);
    }
  };

  return {
    searchQ,
    roleFilter,
    statusFilter,
    cursor,
    usersResponse,
    isUsersLoading,
    disableDialog,
    disableReason,
    setDisableDialog,
    setDisableReason,
    handleSearchChange,
    handleRoleFilterChange,
    handleStatusFilterChange,
    handlePreviousPage,
    handleNextPage,
    disableUserMutation,
    enableUserMutation,
    roleChangeMutation,
  };
}
