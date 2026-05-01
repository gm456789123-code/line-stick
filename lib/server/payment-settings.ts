import { db } from "./db";

export type PaymentSettings = {
  promptPayNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  promptPayNumber: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
};

async function ensurePaymentSettingsTable(): Promise<void> {
  await db().execute(`
    CREATE TABLE IF NOT EXISTS cms_payment_settings (
      id TINYINT UNSIGNED PRIMARY KEY,
      promptpay_number VARCHAR(32) NOT NULL DEFAULT '',
      bank_name VARCHAR(120) NOT NULL DEFAULT '',
      bank_account_name VARCHAR(120) NOT NULL DEFAULT '',
      bank_account_number VARCHAR(64) NOT NULL DEFAULT '',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  await ensurePaymentSettingsTable();
  const [rows] = await db().execute(
    "SELECT promptpay_number, bank_name, bank_account_name, bank_account_number FROM cms_payment_settings WHERE id = 1 LIMIT 1"
  );
  const row = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined;
  if (!row) return DEFAULT_PAYMENT_SETTINGS;

  return {
    promptPayNumber: String(row.promptpay_number ?? ""),
    bankName: String(row.bank_name ?? ""),
    bankAccountName: String(row.bank_account_name ?? ""),
    bankAccountNumber: String(row.bank_account_number ?? ""),
  };
}

export async function upsertPaymentSettings(input: Partial<PaymentSettings>): Promise<PaymentSettings> {
  await ensurePaymentSettingsTable();
  const current = await getPaymentSettings();
  const next: PaymentSettings = {
    promptPayNumber: String(input.promptPayNumber ?? current.promptPayNumber ?? "").trim(),
    bankName: String(input.bankName ?? current.bankName ?? "").trim(),
    bankAccountName: String(input.bankAccountName ?? current.bankAccountName ?? "").trim(),
    bankAccountNumber: String(input.bankAccountNumber ?? current.bankAccountNumber ?? "").trim(),
  };

  await db().execute(
    `INSERT INTO cms_payment_settings
      (id, promptpay_number, bank_name, bank_account_name, bank_account_number)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      promptpay_number = VALUES(promptpay_number),
      bank_name = VALUES(bank_name),
      bank_account_name = VALUES(bank_account_name),
      bank_account_number = VALUES(bank_account_number)`,
    [next.promptPayNumber, next.bankName, next.bankAccountName, next.bankAccountNumber]
  );

  return next;
}
