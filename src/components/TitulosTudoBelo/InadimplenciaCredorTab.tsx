import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";
import { useTitulosFormasPagamento } from "@/hooks/useTitulosFormasPagamento";
import { Building2, FileText, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";

interface InadimplenciaCredorTabProps {
  titulos: TituloTudoBelo[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

interface CredorData {
  credor: string;
  formasPagamento: string[];
  titulos: TituloTudoBelo[];
  totalTitulos: number;
  valorTotal: number;
  saldoTotal: number;
  titulosVencidos: number;
  valorVencido: number;
  saldoVencido: number;
  taxaInadimplencia: number;
}

export function InadimplenciaCredorTab({ titulos }: InadimplenciaCredorTabProps) {
  const { data: formasPagamento, isLoading: loadingFormas } = useTitulosFormasPagamento();

  // Criar mapa de forma de pagamento -> credor
  const formaPagamentoToCredor = useMemo(() => {
    const map: Record<string, string> = {};
    formasPagamento?.forEach((fp) => {
      if (fp.forma_pagamento && fp.credor_cedrus) {
        map[fp.forma_pagamento] = fp.credor_cedrus;
      }
    });
    return map;
  }, [formasPagamento]);

  // Agrupar títulos por credor
  const dadosPorCredor = useMemo(() => {
    const credoresMap: Record<string, CredorData> = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    titulos.forEach((titulo) => {
      const formaPagamento = titulo.forma_pagamento;
      const credor = formaPagamento ? formaPagamentoToCredor[formaPagamento] || "Não vinculado" : "Não vinculado";

      if (!credoresMap[credor]) {
        credoresMap[credor] = {
          credor,
          formasPagamento: [],
          titulos: [],
          totalTitulos: 0,
          valorTotal: 0,
          saldoTotal: 0,
          titulosVencidos: 0,
          valorVencido: 0,
          saldoVencido: 0,
          taxaInadimplencia: 0,
        };
      }

      credoresMap[credor].titulos.push(titulo);
      credoresMap[credor].totalTitulos++;
      credoresMap[credor].valorTotal += titulo.valor_parcela || 0;
      credoresMap[credor].saldoTotal += titulo.saldo_parcela || 0;

      if (formaPagamento && !credoresMap[credor].formasPagamento.includes(formaPagamento)) {
        credoresMap[credor].formasPagamento.push(formaPagamento);
      }

      // Verificar se está vencido
      if (titulo.data_vencimento) {
        try {
          const [year, month, day] = titulo.data_vencimento.split('T')[0].split('-').map(Number);
          const vencimento = new Date(year, month - 1, day);
          if (vencimento < hoje && (titulo.status_titulo === 'Vencido' || titulo.status_titulo === 'A vencer')) {
            credoresMap[credor].titulosVencidos++;
            credoresMap[credor].valorVencido += titulo.valor_parcela || 0;
            credoresMap[credor].saldoVencido += titulo.saldo_parcela || 0;
          }
        } catch {
          // Ignorar erros de data
        }
      }
    });

    // Calcular taxa de inadimplência para cada credor
    Object.values(credoresMap).forEach((credor) => {
      credor.taxaInadimplencia = credor.totalTitulos > 0 
        ? (credor.titulosVencidos / credor.totalTitulos) * 100 
        : 0;
      credor.formasPagamento.sort();
    });

    // Ordenar por saldo vencido (decrescente)
    return Object.values(credoresMap).sort((a, b) => b.saldoVencido - a.saldoVencido);
  }, [titulos, formaPagamentoToCredor]);

  // Métricas gerais
  const metricas = useMemo(() => {
    const totalCredores = dadosPorCredor.filter(c => c.credor !== "Não vinculado").length;
    const totalTitulosVencidos = dadosPorCredor.reduce((sum, c) => sum + c.titulosVencidos, 0);
    const totalSaldoVencido = dadosPorCredor.reduce((sum, c) => sum + c.saldoVencido, 0);
    const totalSaldoGeral = dadosPorCredor.reduce((sum, c) => sum + c.saldoTotal, 0);
    const taxaGeralInadimplencia = totalSaldoGeral > 0 ? (totalSaldoVencido / totalSaldoGeral) * 100 : 0;

    return {
      totalCredores,
      totalTitulosVencidos,
      totalSaldoVencido,
      totalSaldoGeral,
      taxaGeralInadimplencia,
    };
  }, [dadosPorCredor]);

  if (loadingFormas) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Credores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalCredores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Títulos Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metricas.totalTitulosVencidos.toLocaleString("pt-BR")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Saldo Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metricas.totalSaldoVencido)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metricas.totalSaldoGeral)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Taxa Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metricas.taxaGeralInadimplencia > 30 ? 'text-red-600' : metricas.taxaGeralInadimplencia > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
              {metricas.taxaGeralInadimplencia.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Credores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Inadimplência por Credor Cedrus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {dadosPorCredor.map((credor) => (
              <AccordionItem key={credor.credor} value={credor.credor}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">{credor.credor}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-muted-foreground">Títulos</div>
                        <div className="font-semibold">{credor.totalTitulos}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Vencidos</div>
                        <div className="font-semibold text-red-600">{credor.titulosVencidos}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Saldo Vencido</div>
                        <div className="font-semibold text-red-600">{formatCurrency(credor.saldoVencido)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Taxa</div>
                        <Badge 
                          variant={credor.taxaInadimplencia > 30 ? "destructive" : credor.taxaInadimplencia > 15 ? "secondary" : "default"}
                          className={credor.taxaInadimplencia <= 15 ? "bg-green-100 text-green-800" : ""}
                        >
                          {credor.taxaInadimplencia.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    {/* Formas de Pagamento */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Formas de Pagamento</div>
                      <div className="flex flex-wrap gap-2">
                        {credor.formasPagamento.map((fp) => (
                          <Badge key={fp} variant="secondary">
                            {fp}
                          </Badge>
                        ))}
                        {credor.formasPagamento.length === 0 && (
                          <span className="text-muted-foreground text-sm">Nenhuma forma de pagamento vinculada</span>
                        )}
                      </div>
                    </div>

                    {/* Acumulado de Inadimplência */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">Títulos Vencidos</div>
                        <div className="text-xl font-bold text-red-600">{credor.titulosVencidos}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Saldo Vencido</div>
                        <div className="text-xl font-bold text-red-600">{formatCurrency(credor.saldoVencido)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Valor Vencido</div>
                        <div className="text-xl font-bold text-red-600">{formatCurrency(credor.valorVencido)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Taxa Inadimplência</div>
                        <div className={`text-xl font-bold ${credor.taxaInadimplencia > 30 ? 'text-red-600' : credor.taxaInadimplencia > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {credor.taxaInadimplencia.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
