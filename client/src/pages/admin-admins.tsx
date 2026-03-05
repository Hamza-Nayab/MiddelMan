import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, ApiError } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function AdminAdminsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });

  const { data: adminsResponse, isLoading: isAdminsLoading } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: api.adminGetAdmins,
  });

  // Check if user is master admin
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
  });

  useEffect(() => {
    if (me && !me.user?.isMasterAdmin) {
      navigate("/admin/users");
    }
  }, [me, navigate]);

  const createAdminMutation = useMutation({
    mutationFn: api.adminCreateAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
      toast({
        title: "Admin created",
        description: "New admin account has been created successfully.",
      });
      setFormData({
        email: "",
        username: "",
        password: "",
        displayName: "",
      });
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.username || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Email, username, and password are required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    createAdminMutation.mutate(formData);
  };

  const admins = adminsResponse?.admins || [];

  if (!me?.user?.isMasterAdmin) {
    return null;
  }

  return (
    <AdminLayout currentTab="admins">
      <div className="space-y-6">
        <Card className="border-border/60">
          <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Admins</CardTitle>
              <CardDescription>
                Manage admin accounts and permissions
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>Add Admin</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Admins list */}
            {isAdminsLoading ? (
              <p className="text-sm text-muted-foreground">Loading admins...</p>
            ) : admins.length ? (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <Card key={admin.id} className="border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">
                              #{admin.id}
                            </span>
                            <span className="font-semibold truncate">
                              {admin.username}
                            </span>
                            <Badge variant="default">Admin</Badge>
                            {admin.isMasterAdmin && (
                              <Badge variant="destructive">Master Admin</Badge>
                            )}
                            {admin.isDisabled && (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {admin.email || "(no email)"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created:{" "}
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No admins found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Admin</DialogTitle>
            <DialogDescription>
              Create a new admin account with login credentials
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin_username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
                pattern="^[a-z0-9._-]{5,20}$"
                title="5-20 characters, lowercase letters, numbers, dots, underscores, hyphens"
              />
              <p className="text-xs text-muted-foreground">
                5-20 characters, lowercase only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Admin Name"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAdminMutation.isPending}>
                {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
