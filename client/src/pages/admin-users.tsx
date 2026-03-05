import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "false", label: "Active" },
  { value: "true", label: "Disabled" },
];

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();

  // Parse URL search params on mount
  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, [location]);

  const [searchQ, setSearchQ] = useState(() => searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(
    () => searchParams.get("role") || "all",
  );
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || "all",
  );
  const [cursor, setCursor] = useState<number | undefined>(undefined);

  // Update URL when filters change
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
  const [disableDialog, setDisableDialog] = useState<{
    userId: number;
    isDisabling: boolean;
  } | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const disabledFilter = useMemo(() => {
    return statusFilter === "all"
      ? undefined
      : statusFilter === "true"
        ? true
        : false;
  }, [statusFilter]);

  const roleFilterValue = useMemo(() => {
    return roleFilter === "all" ? undefined : roleFilter;
  }, [roleFilter]);

  const { data: usersResponse, isLoading: isUsersLoading } = useQuery({
    queryKey: ["admin-users", searchQ, roleFilterValue, disabledFilter, cursor],
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
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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

  const getRoleBadgeColor = (role: string) => {
    return role === "admin"
      ? "destructive"
      : role === "seller"
        ? "default"
        : "secondary";
  };

  const handlePreviousPage = () => {
    setCursor(undefined);
  };

  const handleNextPage = () => {
    if (usersResponse?.nextCursor) {
      setCursor(usersResponse.nextCursor);
    }
  };

  const items = usersResponse?.items || [];
  const hasNextPage = usersResponse?.nextCursor !== null;

  return (
    <AdminLayout currentTab="users">
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Search by username, email, or ID..."
              value={searchQ}
              onChange={(e) => {
                const newQ = e.target.value;
                setSearchQ(newQ);
                setCursor(undefined);
                updateUrlParams(newQ, roleFilter, statusFilter);
              }}
              className="flex-1"
            />
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setCursor(undefined);
                updateUrlParams(searchQ, value, statusFilter);
              }}
            >
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCursor(undefined);
                updateUrlParams(searchQ, roleFilter, value);
              }}
            >
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users list */}
          {isUsersLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((user) => (
                <Card key={user.id} className="border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{user.id}
                          </span>
                          <span className="font-semibold truncate">
                            {user.username || "(no username)"}
                          </span>
                          <Badge variant={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                          {user.isMasterAdmin && (
                            <Badge variant="destructive">Master Admin</Badge>
                          )}
                          {user.isDisabled && (
                            <Badge variant="outline">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {user.email || "(no email)"}
                        </p>
                        {user.disabledReason && (
                          <p className="text-xs text-destructive mt-1">
                            Reason: {user.disabledReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Save current filters to sessionStorage before navigating
                          const params = new URLSearchParams();
                          if (searchQ) params.set("q", searchQ);
                          if (roleFilter !== "all")
                            params.set("role", roleFilter);
                          if (statusFilter !== "all")
                            params.set("status", statusFilter);
                          const queryString = params.toString();
                          const returnUrl = queryString
                            ? `/admin/users?${queryString}`
                            : "/admin/users";
                          sessionStorage.setItem(
                            "adminUsersFilterUrl",
                            returnUrl,
                          );
                          navigate(`/admin/sellers/${user.id}`);
                        }}
                      >
                        View Details
                      </Button>
                      {user.isDisabled ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => enableUserMutation.mutate(user.id)}
                          disabled={enableUserMutation.isPending}
                        >
                          Re-enable
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDisableDialog({
                              userId: user.id,
                              isDisabling: true,
                            })
                          }
                          disabled={disableUserMutation.isPending}
                        >
                          Disable
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              <div className="flex justify-between gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={!cursor}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={!hasNextPage}
                >
                  Load More
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>

      {/* Disable User Dialog */}
      <AlertDialog
        open={!!disableDialog}
        onOpenChange={() => setDisableDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable User</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable the user account and prevent login.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Reason for disabling (optional)..."
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              className="min-h-20"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {disableReason.length}/500
            </p>
          </div>

          <AlertDialogAction
            onClick={() => {
              if (disableDialog) {
                disableUserMutation.mutate({
                  id: disableDialog.userId,
                  reason: disableReason || undefined,
                });
              }
            }}
            disabled={disableUserMutation.isPending}
          >
            Disable User
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
