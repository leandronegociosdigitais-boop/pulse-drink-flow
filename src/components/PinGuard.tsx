import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePinLock } from "@/contexts/PinContext";
import { createPin, hasPin, removePin, verifyPin } from "@/lib/pin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PinGuard({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { unlockedFor, unlock } = usePinLock();
  const [mode, setMode] = useState<"pin" | "recover">("pin");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  if (unlockedFor === user.id) return <>{children}</>;
  let configured = true;
  try { configured = hasPin(user.id); } catch { /* Storage errors are displayed on submit; do not expose the app. */ }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (mode === "recover") {
        if (!user.email) throw new Error("Entre novamente com sua conta para redefinir o PIN.");
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (authError || data.user?.id !== user.id) throw new Error("Não foi possível confirmar sua senha.");
        removePin(user.id);
        setMode("pin"); setPassword(""); setPin(""); setConfirmation("");
      } else {
        if (configured) await verifyPin(user.id, pin);
        else {
          if (pin !== confirmation) throw new Error("Os números digitados não coincidem.");
          await createPin(user.id, pin);
        }
        setPin(""); setConfirmation(""); unlock(user.id);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível desbloquear. Tente novamente.");
      setPin(""); setPassword("");
    } finally { setBusy(false); }
  };

  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <LockKeyhole className="mx-auto h-10 w-10 text-primary mb-2" />
        <CardTitle>{mode === "recover" ? "Redefinir PIN" : configured ? "Desbloquear aplicativo" : "Cadastre seu PIN"}</CardTitle>
        <CardDescription>{mode === "recover" ? "Confirme a senha da conta para cadastrar um novo PIN." : configured
          ? "Digite seu PIN de 4 números. O acesso permanece liberado nesta sessão, mesmo ao atualizar ou trocar de aba." : "Escolha 4 números para desbloquear neste aparelho ao iniciar uma nova sessão."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {mode === "recover" ? <div className="space-y-2">
            <Label htmlFor="recover-password">Senha da conta</Label>
            <Input id="recover-password" type="password" autoComplete="current-password" required
              value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
          </div> : <>
            <div className="space-y-2"><Label htmlFor="app-pin">PIN de 4 números</Label>
              <Input id="app-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4}
                autoComplete="off" required value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em]" disabled={busy} />
            </div>
            {!configured && <div className="space-y-2"><Label htmlFor="confirm-pin">Confirme o PIN</Label>
              <Input id="confirm-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4}
                autoComplete="off" required value={confirmation} onChange={event => setConfirmation(event.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em]" disabled={busy} />
            </div>}
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Verificando..." : mode === "recover" ? "Confirmar senha" : configured ? "Desbloquear" : "Salvar PIN e entrar"}</Button>
          {configured && mode === "pin" && <Button type="button" variant="ghost" className="w-full" disabled={busy}
            onClick={() => { setMode("recover"); setError(""); setPin(""); }}>Esqueci meu PIN</Button>}
          {mode === "recover" && <Button type="button" variant="ghost" className="w-full" disabled={busy}
            onClick={() => { setMode("pin"); setPassword(""); setError(""); }}>Voltar</Button>}
          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => signOut()}>Sair da conta</Button>
        </form>
      </CardContent>
    </Card>
  </div>;
}
