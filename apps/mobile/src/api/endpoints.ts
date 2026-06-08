import type {
  AuthResponse,
  BankConnection,
  Budget,
  CategoryId,
  DashboardSummary,
  DecisionResult,
  Locale,
  PlannedEvent,
  PlanStatus,
  PlanSuggestion,
  PlanType,
  Transaction,
  User,
} from "@pace/shared";
import { api } from "./client";

export const AuthApi = {
  async register(input: {
    email: string;
    password: string;
    displayName?: string;
    locale?: Locale;
  }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", input);
    return data;
  },
  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", input);
    return data;
  },
};

export const UserApi = {
  async me(): Promise<User> {
    const { data } = await api.get<User>("/user/me");
    return data;
  },
  async update(input: Partial<Pick<User, "displayName" | "safetyBuffer" | "locale">>): Promise<User> {
    const { data } = await api.patch<User>("/user/me", input);
    return data;
  },
};

export const BankApi = {
  async connections(): Promise<BankConnection[]> {
    const { data } = await api.get<BankConnection[]>("/bank/connections");
    return data;
  },
  async connect(institution?: string): Promise<{
    status: string;
    connection?: BankConnection;
    imported?: number;
    authUrl?: string;
  }> {
    const { data } = await api.post("/bank/connect", { institution });
    return data;
  },
  async sync(): Promise<unknown> {
    const { data } = await api.post("/bank/sync");
    return data;
  },
  async disconnect(id: string): Promise<void> {
    await api.delete(`/bank/connections/${id}`);
  },
};

export const DashboardApi = {
  async get(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>("/dashboard");
    return data;
  },
};

export interface TxFilters {
  category?: CategoryId;
  search?: string;
  limit?: number;
}

export const TransactionsApi = {
  async list(filters: TxFilters = {}): Promise<Transaction[]> {
    const { data } = await api.get<Transaction[]>("/transactions", {
      params: filters,
    });
    return data;
  },
  async setCategory(id: string, category: CategoryId): Promise<Transaction> {
    const { data } = await api.patch<Transaction>(
      `/transactions/${id}/category`,
      { category }
    );
    return data;
  },
};

export const BudgetsApi = {
  async list(): Promise<Budget[]> {
    const { data } = await api.get<Budget[]>("/budgets");
    return data;
  },
  async suggestions(): Promise<{ category: CategoryId; suggested: number }[]> {
    const { data } = await api.get("/budgets/suggestions");
    return data;
  },
  async upsert(category: CategoryId, limit: number): Promise<Budget> {
    const { data } = await api.put<Budget>("/budgets", { category, limit });
    return data;
  },
  async remove(category: CategoryId): Promise<void> {
    await api.delete(`/budgets/${category}`);
  },
};

export const DecisionApi = {
  async evaluate(amount: number): Promise<DecisionResult> {
    const { data } = await api.post<DecisionResult>("/decision", { amount });
    return data;
  },
};

export interface CreatePlanInput {
  title?: string;
  type: PlanType;
  /** ISO date string (start day). */
  date: string;
  /** Optional ISO end date for multi-day plans. */
  endDate?: string | null;
  estimatedAmount: number;
}

export interface UpdatePlanInput {
  title?: string;
  type?: PlanType;
  date?: string;
  endDate?: string | null;
  estimatedAmount?: number;
  actualAmount?: number | null;
  status?: PlanStatus;
}

export const PlansApi = {
  async list(upcomingOnly = false): Promise<PlannedEvent[]> {
    const { data } = await api.get<PlannedEvent[]>("/plans", {
      params: upcomingOnly ? { upcoming: "true" } : {},
    });
    return data;
  },
  async suggest(type: PlanType): Promise<PlanSuggestion> {
    const { data } = await api.get<PlanSuggestion>("/plans/suggest", {
      params: { type },
    });
    return data;
  },
  async create(input: CreatePlanInput): Promise<PlannedEvent> {
    const { data } = await api.post<PlannedEvent>("/plans", input);
    return data;
  },
  async update(id: string, patch: UpdatePlanInput): Promise<PlannedEvent> {
    const { data } = await api.patch<PlannedEvent>(`/plans/${id}`, patch);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/plans/${id}`);
  },
};
