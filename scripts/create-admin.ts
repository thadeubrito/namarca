import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, user } from "@/db/auth-schema";

export function provisionedEmail() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set a valid ADMIN_EMAIL");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return email;
}

export class PasswordInputError extends Error {}

/** TTY only: no argv, terminal echo, shell history, or accidental CI logs. */
export async function hiddenPrompt(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new PasswordInputError("Execute em um terminal interativo: docker compose exec app npm run admin:create. Não use -T nem pipes.");
  process.stdout.write(label);
  const input = process.stdin;
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003" || char === "\u0004") { finish(new PasswordInputError("Operação cancelada; nenhuma conta criada.")); return; }
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && char !== "\u001b") value += char;
      }
    };
    input.on("data", onData);
  });
}
export function validatePasswordInput(password: string, confirmation?: string) {
  if (password.length < 8 || password.length > 128) throw new PasswordInputError("A senha deve ter entre 8 e 128 caracteres. Execute o comando novamente.");
  if (confirmation !== undefined && password !== confirmation) throw new PasswordInputError("As senhas não coincidem. Execute o comando novamente.");
}
export async function newPasswordHash() {
  const password = await hiddenPrompt("Nova senha do administrador (oculta, 8–128 caracteres): ");
  validatePasswordInput(password);
  const confirmation = await hiddenPrompt("Confirme a senha (oculta): ");
  validatePasswordInput(password, confirmation);
  return hashPassword(password);
}
async function main() {
  if (process.argv.length !== 2) throw new Error("Do not pass secrets or arguments; use the interactive prompt");
  const email = provisionedEmail();
  const password = await newPasswordHash();
  await db.transaction(async (tx) => {
    const id = randomUUID();
    await tx.insert(user).values({ id, name: "Administrador", email, emailVerified: true, twoFactorEnabled: false });
    await tx.insert(account).values({ id: randomUUID(), userId: id, accountId: id, providerId: "credential", password });
  });
  console.info("Administrator provisioned. Sign in and enroll TOTP before accessing administrative operations.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(() => process.exit(0)).catch((error: unknown) => {
    // Only known input errors are safe to display; never print DB errors or input.
    console.error(error instanceof PasswordInputError ? error.message : "Não foi possível criar o administrador. Verifique configuração/migrations e se a conta já existe; nenhuma conta existente foi alterada.");
    process.exit(1);
  });
}
