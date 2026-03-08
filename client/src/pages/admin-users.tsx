import { useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserFilters } from "@/components/admin/users/UserFilters";
import { UserTable } from "@/components/admin/users/UserTable";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const {
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
  } = useAdminUsers();
  const items = useMemo(() => usersResponse?.items ?? [], [usersResponse?.items]);
  const hasNextPage = usersResponse?.nextCursor !== null;

  const handleEnable = useCallback(
    (id: number) => {
      enableUserMutation.mutate(id);
    },
    [enableUserMutation.mutate],
  );

  const handleDisable = useCallback(
    (id: number) => {
      setDisableDialog({
        userId: id,
        isDisabling: true,
      });
    },
    [setDisableDialog],
  );

  const handlePromote = useCallback(
    (id: number) => {
      roleChangeMutation.mutate({ id, role: "admin" });
    },
    [roleChangeMutation.mutate],
  );

  const handleDemote = useCallback(
    (id: number) => {
      roleChangeMutation.mutate({ id, role: "seller" });
    },
    [roleChangeMutation.mutate],
  );

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
          <UserFilters
            searchQ={searchQ}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            onSearchChange={handleSearchChange}
            onRoleFilterChange={handleRoleFilterChange}
            onStatusFilterChange={handleStatusFilterChange}
          />

          <UserTable
            isUsersLoading={isUsersLoading}
            items={items}
            hasNextPage={hasNextPage}
            cursor={cursor}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            searchQ={searchQ}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            navigate={navigate}
            onEnable={handleEnable}
            onDisable={handleDisable}
            onPromote={handlePromote}
            onDemote={handleDemote}
            isEnablePending={enableUserMutation.isPending}
            isDisablePending={disableUserMutation.isPending}
            isRoleChangePending={roleChangeMutation.isPending}
          />
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
