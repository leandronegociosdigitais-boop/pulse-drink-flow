import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, AlertTriangle, Check, Database } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { backupSchema, downloadBackup, exportBackup, restoreBackup } from "@/lib/backup";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";



export default function Backup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backup = await exportBackup();
      downloadBackup(backup, `backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`);

      toast({ title: "Backup exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({ title: "Erro ao exportar backup", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const backup = backupSchema.parse(JSON.parse(await file.text()));
      if (!confirm("Substituir os dados atuais por este backup? Uma cópia de segurança dos dados atuais será baixada antes da restauração.")) return;
      const current = await exportBackup();
      downloadBackup(current, `antes-restauracao-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`);
      await restoreBackup(backup);
      queryClient.removeQueries();

      toast({ title: "Backup restaurado com sucesso!" });
      navigate("/");
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({ 
        title: "Erro ao restaurar backup", 
        description: error instanceof Error ? error.message : "Arquivo inválido",
        variant: "destructive" 
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleClearAll = async () => {
    if (!confirm("ATENÇÃO: Isso irá apagar TODOS os dados do aplicativo. Deseja continuar?")) {
      return;
    }
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita!")) {
      return;
    }

    setIsImporting(true);
    try {
      const current = await exportBackup();
      downloadBackup(current, `antes-limpeza-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`);
      await restoreBackup({ version: "1.2", created_at: new Date().toISOString(),
        products: [], customers: [], sales: [], sale_items: [], purchases: [], purchase_batches: [],
        inventory_movements: [], bills: [], cash_flow: [], sale_batch_consumptions: [],
        app_settings: current.app_settings || [], });
      queryClient.removeQueries();

      toast({ title: "Dados limpos com sucesso!" });
      navigate("/");
    } catch (error) {
      console.error("Erro ao limpar:", error);
      toast({ title: "Erro ao limpar dados", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Backup & Restauração" showBack />

      <div className="p-4 space-y-4 pb-24">
        <Alert>
          <Database className="w-4 h-4" />
          <AlertTitle>Backup de Dados</AlertTitle>
          <AlertDescription>
            Faça backup dos seus dados regularmente para evitar perdas. O arquivo de backup contém 
            todos os produtos, vendas, clientes e registros financeiros.
          </AlertDescription>
        </Alert>

        {/* Exportar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Exportar Backup
            </CardTitle>
            <CardDescription>
              Baixe um arquivo com todos os dados do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || isImporting}
              className="w-full"
            >
              {isExporting ? "Exportando..." : "Exportar Dados"}
            </Button>
          </CardContent>
        </Card>

        {/* Importar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Restaurar Backup
            </CardTitle>
            <CardDescription>
              Restaure dados de um arquivo de backup anterior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Atenção: Restaurar um backup irá substituir todos os dados atuais!
              </AlertDescription>
            </Alert>
            <div className="relative">
              <Input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting || isExporting}
                className="cursor-pointer"
              />
            </div>
            {isImporting && (
              <p className="text-sm text-muted-foreground text-center">
                Restaurando backup...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Limpar dados */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Zerar Aplicativo
            </CardTitle>
            <CardDescription>
              Apaga todos os dados e começa do zero
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={isImporting || isExporting}
              className="w-full"
            >
              Apagar Todos os Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
