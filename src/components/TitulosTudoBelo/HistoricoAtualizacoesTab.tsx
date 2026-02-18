import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTitulosInsercoes } from "@/hooks/useTitulosInsercoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  FileUp,
  Search,
  ExternalLink,
} from "lucide-react";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

export function HistoricoAtualizacoesTab() {
  const [searchInsercoes, setSearchInsercoes] = useState("");

  const { data: insercoes, isLoading: loadingInsercoes } = useTitulosInsercoes();

  const filteredInsercoes = insercoes?.filter((i) =>
    i.nome_arquivo?.toLowerCase().includes(searchInsercoes.toLowerCase()) ||
    i.id_google_drive?.toLowerCase().includes(searchInsercoes.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Histórico de Inserções de Arquivos</CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivo..."
                value={searchInsercoes}
                onChange={(e) => setSearchInsercoes(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingInsercoes ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome do Arquivo</TableHead>
                  <TableHead>Quantidade Inserida</TableHead>
                  <TableHead>Google Drive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInsercoes.map((insercao) => (
                  <TableRow key={insercao.id}>
                    <TableCell className="font-medium">
                      {formatDate(insercao.created_at)}
                    </TableCell>
                    <TableCell>{insercao.nome_arquivo || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {insercao.quantidade_inserida || "0"} títulos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {insercao.id_google_drive ? (
                        <a
                          href={`https://drive.google.com/file/d/${insercao.id_google_drive}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver arquivo
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInsercoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      Nenhuma inserção encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
