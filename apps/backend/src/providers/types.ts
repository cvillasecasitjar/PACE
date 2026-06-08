import type { BankProviderId } from "@pace/shared";

/** Normalised account returned by any Open Banking provider. */
export interface ProviderAccount {
  accountId: string;
  institutionName: string;
  mask: string;
  currency: string;
  balance: number;
}

/** Normalised transaction returned by any Open Banking provider. */
export interface ProviderTransaction {
  externalId: string;
  amount: number; // negative = expense
  currency: string;
  description: string;
  merchant: string | null;
  date: string; // ISO date
  /** Provider's own category hint, if any (we still run our own engine). */
  rawCategory?: string;
}

export interface InitiateResult {
  /** Opaque, read-only (AISP) access token issued by the provider. */
  token: string;
  accounts: ProviderAccount[];
  /**
   * For real providers (Tink/Plaid) the user must be redirected to the bank's
   * SCA screen first. This URL drives that flow. Mock provider returns null
   * because it completes instantly.
   */
  authUrl: string | null;
}

/**
 * Abstraction every Open Banking provider implements. The rest of Pace only
 * ever talks to this interface — swapping mock → Tink → Plaid requires no
 * changes to routes, services or the mobile app (7.2 adapter layer).
 */
export interface BankProvider {
  readonly id: BankProviderId;

  /**
   * Begin a connection. In a real provider this kicks off the OAuth2 + SCA
   * flow and returns an authUrl; the mock provider returns a token immediately.
   */
  initiateConnection(opts: {
    userId: string;
    institution?: string;
  }): Promise<InitiateResult>;

  /** Pull transactions for an account since an optional ISO date. */
  fetchTransactions(opts: {
    token: string;
    accountId: string;
    since?: string;
  }): Promise<ProviderTransaction[]>;

  /** Fetch the live balance for an account. */
  fetchBalance(opts: { token: string; accountId: string }): Promise<number>;

  /** Revoke the token on the provider side (immediate disconnect, FR-02). */
  revoke(opts: { token: string }): Promise<void>;
}
