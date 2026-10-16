import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const access = useQuery({
    queryKey: ["app_access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_app_member");
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  if (loading || (user && access.isPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (access.isError || !access.data) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p>{access.isError ? "Não foi possível verificar o acesso. Confira a conexão e a atualização do sistema." : "Sua conta precisa ser autorizada pelo responsável pelo aplicativo."}</p>
      <Button onClick={() => access.refetch()}>Tentar novamente</Button>
      <Button variant="outline" onClick={() => signOut()}>Sair</Button>
    </div>;
  }

  return <>{children}</>;
}
