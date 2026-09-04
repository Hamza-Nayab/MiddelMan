import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ContactMessage, type ContactStatus, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Search,
  CheckCircle,
  Clock,
  Archive,
  Phone,
  User,
  MessageSquare,
  Reply,
  Calendar,
  AlertCircle,
  Inbox,
  Filter,
} from "lucide-react";

export default function AdminContactsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-contacts", statusFilter, searchQuery],
    queryFn: () =>
      api.getAdminContacts({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: searchQuery.trim() || undefined,
        limit: 50,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number;
      status?: ContactStatus;
      notes?: string;
      silent?: boolean;
    }) =>
      api.updateAdminContact(id, {
        status,
        adminNotes: notes !== undefined ? notes : undefined,
      }),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      if (selectedContact && selectedContact.id === result.contact.id) {
        setSelectedContact(result.contact);
        setAdminNotes(result.contact.adminNotes || "");
      }
      if (!variables?.silent) {
        toast({
          title: "Contact updated",
          description: "Submission status and notes were successfully saved.",
        });
      }
    },
    onError: (err, variables) => {
      if (!variables?.silent) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to update submission. Please try again.";
        toast({
          title: "Update failed",
          description: msg,
          variant: "destructive",
        });
      }
    },
  });

  const handleOpenDetail = (contact: ContactMessage) => {
    setSelectedContact(contact);
    setAdminNotes(contact.adminNotes || "");
    // Automatically mark unread message as read when inspected
    if (contact.status === "unread") {
      updateMutation.mutate({ id: contact.id, status: "read", silent: true });
    }
  };

  const handleStatusChange = (status: ContactStatus) => {
    if (!selectedContact) return;
    updateMutation.mutate({
      id: selectedContact.id,
      status,
      notes: adminNotes,
    });
  };

  const handleSaveNotes = () => {
    if (!selectedContact) return;
    updateMutation.mutate({
      id: selectedContact.id,
      notes: adminNotes,
    });
  };

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: ContactStatus) => {
    switch (status) {
      case "unread":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 font-medium">
            Unread
          </Badge>
        );
      case "read":
        return (
          <Badge variant="secondary" className="font-medium text-slate-700 dark:text-slate-300">
            Read
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700">
            Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout currentTab="contacts">
      <div className="space-y-6">
        {/* Header and Metrics */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contact Messages & Inquiries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review, triage, and respond to incoming user submissions from the contact form.
          </p>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Unread Messages
              </CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between text-blue-600 dark:text-blue-400">
                {unreadCount}
                <Inbox className="w-5 h-5 opacity-70" />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Total Submissions
              </CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between text-slate-900 dark:text-white">
                {total}
                <Mail className="w-5 h-5 opacity-70 text-slate-500" />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Current Filter Count
              </CardDescription>
              <CardTitle className="text-2xl font-bold flex items-center justify-between text-slate-700 dark:text-slate-300">
                {items.length}
                <Filter className="w-5 h-5 opacity-70 text-slate-500" />
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: `Unread (${unreadCount})` },
                  { key: "read", label: "Read" },
                  { key: "archived", label: "Archived" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      statusFilter === tab.key
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search name, email, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center">
                <Spinner className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-slate-500">Loading submissions...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center text-destructive space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-sm font-medium">Failed to load submissions</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  No submissions found
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "When users submit inquiries via the /contact form, they will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Sender</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Message Preview</th>
                      <th className="py-3 px-4">Received</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((contact) => (
                      <tr
                        key={contact.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${
                          contact.status === "unread"
                            ? "bg-blue-50/20 dark:bg-blue-950/10 font-medium"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(contact.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {contact.name}
                          </div>
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 text-[11px] block"
                          >
                            {contact.email}
                          </a>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {contact.phone || "—"}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                          {contact.message}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {formatDate(contact.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetail(contact)}
                            className="h-7 text-xs font-medium cursor-pointer"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(selectedContact)}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null);
        }}
      >
        {selectedContact && (
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 pr-6">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Inquiry from {selectedContact.name}
                </DialogTitle>
                {getStatusBadge(selectedContact.status)}
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Received on {formatDate(selectedContact.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {/* Sender Details Card */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Full Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedContact.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedContact.email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">
                    Phone / Contact Handle
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedContact.phone || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                    {selectedContact.status}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Message Content
                </label>
                <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed shadow-xs">
                  {selectedContact.message}
                </div>
              </div>

              {/* Internal Admin Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Internal Admin Notes
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveNotes}
                    disabled={updateMutation.isPending}
                    className="h-6 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  >
                    Save Notes
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this ticket (e.g. 'Replied to user on Sep 5 via email', 'Escalated to developer')..."
                  className="text-xs resize-y"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-border/60">
              {/* Quick Reply Button */}
              <a
                href={`mailto:${selectedContact.email}?subject=Re: MiddelMen Support Inquiry - ${encodeURIComponent(selectedContact.name)}`}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                <Reply className="w-4 h-4" />
                Reply via Email
              </a>

              {/* Status Actions */}
              <div className="flex items-center gap-2">
                {selectedContact.status === "read" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("unread")}
                    disabled={updateMutation.isPending}
                    className="h-9 text-xs"
                  >
                    Mark Unread
                  </Button>
                )}

                {selectedContact.status !== "read" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("read")}
                    disabled={updateMutation.isPending}
                    className="h-9 text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Mark Read
                  </Button>
                )}

                {selectedContact.status !== "archived" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusChange("archived")}
                    disabled={updateMutation.isPending}
                    className="h-9 text-xs"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1" />
                    Archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("read")}
                    disabled={updateMutation.isPending}
                    className="h-9 text-xs"
                  >
                    Unarchive
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
