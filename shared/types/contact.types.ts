export type ContactStatus = "unread" | "read" | "archived";

export type ContactSubmissionPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus;
  adminNotes: string | null;
  resolvedByAdminId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminContactsResponse = {
  items: ContactMessage[];
  total: number;
  unreadCount: number;
  nextCursor: number | null;
};

export type AdminContactUpdatePayload = {
  status?: ContactStatus;
  adminNotes?: string | null;
};
