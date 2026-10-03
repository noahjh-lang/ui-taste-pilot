import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface DeployConfig {
  /** CIDRs allowed to load the site. Everyone else is blocked at the edge. */
  allowedIps: string[];
  /** Where AWS Budgets sends cost alerts. */
  budgetEmail: string;
  /** Account-wide monthly budget that triggers the alerts. */
  monthlyBudgetUsd: number;
}

const CIDR = /^(\d{1,3}(\.\d{1,3}){3}\/\d{1,2}|[0-9a-fA-F:]+\/\d{1,3})$/;

/**
 * Reads infra/config.json (gitignored; see config.example.json). Fails
 * closed: a missing or empty allowlist is an error, never an open site.
 */
export function loadConfig(): DeployConfig {
  const file = path.join(__dirname, '..', 'config.json');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(
      `Missing or invalid ${file}. Copy config.example.json to config.json and fill it in.`,
    );
  }

  const config = raw as Partial<DeployConfig>;
  if (!Array.isArray(config.allowedIps) || config.allowedIps.length === 0) {
    throw new Error(
      'config.json: allowedIps must list at least one CIDR (e.g. "203.0.113.10/32").',
    );
  }
  const invalid = config.allowedIps.filter((ip) => typeof ip !== 'string' || !CIDR.test(ip));
  if (invalid.length > 0) {
    throw new Error(`config.json: invalid CIDR(s) in allowedIps: ${invalid.join(', ')}`);
  }
  if (
    typeof config.budgetEmail !== 'string' ||
    !config.budgetEmail.includes('@') ||
    config.budgetEmail.endsWith('@example.com')
  ) {
    throw new Error('config.json: budgetEmail must be your real email address for cost alerts.');
  }
  if (typeof config.monthlyBudgetUsd !== 'number' || config.monthlyBudgetUsd <= 0) {
    throw new Error('config.json: monthlyBudgetUsd must be a positive number.');
  }
  return config as DeployConfig;
}
