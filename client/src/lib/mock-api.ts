import { z } from "zod";

// Types
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  theme: z.enum(["light", "dark", "gradient"]).default("light"),
});

export const LinkSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  url: z.string().url(),
  isVisible: z.boolean().default(true),
  order: z.number(),
  icon: z.string().optional(),
});

export const ReviewSchema = z.object({
  id: z.string(),
  userId: z.string(), // The profile owner
  authorName: z.string().default("Anonymous"),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
  isHidden: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Review = z.infer<typeof ReviewSchema>;

// Initial Data
const INITIAL_USERS: User[] = [
  {
    id: "user-1",
    username: "demo",
    displayName: "Demo User",
    bio: "Digital Creator | Tech Enthusiast",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
    theme: "gradient",
  },
  {
    id: "user-2",
    username: "warda_batool",
    displayName: "Warda Batool",
    bio: "UI/UX Designer & Illustrator",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    theme: "light",
  },
  {
    id: "user-3",
    username: "hamza_nayab",
    displayName: "Hamza Nayab",
    bio: "Reviewing the latest gadgets",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop",
    theme: "dark",
  },
  {
    id: "user-4",
    username: "fitness_mike",
    displayName: "Fitness Mike",
    bio: "Personal Trainer & Nutritionist",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop",
    theme: "gradient",
  },
  {
    id: "user-5",
    username: "travel_anna",
    displayName: "Travel with Anna",
    bio: "Exploring the world one city at a time",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop",
    theme: "light",
  },
  {
    id: "user-6",
    username: "chef_mario",
    displayName: "Chef Mario",
    bio: "Authentic Italian Cuisine",
    avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop",
    theme: "dark",
  },
];

const INITIAL_LINKS: Link[] = [
  { id: "link-1", userId: "user-1", title: "My Portfolio", url: "https://example.com", order: 0, isVisible: true, icon: "Globe" },
  { id: "link-2", userId: "user-1", title: "Instagram", url: "https://instagram.com", order: 1, isVisible: true, icon: "Instagram" },
  { id: "link-3", userId: "user-1", title: "Latest YouTube Video", url: "https://youtube.com", order: 2, isVisible: true, icon: "Youtube" },
  
  { id: "link-4", userId: "user-2", title: "Dribbble Portfolio", url: "https://dribbble.com", order: 0, isVisible: true },
  { id: "link-5", userId: "user-2", title: "Design Course", url: "https://example.com/course", order: 1, isVisible: true },
  
  { id: "link-6", userId: "user-3", title: "Tech Reviews Blog", url: "https://example.com/blog", order: 0, isVisible: true },
  { id: "link-7", userId: "user-3", title: "Twitter / X", url: "https://twitter.com", order: 1, isVisible: true },

  { id: "link-8", userId: "user-4", title: "Workout Plans", url: "https://example.com/workouts", order: 0, isVisible: true },
  { id: "link-9", userId: "user-4", title: "YouTube Channel", url: "https://youtube.com", order: 1, isVisible: true },

  { id: "link-10", userId: "user-5", title: "Travel Blog", url: "https://example.com/travel", order: 0, isVisible: true },
  { id: "link-11", userId: "user-5", title: "Photo Gallery", url: "https://instagram.com", order: 1, isVisible: true },

  { id: "link-12", userId: "user-6", title: "My Recipes", url: "https://example.com/recipes", order: 0, isVisible: true },
  { id: "link-13", userId: "user-6", title: "Book a Table", url: "https://example.com/book", order: 1, isVisible: true },
];

const INITIAL_REVIEWS: Review[] = [
  { id: "rev-1", userId: "user-1", authorName: "Alice", rating: 5, comment: "Love the content! Keep it up.", createdAt: new Date().toISOString(), isHidden: false },
  { id: "rev-2", userId: "user-1", authorName: "Bob", rating: 4, comment: "Great links, very useful.", createdAt: new Date(Date.now() - 86400000).toISOString(), isHidden: false },
];

// Data version - increment this when initial data changes to force refresh
const DATA_VERSION = "v2";

// Persistence Helpers
const getStorage = <T>(key: string, initial: T): T => {
  const storedVersion = localStorage.getItem("tt_data_version");
  
  // If version mismatch, clear old data and use fresh initial data
  if (storedVersion !== DATA_VERSION) {
    localStorage.removeItem("tt_users");
    localStorage.removeItem("tt_links");
    localStorage.removeItem("tt_reviews");
    localStorage.setItem("tt_data_version", DATA_VERSION);
  }
  
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const setStorage = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Helper to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// API Functions
export const api = {
  login: async (username: string): Promise<User> => {
    await delay(500);
    const users = getStorage<User[]>("tt_users", INITIAL_USERS);
    const user = users.find((u) => u.username === username);
    if (!user) throw new Error("User not found");
    localStorage.setItem("currentUser", JSON.stringify(user));
    return user;
  },

  getCurrentUser: async (): Promise<User | null> => {
    await delay(200);
    const stored = localStorage.getItem("currentUser");
    if (!stored) return null;
    // Always fetch fresh data for the current user from the users array
    const currentUser = JSON.parse(stored);
    const users = getStorage<User[]>("tt_users", INITIAL_USERS);
    return users.find(u => u.id === currentUser.id) || null;
  },

  logout: async () => {
    await delay(200);
    localStorage.removeItem("currentUser");
  },

  getProfile: async (username: string): Promise<User> => {
    await delay(300);
    const users = getStorage<User[]>("tt_users", INITIAL_USERS);
    const user = users.find((u) => u.username === username);
    if (!user) throw new Error("User not found");
    return user;
  },

  updateUserTheme: async (userId: string, theme: User["theme"]) => {
    await delay(300);
    const users = getStorage<User[]>("tt_users", INITIAL_USERS);
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].theme = theme;
      setStorage("tt_users", users);
      // Update session if it's the current user
      const currentUserStr = localStorage.getItem("currentUser");
      if (currentUserStr) {
         const currentUser = JSON.parse(currentUserStr);
         if (currentUser.id === userId) {
             localStorage.setItem("currentUser", JSON.stringify(users[index]));
         }
      }
    }
    return users[index];
  },

  getLinks: async (userId: string): Promise<Link[]> => {
    await delay(300);
    const links = getStorage<Link[]>("tt_links", INITIAL_LINKS);
    return links.filter((l) => l.userId === userId).sort((a, b) => a.order - b.order);
  },

  addLink: async (link: Omit<Link, "id">) => {
    await delay(300);
    const links = getStorage<Link[]>("tt_links", INITIAL_LINKS);
    const newLink = { ...link, id: `link-${Date.now()}` };
    links.push(newLink);
    setStorage("tt_links", links);
    return newLink;
  },

  updateLink: async (id: string, updates: Partial<Link>) => {
    await delay(200);
    const links = getStorage<Link[]>("tt_links", INITIAL_LINKS);
    const index = links.findIndex((l) => l.id === id);
    if (index === -1) throw new Error("Link not found");
    links[index] = { ...links[index], ...updates };
    setStorage("tt_links", links);
    return links[index];
  },

  deleteLink: async (id: string) => {
    await delay(200);
    let links = getStorage<Link[]>("tt_links", INITIAL_LINKS);
    links = links.filter((l) => l.id !== id);
    setStorage("tt_links", links);
  },

  getReviews: async (userId: string): Promise<Review[]> => {
    await delay(300);
    const reviews = getStorage<Review[]>("tt_reviews", INITIAL_REVIEWS);
    return reviews.filter((r) => r.userId === userId && !r.isHidden).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getAllReviewsForOwner: async (userId: string): Promise<Review[]> => {
    await delay(300);
    const reviews = getStorage<Review[]>("tt_reviews", INITIAL_REVIEWS);
    return reviews.filter((r) => r.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  searchUsers: async (query: string): Promise<User[]> => {
    await delay(300);
    const users = getStorage<User[]>("tt_users", INITIAL_USERS);
    if (!query) return users;
    const lowerQuery = query.toLowerCase();
    return users.filter(u => 
      u.username.toLowerCase().includes(lowerQuery) || 
      u.displayName.toLowerCase().includes(lowerQuery) ||
      (u.bio && u.bio.toLowerCase().includes(lowerQuery))
    );
  },

  addReview: async (review: Omit<Review, "id" | "createdAt" | "isHidden">) => {
    await delay(400);
    const reviews = getStorage<Review[]>("tt_reviews", INITIAL_REVIEWS);
    const newReview = { ...review, id: `rev-${Date.now()}`, createdAt: new Date().toISOString(), isHidden: false };
    reviews.unshift(newReview);
    setStorage("tt_reviews", reviews);
    return newReview;
  },
  
  toggleReviewVisibility: async (id: string) => {
      await delay(200);
      const reviews = getStorage<Review[]>("tt_reviews", INITIAL_REVIEWS);
      const index = reviews.findIndex(r => r.id === id);
      if (index !== -1) {
          reviews[index].isHidden = !reviews[index].isHidden;
          setStorage("tt_reviews", reviews);
      }
  }
};
