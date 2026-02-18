import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShieldCheck } from "lucide-react";
import { useGestaoAcessoSistemas, SISTEMAS, type SistemaKey } from "@/hooks/useGestaoAcessoSistemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const GestaoAcessoSistemas = () => {
  const { profiles, isLoading, toggleSistema, isToggling } = useGestaoAcessoSistemas();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = profiles?.filter(
    (p) =>
      p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Gestão de Acesso a Todos os Sistemas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários e Sistemas</CardTitle>
          <CardDescription>
            Configure quais sistemas cada usuário pode acessar. Os papéis (roles) são exibidos para referência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Usuário</TableHead>
                    <TableHead className="min-w-[120px]">Papéis</TableHead>
                    {SISTEMAS.map((s) => (
                      <TableHead key={s.key} className="text-center min-w-[110px]">
                        {s.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{profile.nome}</div>
                          <div className="text-xs text-muted-foreground">{profile.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profile.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sem papel</span>
                          ) : (
                            profile.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      {SISTEMAS.map((s) => (
                        <TableCell key={s.key} className="text-center">
                          <Switch
                            checked={profile[s.key]}
                            disabled={isToggling}
                            onCheckedChange={(checked) =>
                              toggleSistema({
                                userId: profile.id,
                                sistema: s.key,
                                value: checked,
                              })
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoAcessoSistemas;
