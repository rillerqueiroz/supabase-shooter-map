import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  User, 
  Check, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Download,
  Eye,
  MapPin,
  Mail,
  Phone,
  Camera,
  Calendar,
  RefreshCw,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Signer {
  name: string;
  email: string;
  phone_number: string;
  status: 'signed' | 'new' | 'pending' | string;
  sign_url: string;
  signed_at: string | null;
  last_view_at: string | null;
  times_viewed: number;
  geo_latitude: string | null;
  geo_longitude: string | null;
  signature_image: string | null;
  selfie_photo_url: string | null;
  ip: string | null;
}

interface DocumentData {
  name: string;
  status: string;
  folder_path: string;
  original_file: string;
  signed_file: string;
  created_at: string;
  last_update_at: string;
  created_by: { email: string };
  signers: Signer[];
  token: string;
  use_timestamp: boolean;
  deleted?: boolean;
  deleted_at?: string | null;
}

interface DocumentoZapsignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
}

const WEBHOOK_URL = 'https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/consulta-documento-zapsign';

export function DocumentoZapsignModal({ open, onOpenChange, token }: DocumentoZapsignModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);

  const fetchDocumentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();
      
      // O webhook retorna um array, pegar o primeiro elemento
      const doc = Array.isArray(data) ? data[0] : data;
      setDocumentData(doc);
    } catch (err) {
      console.error('Erro ao buscar documento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar documento');
      toast.error('Erro ao buscar informações do documento');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && token) {
      fetchDocumentData();
    } else {
      setDocumentData(null);
      setError(null);
    }
  }, [open, token]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><Check className="h-3 w-3" /> Assinado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'new':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aguardando</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string, deleted?: boolean) => {
    if (deleted) {
      return <Badge variant="destructive" className="gap-1 text-sm"><Trash2 className="h-3 w-3" /> APAGADO</Badge>;
    }
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><Check className="h-3 w-3" /> Concluído</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Documento
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchDocumentData} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
          ) : documentData ? (
            <div className="space-y-6">
              {/* Alerta de Documento Apagado */}
              {documentData.deleted && (
                <Alert variant="destructive" className="border-2 border-destructive bg-destructive/10">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="text-lg font-bold flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    DOCUMENTO APAGADO
                  </AlertTitle>
                  <AlertDescription className="mt-2 text-base">
                    Este documento foi excluído do ZapSign em{' '}
                    <strong>{documentData.deleted_at ? formatDate(documentData.deleted_at) : 'data desconhecida'}</strong>.
                    <br />
                    Os links de assinatura não estão mais disponíveis e o documento não pode ser recuperado.
                  </AlertDescription>
                </Alert>
              )}

              {/* Informações do Documento */}
              <Card className={documentData.deleted ? 'opacity-75 border-destructive' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Informações do Documento</span>
                    {getDocumentStatusBadge(documentData.status, documentData.deleted)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome do Documento</p>
                      <p className="font-medium">{documentData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pasta</p>
                      <p className="font-medium text-sm">{documentData.folder_path || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Criado em</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(documentData.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Última Atualização</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(documentData.last_update_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Criado por</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {documentData.created_by?.email || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Carimbo de Tempo</p>
                      <p className="font-medium">{documentData.use_timestamp ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {documentData.original_file && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={documentData.original_file} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Original
                        </a>
                      </Button>
                    )}
                    {documentData.signed_file && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={documentData.signed_file} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Assinado
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Signatários */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Signatários ({documentData.signers?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {documentData.signers?.map((signer, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-lg">{signer.name}</p>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                              {signer.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {signer.email}
                                </span>
                              )}
                              {signer.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {signer.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(signer.status)}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Visualizações</p>
                            <p className="font-medium flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {signer.times_viewed}x
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Última Visualização</p>
                            <p className="font-medium">{signer.last_view_at ? formatDate(signer.last_view_at) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Assinado em</p>
                            <p className="font-medium">{signer.signed_at ? formatDate(signer.signed_at) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">IP</p>
                            <p className="font-medium">{signer.ip || '-'}</p>
                          </div>
                        </div>

                        {(signer.geo_latitude && signer.geo_longitude) && (
                          <div className="text-sm">
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Localização
                            </p>
                            <p className="font-medium">
                              {signer.geo_latitude}, {signer.geo_longitude}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {signer.sign_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={signer.sign_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Link de Assinatura
                              </a>
                            </Button>
                          )}
                          {signer.signature_image && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={signer.signature_image} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3 mr-1" />
                                Ver Assinatura
                              </a>
                            </Button>
                          )}
                          {signer.selfie_photo_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={signer.selfie_photo_url} target="_blank" rel="noopener noreferrer">
                                <Camera className="h-3 w-3 mr-1" />
                                Ver Selfie
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
