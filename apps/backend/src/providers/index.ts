import type { BankProviderId } from "@pace/shared";
import { env } from "../config/env";
import type { BankProvider } from "./types";
import { MockBankProvider } from "./mock";
import { TinkBankProvider } from "./tink";

const registry: Record<string, BankProvider> = {
  mock: new MockBankProvider(),
  tink: new TinkBankProvider(),
  // plaid: new PlaidBankProvider(),  // future US/Canada coverage
};

/** Resolve a provider by id, defaulting to the configured one. */
export function getProvider(id?: BankProviderId): BankProvider {
  const key = id ?? env.bankProvider;
  const provider = registry[key];
  if (!provider) {
    throw new Error(`Unknown bank provider: ${key}`);
  }
  return provider;
}

export type { BankProvider } from "./types";
