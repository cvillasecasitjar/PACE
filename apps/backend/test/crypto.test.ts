import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../src/lib/crypto";

/**
 * The bank token encryption is security-critical (NFR-01), so we verify both
 * that it round-trips correctly and that tampering is detected.
 */
describe("AES-256 token encryption", () => {
  it("encrypts and decrypts back to the original value", () => {
    const secret = "tink_access_token_abc123";
    const encrypted = encryptToken(secret);

    // The stored form must not contain the plaintext.
    expect(encrypted).not.toContain(secret);
    expect(decryptToken(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptToken("same-input");
    const b = encryptToken("same-input");
    expect(a).not.toBe(b);
    // ...but both still decrypt to the same value.
    expect(decryptToken(a)).toBe("same-input");
    expect(decryptToken(b)).toBe("same-input");
  });

  it("rejects tampered ciphertext (authenticated encryption)", () => {
    const encrypted = encryptToken("secret");
    const tampered = encrypted.slice(0, -2) + "00";
    expect(() => decryptToken(tampered)).toThrow();
  });
});
