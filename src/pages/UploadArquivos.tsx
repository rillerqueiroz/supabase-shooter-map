import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTitulosInsercoes } from "@/hooks/useTitulosInsercoes";
import { Upload, FileSpreadsheet, ExternalLink, Clock, FileText, FlaskConical } from "lucide-react";
import logoSuperavit from "@/assets/logo-superavit.png";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function UploadArquivos() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: insercoes, isLoading } = useTitulosInsercoes();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) setSelectedFile(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        toast.error("A planilha está vazia.");
        setUploading(false);
        return;
      }

      // Map spreadsheet columns to table columns
      const records = rows.map((row, idx) => {
        const id = row.id || `upload-${Date.now()}-${idx}`;
        return {
          id: String(id),
          documento: row.documento ?? null,
          tipo_documento: row.tipo_documento ?? null,
          serie_documento: row.serie_documento ?? null,
          codigo_parceiro: row.codigo_parceiro ?? null,
          nome_parceiro: row.nome_parceiro ?? null,
          cnpj_cpf: row.cnpj_cpf ?? null,
          numero_parcela: row.numero_parcela ?? null,
          valor_parcela: row.valor_parcela ?? null,
          saldo_parcela: row.saldo_parcela ?? null,
          data_documento: row.data_documento ?? null,
          data_vencimento: row.data_vencimento ?? null,
          dias_atraso: row.dias_atraso ?? null,
          observacoes: row.observacoes ?? null,
          forma_pagamento: row.forma_pagamento ?? null,
          status_boleto: row.status_boleto ?? null,
          filial: row.filial ?? null,
          vendedor: row.vendedor ?? null,
          uf_cobranca: row.uf_cobranca ?? null,
          municipio_cobranca: row.municipio_cobranca ?? null,
          inserido_cedrus: row.inserido_cedrus ?? false,
          id_titulo_cedrus: row.id_titulo_cedrus ?? null,
          credor_cedrus: row.credor_cedrus ?? null,
          processado_internamente: row.processado_internamente ?? null,
          status_titulo: row.status_titulo ?? null,
          status_cedrus: row.status_cedrus ?? null,
          etapa: row.etapa ?? null,
          tipo_titulo: row.tipo_titulo ?? null,
          id_negociacao_cedrus: row.id_negociacao_cedrus ?? null,
          linha_digitavel: row.linha_digitavel ?? null,
          data_pagamento: row.data_pagamento ?? null,
          valor_pago: row.valor_pago ?? null,
          nome_fantasia: row.nome_fantasia ?? null,
          fone1: row.fone1 ?? null,
          fone2: row.fone2 ?? null,
          email: row.email ?? null,
          endereco: row.endereco ?? null,
          numero_endereco: row.numero_endereco ?? null,
          complemento: row.complemento ?? null,
          bairro: row.bairro ?? null,
          cidade: row.cidade ?? null,
          uf: row.uf ?? null,
          tipo_negocio: row.tipo_negocio ?? null,
          cod_devedor_cedrus: row.cod_devedor_cedrus ?? null,
          negativado: row.negativado ?? false,
          bloqueado: row.bloqueado ?? false,
        };
      });

      // Insert in batches of 500
      const batchSize = 500;
      let totalInserted = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from("base_tudobelo_para_testes")
          .upsert(batch, { onConflict: "id" });

        if (error) throw error;
        totalInserted += batch.length;
      }

      toast.success(`${totalInserted} registros inseridos na base de testes!`);
      setSelectedFile(null);
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error(`Erro ao processar arquivo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatDateStr = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src={logoSuperavit} alt="Superávit" className="h-10" />
        <div>
          <h1 className="text-2xl font-bold">Upload de Arquivos</h1>
          <p className="text-muted-foreground text-sm">
            Envio de planilhas e arquivos CSV para importação de dados
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Arquivo para Base de Testes
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 ml-2">
              <FlaskConical className="h-3 w-3 mr-1" />
              Testes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              Arraste e solte o arquivo aqui
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Formatos aceitos: .xlsx, .xls, .csv — Os dados serão inseridos na tabela de testes
            </p>
            <Input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {selectedFile && (
            <div className="mt-4 flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setSelectedFile(null)} variant="ghost">
                  Remover
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Enviando..." : "Enviar para Base de Testes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Inserções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Inserções
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !insercoes?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma inserção encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome do Arquivo</TableHead>
                    <TableHead className="text-center">Qtd. Inserida</TableHead>
                    <TableHead>Google Drive</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insercoes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateStr(item.created_at)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {item.nome_arquivo || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {item.quantidade_inserida || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.id_google_drive ? (
                          <a
                            href={`https://drive.google.com/file/d/${item.id_google_drive}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
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
}
