import axios from "axios";
import { useCallback } from "react";
import { useT } from "../i18n";

/**
 * The kinds of failure we show the user, each mapped to a localized message
 * (see the "errors.*" keys in i18n/translations.ts). Keeping this list small
 * and meaningful is intentional: users don't need HTTP jargon, they need to
 * know whether to check their wifi, fix their input, or just retry.
 */
export type ErrorKind =
  | "network" // request never reached the server (wifi, server down, wrong IP)
  | "timeout" // server too slow to answer
  | "server" // server answered with a 5xx
  | "invalidCredentials" // 401/403 — wrong email/password or expired session
  | "emailTaken" // 409 — registering an email that already exists
  | "generic"; // anything else

export function classifyError(error: unknown): ErrorKind {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return "timeout";
    if (!error.response) return "network";
    const status = error.response.status;
    if (status === 401 || status === 403) return "invalidCredentials";
    if (status === 409) return "emailTaken";
    if (status >= 500) return "server";
  }
  return "generic";
}

/**
 * Hook returning a function that turns any thrown error into a friendly,
 * localized message ready to show in the UI.
 */
export function useErrorText() {
  const { t } = useT();
  return useCallback(
    (error: unknown): string => t(`errors.${classifyError(error)}`),
    [t]
  );
}
