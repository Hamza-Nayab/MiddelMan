import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/api";
import { UserActionsMenu } from "./UserActionsMenu";

type UserTableProps = {
  isUsersLoading: boolean;
  items: AdminUser[];
  hasNextPage: boolean;
  cursor?: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  searchQ: string;
  roleFilter: string;
  statusFilter: string;
  navigate: (path: string) => void;
  onEnable: (id: number) => void;
  onDisable: (id: number) => void;
  onPromote: (id: number) => void;
  onDemote: (id: number) => void;
  isEnablePending: boolean;
  isDisablePending: boolean;
  isRoleChangePending: boolean;
};

const getRoleBadgeColor = (role: string) => {
  return role === "admin"
    ? "destructive"
    : role === "seller"
      ? "default"
      : "secondary";
};

export const UserTable = memo(function UserTable({
  isUsersLoading,
  items,
  hasNextPage,
  cursor,
  onPreviousPage,
  onNextPage,
  searchQ,
  roleFilter,
  statusFilter,
  navigate,
  onEnable,
  onDisable,
  onPromote,
  onDemote,
  isEnablePending,
  isDisablePending,
  isRoleChangePending,
}: UserTableProps) {
  if (isUsersLoading) {
    return <p className="text-sm text-muted-foreground">Loading users...</p>;
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No users found.</p>;
  }

  return (
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
                  <Badge variant={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  {user.isMasterAdmin && <Badge variant="destructive">Master Admin</Badge>}
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

            <UserActionsMenu
              user={user}
              searchQ={searchQ}
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              navigate={navigate}
              onEnable={onEnable}
              onDisable={onDisable}
              onPromote={onPromote}
              onDemote={onDemote}
              isEnablePending={isEnablePending}
              isDisablePending={isDisablePending}
              isRoleChangePending={isRoleChangePending}
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={onPreviousPage} disabled={!cursor}>
          Previous
        </Button>
        <Button variant="outline" onClick={onNextPage} disabled={!hasNextPage}>
          Load More
        </Button>
      </div>
    </div>
  );
});
