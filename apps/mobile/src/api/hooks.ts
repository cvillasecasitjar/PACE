import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { CategoryId, PlanType } from "@pace/shared";
import {
  BankApi,
  BudgetsApi,
  DashboardApi,
  DecisionApi,
  PlansApi,
  TransactionsApi,
  UserApi,
  type CreatePlanInput,
  type TxFilters,
  type UpdatePlanInput,
} from "./endpoints";
import { useAuth } from "../store/auth";

export const qk = {
  dashboard: ["dashboard"] as const,
  transactions: (f: TxFilters) => ["transactions", f] as const,
  budgets: ["budgets"] as const,
  budgetSuggestions: ["budgets", "suggestions"] as const,
  connections: ["connections"] as const,
  plans: ["plans"] as const,
  planSuggestion: (type: PlanType) => ["plans", "suggest", type] as const,
};

/** Invalidate everything that depends on transaction/balance state. */
function useInvalidateFinancials() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.dashboard }),
      qc.invalidateQueries({ queryKey: ["transactions"] }),
      qc.invalidateQueries({ queryKey: qk.budgets }),
      qc.invalidateQueries({ queryKey: qk.connections }),
    ]);
}

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: DashboardApi.get });
}

export function useTransactions(filters: TxFilters = {}) {
  return useQuery({
    queryKey: qk.transactions(filters),
    queryFn: () => TransactionsApi.list(filters),
  });
}

export function useBudgets() {
  return useQuery({ queryKey: qk.budgets, queryFn: BudgetsApi.list });
}

export function useBudgetSuggestions() {
  return useQuery({
    queryKey: qk.budgetSuggestions,
    queryFn: BudgetsApi.suggestions,
  });
}

export function useConnections() {
  return useQuery({ queryKey: qk.connections, queryFn: BankApi.connections });
}

export function useSetCategory() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: CategoryId }) =>
      TransactionsApi.setCategory(id, category),
    onSuccess: invalidate,
  });
}

export function useUpsertBudget() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: ({ category, limit }: { category: CategoryId; limit: number }) =>
      BudgetsApi.upsert(category, limit),
    onSuccess: invalidate,
  });
}

export function useRemoveBudget() {
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: (category: CategoryId) => BudgetsApi.remove(category),
    onSuccess: invalidate,
  });
}

export function useSync() {
  const invalidate = useInvalidateFinancials();
  return useMutation({ mutationFn: BankApi.sync, onSuccess: invalidate });
}

export function useDecision() {
  return useMutation({ mutationFn: (amount: number) => DecisionApi.evaluate(amount) });
}

export function useAsk() {
  return useMutation({ mutationFn: (text: string) => DecisionApi.ask(text) });
}

/* -------------------------------- Plans ---------------------------------- */

export function usePlans(upcomingOnly = false) {
  return useQuery({
    queryKey: [...qk.plans, upcomingOnly] as const,
    queryFn: () => PlansApi.list(upcomingOnly),
  });
}

export function usePlanSuggestion(type: PlanType) {
  return useQuery({
    queryKey: qk.planSuggestion(type),
    queryFn: () => PlansApi.suggest(type),
  });
}

/** Plans change the dashboard's "fun money" figure, so invalidate both. */
function useInvalidatePlans() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.plans }),
      qc.invalidateQueries({ queryKey: qk.dashboard }),
    ]);
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => PlansApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePlanInput }) =>
      PlansApi.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (id: string) => PlansApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const setUser = useAuth((s) => s.setUser);
  const invalidate = useInvalidateFinancials();
  return useMutation({
    mutationFn: UserApi.update,
    onSuccess: async (user) => {
      await setUser(user);
      await invalidate();
    },
  });
}
