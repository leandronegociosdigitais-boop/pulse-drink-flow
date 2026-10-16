import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Share, Smartphone, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Instalar() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if already installed
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <AppLayout>
      <PageHeader title="Instalar App" showBack />

      <div className="p-4 space-y-4">
        {isInstalled ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-primary mb-2">
                App já instalado!
              </h2>
              <p className="text-muted-foreground">
                O Bebidas Manager já está instalado no seu dispositivo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Instale o App
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Instale o Bebidas Manager no seu celular para acesso rápido, 
                  funcionamento offline e experiência completa de aplicativo.
                </p>
                
                {deferredPrompt ? (
                  <Button className="w-full glow-neon" onClick={handleInstall}>
                    <Download className="w-4 h-4 mr-2" />
                    Instalar Agora
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {isIOS ? (
                      <div className="p-4 rounded-lg bg-muted">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Share className="w-4 h-4" />
                          Como instalar no iPhone/iPad:
                        </h3>
                        <ol className="text-sm space-y-2 text-muted-foreground">
                          <li>1. Toque no botão <strong>Compartilhar</strong> (ícone de seta)</li>
                          <li>2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                          <li>3. Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
                        </ol>
                      </div>
                    ) : isAndroid ? (
                      <div className="p-4 rounded-lg bg-muted">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Como instalar no Android:
                        </h3>
                        <ol className="text-sm space-y-2 text-muted-foreground">
                          <li>1. Toque no menu do navegador (três pontos)</li>
                          <li>2. Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></li>
                          <li>3. Confirme a instalação</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-muted">
                        <h3 className="font-semibold mb-2">Instalação:</h3>
                        <p className="text-sm text-muted-foreground">
                          Use o menu do navegador para instalar este aplicativo na sua tela inicial.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vantagens do App</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Acesso rápido pela tela inicial
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Funciona mesmo sem internet
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Experiência em tela cheia
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Carregamento mais rápido
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate("/")}
        >
          Voltar ao Dashboard
        </Button>
      </div>
    </AppLayout>
  );
}
