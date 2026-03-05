import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return undefined;
    return this.users.get(numericId);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = Number.parseInt(randomUUID().replace(/\D/g, "").slice(0, 9), 10);
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username ?? null,
      email: insertUser.email ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      googleId: insertUser.googleId ?? null,
      role: insertUser.role ?? "buyer",
      lastUsernameChangedAt: null, // Only set when username is changed
      usernameChangeCount: 0,
      createdAt: now,
      updatedAt: now,
      isDisabled: false,
      disabledReason: null,
      disabledAt: null,
      disabledByAdminId: null,
      isMasterAdmin: false,
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
