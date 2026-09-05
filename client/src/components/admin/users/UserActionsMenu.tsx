import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/api";

type UserActionsMenuProps = {
  user: Pick<AdminUser, "id" | "isDisabled" | "role" | "isMasterAdmin">;
  searchQ: string;
  roleFilter: string;
  statusFilter: string;
  navigate: (path: string) => void;
  onEnable: (id: number) => void;
  onDisable: (id: number) => void;
  isEnablePending: boolean;
  isDisablePending: boolean;
};

export const UserActionsMenu = memo(function UserActionsMenu({
  user,
  searchQ,
  roleFilter,
  statusFilter,
  navigate,
  onEnable,
  onDisable,
  isEnablePending,
  isDisablePending,
}: UserActionsMenuProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const params = new URLSearchParams();
          if (searchQ) params.set("q", searchQ);
          if (roleFilter !== "all") params.set("role", roleFilter);
          if (statusFilter !== "all") params.set("status", statusFilter);
          const queryString = params.toString();
          const returnUrl = queryString
            ? `/admin/users?${queryString}`
            : "/admin/users";
          sessionStorage.setItem("adminUsersFilterUrl", returnUrl);
          navigate(`/admin/sellers/${user.id}`);
        }}
      >
        View Details
      </Button>
      {!user.isMasterAdmin &&
        (user.isDisabled ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEnable(user.id)}
            disabled={isEnablePending}
          >
            Re-enable
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDisable(user.id)}
            disabled={isDisablePending}
          >
            Disable
          </Button>
        ))}
    </div>
  );
});
