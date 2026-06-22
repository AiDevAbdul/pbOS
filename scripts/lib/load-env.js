import { config as dotenvConfig } from "dotenv";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../..");

export function resolveEnvPath() {
  if (process.env.PBOS_ENV_FILE && existsSync(process.env.PBOS_ENV_FILE)) {
    return process.env.PBOS_ENV_FILE;
  }
  const userScoped = join(homedir(), ".config", "pbos", ".env");
  if (existsSync(userScoped)) return userScoped;
  const repoLocal = join(REPO_ROOT, ".env");
  if (existsSync(repoLocal)) return repoLocal;
  return null;
}

export function loadEnv({ silent = true } = {}) {
  // pbOS Phase 1 is fully offline; a missing .env is normal, so default to silent.
  const path = resolveEnvPath();
  if (!path) {
    if (!silent) {
      console.error(
        "[pbos] No .env found. Place secrets at ~/.config/pbos/.env (chmod 600) " +
          "or set PBOS_ENV_FILE to an explicit path."
      );
    }
    return null;
  }
  dotenvConfig({ path });
  return path;
}

/**
 * Fail-closed env preflight. Throws with an actionable message listing every
 * missing var, so a misconfigured plugin halts at startup instead of failing
 * deep inside an API call. Treats empty/whitespace values as missing.
 */
export function requireEnv(names, context = "pbos") {
  const missing = names.filter((n) => !process.env[n] || !process.env[n].trim());
  if (missing.length) {
    throw new Error(
      `[${context}] Missing required env: ${missing.join(", ")}. ` +
        "Set them in ~/.config/pbos/.env (see .env.example), or via PBOS_ENV_FILE."
    );
  }
}
