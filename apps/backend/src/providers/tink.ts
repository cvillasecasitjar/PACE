import type {
  BankProvider,
  InitiateResult,
  ProviderTransaction,
} from "./types";
import { env } from "../config/env";

/**
 * Tink (Europe) adapter — STUB.
 *
 * This is wired into the same `BankProvider` interface as the mock provider.
 * When you obtain Tink sandbox credentials, implement the methods below using
 * Tink's REST API and set BANK_PROVIDER=tink in the environment. No other part
 * of Pace needs to change.
 *
 * Real flow outline (PSD2 / AISP, read-only):
 *  1. initiateConnection → create a Tink "link" and return its `authUrl`. The
 *     mobile app opens it; the user authenticates with their bank (SCA).
 *  2. Tink redirects back with a code → exchange for a read-only access token.
 *  3. fetchTransactions / fetchBalance → call Tink's /data/v2 endpoints.
 *  4. revoke → DELETE the consent so the token is invalidated immediately.
 *
 * Docs: https://docs.tink.com/
 */
export class TinkBankProvider implements BankProvider {
  readonly id = "tink" as const;

  private ensureConfigured(): void {
    if (!env.tink.clientId || !env.tink.clientSecret) {
      throw new Error(
        "Tink provider selected but TINK_CLIENT_ID / TINK_CLIENT_SECRET are not set. " +
          "Add sandbox credentials to .env, or set BANK_PROVIDER=mock for local dev."
      );
    }
  }

  async initiateConnection(_opts: {
    userId: string;
    institution?: string;
  }): Promise<InitiateResult> {
    this.ensureConfigured();
    // TODO: POST to Tink to create a link, return { token: "", accounts: [], authUrl }.
    throw new Error("Tink adapter not implemented yet — use BANK_PROVIDER=mock.");
  }

  async fetchTransactions(_opts: {
    token: string;
    accountId: string;
    since?: string;
  }): Promise<ProviderTransaction[]> {
    this.ensureConfigured();
    throw new Error("Tink adapter not implemented yet — use BANK_PROVIDER=mock.");
  }

  async fetchBalance(_opts: {
    token: string;
    accountId: string;
  }): Promise<number> {
    this.ensureConfigured();
    throw new Error("Tink adapter not implemented yet — use BANK_PROVIDER=mock.");
  }

  async revoke(_opts: { token: string }): Promise<void> {
    this.ensureConfigured();
    // TODO: call Tink to delete the consent / credential.
  }
}
