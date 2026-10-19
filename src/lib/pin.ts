import { clearPinUnlock } from "@/lib/pinSession";

interface PinRecord { version: 1; salt: string; hash: string; failures: number; lockedUntil: number }
const key = (userId: string) => `pulse-pin-v1:${userId}`;
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");

export function hasPin(userId: string) { return localStorage.getItem(key(userId)) !== null; }

async function digest(pin: string, salt: string) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = new Uint8Array(salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 210000 }, material, 256);
  return hex(new Uint8Array(bits));
}

export async function createPin(userId: string, pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error("O PIN deve ter exatamente 4 números.");
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const record: PinRecord = { version: 1, salt, hash: await digest(pin, salt), failures: 0, lockedUntil: 0 };
  localStorage.setItem(key(userId), JSON.stringify(record));
  clearPinUnlock(userId);
}

export async function verifyPin(userId: string, pin: string) {
  const raw = localStorage.getItem(key(userId));
  if (!raw) throw new Error("Cadastre seu PIN neste aparelho.");
  let record: PinRecord;
  try { record = JSON.parse(raw); } catch { throw new Error("Redefina o PIN usando a senha da conta."); }
  if (record.version !== 1 || !/^[a-f0-9]{32}$/.test(record.salt) || !/^[a-f0-9]{64}$/.test(record.hash)
    || !Number.isFinite(record.failures) || !Number.isFinite(record.lockedUntil))
    throw new Error("Redefina o PIN usando a senha da conta.");
  if (record.lockedUntil > Date.now())
    throw new Error(`Aguarde ${Math.ceil((record.lockedUntil - Date.now()) / 1000)} segundos antes de tentar novamente.`);
  if (!/^\d{4}$/.test(pin) || await digest(pin, record.salt) !== record.hash) {
    record.failures++;
    if (record.failures >= 5) record.lockedUntil = Date.now() + Math.min(900000, 60000 * 2 ** Math.floor((record.failures - 5) / 5));
    localStorage.setItem(key(userId), JSON.stringify(record));
    throw new Error(record.lockedUntil > Date.now() ? `Muitas tentativas. Aguarde ${Math.ceil((record.lockedUntil - Date.now()) / 60000)} minuto(s) antes de tentar novamente.` : "PIN incorreto.");
  }
  localStorage.setItem(key(userId), JSON.stringify({ ...record, failures: 0, lockedUntil: 0 }));
}

// Only call after a successful password reauthentication for this same user.
export function removePin(userId: string) { localStorage.removeItem(key(userId)); clearPinUnlock(userId); }
