import * as XLSX from "xlsx";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { normalizarTelefone } from "./normalize-phone";
import type { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDateBR = (dateString: string | null) => {
  if (!dateString) return "";
  try {
    const [y, m, d] = dateString.split("T")[0].split("-").map(Number);
    return format(new Date(y, m - 1, d), "dd/MM/yyyy");
  } catch {
    return dateString;
  }
};

interface PhoneRow {
  person_id: string;
  phone: string;
  phone_type: string | null;
  is_valid: boolean | null;
  is_whatsapp: boolean | null;
}

async function fetchValidPhonesByPersonIds(personIds: string[]): Promise<Map<string, PhoneRow[]>> {
  const map = new Map<string, PhoneRow[]>();
  if (!personIds.length) return map;
  const chunkSize = 200;
  for (let i = 0; i < personIds.length; i += chunkSize) {
    const chunk = personIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("people_phones")
      .select("person_id, phone, phone_type, is_valid, is_whatsapp")
      .in("person_id", chunk)
      .or("is_valid.is.null,is_valid.eq.true");
    if (error) throw error;
    for (const r of (data as PhoneRow[]) || []) {
      if (!r.person_id || !r.phone) continue;
      const norm = normalizarTelefone(r.phone);
      if (!norm || norm.length < 10) continue;
      const arr = map.get(r.person_id) || [];
      // dedup por número normalizado
      if (!arr.some((p) => normalizarTelefone(p.phone) === norm)) {
        arr.push(r);
        map.set(r.person_id, arr);
      }
    }
  }
  return map;
}

interface DevedorAgrupado {
  key: string;
  person_id: string | null;
  nome: string;
  cnpj_cpf: string;
  codigo_parceiro: string;
  cidade: string;
  uf: string;
  qtdTitulos: number;
  saldoTotal: number;
  valorTotal: number;
  menorVencimento: string | null;
  maiorAtraso: number;
  documentos: string[];
  filiais: Set<string>;
  formasPagamento: Set<string>;
  credoresCedrus: Set<string>;
  email: string;
  fonesTitulo: string[];
}

function agrupar(titulos: TituloTudoBelo[]): DevedorAgrupado[] {
  const map = new Map<string, DevedorAgrupado>();
  for (const t of titulos) {
    const key =
      t.person_id ||
      (t.cnpj_cpf ? `doc:${t.cnpj_cpf.replace(/\D/g, "")}` : null) ||
      (t.codigo_parceiro ? `cod:${t.codigo_parceiro}` : null) ||
      `id:${t.id}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        person_id: t.person_id || null,
        nome: t.nome_parceiro || "",
        cnpj_cpf: t.cnpj_cpf || "",
        codigo_parceiro: t.codigo_parceiro || "",
        cidade: t.cidade || t.municipio_cobranca || "",
        uf: t.uf || t.uf_cobranca || "",
        qtdTitulos: 0,
        saldoTotal: 0,
        valorTotal: 0,
        menorVencimento: null,
        maiorAtraso: 0,
        documentos: [],
        filiais: new Set(),
        formasPagamento: new Set(),
        email: t.email || "",
        fonesTitulo: [],
      };
      map.set(key, g);
    }
    g.qtdTitulos += 1;
    g.saldoTotal += t.saldo_parcela || 0;
    g.valorTotal += t.valor_parcela || 0;
    if (t.data_vencimento) {
      if (!g.menorVencimento || t.data_vencimento < g.menorVencimento) {
        g.menorVencimento = t.data_vencimento;
      }
    }
    const atraso = parseInt(t.dias_atraso || "0", 10);
    if (!isNaN(atraso) && atraso > g.maiorAtraso) g.maiorAtraso = atraso;
    if (t.documento) g.documentos.push(t.documento);
    if (t.filial) g.filiais.add(t.filial);
    if (t.forma_pagamento) g.formasPagamento.add(t.forma_pagamento);
    if (!g.email && t.email) g.email = t.email;
    for (const f of [t.fone1, t.fone2]) {
      const n = normalizarTelefone(f);
      if (n && n.length >= 10 && !g.fonesTitulo.some((x) => normalizarTelefone(x) === n)) {
        g.fonesTitulo.push(f as string);
      }
    }
  }
  return Array.from(map.values());
}

export async function exportDiscadorList(titulos: TituloTudoBelo[]) {
  if (!titulos || titulos.length === 0) {
    throw new Error("Sem títulos para exportar");
  }

  const devedores = agrupar(titulos);
  const personIds = Array.from(
    new Set(devedores.map((d) => d.person_id).filter((v): v is string => !!v))
  );
  const phonesMap = await fetchValidPhonesByPersonIds(personIds);

  const comTelefone: any[] = [];
  const semTelefone: any[] = [];

  for (const d of devedores) {
    const phones = (d.person_id && phonesMap.get(d.person_id)) || [];
    const phoneList = phones.map((p) => normalizarTelefone(p.phone)).filter(Boolean);

    const baseRow = {
      "Nome Devedor": d.nome,
      "CNPJ/CPF": d.cnpj_cpf,
      "Código Parceiro": d.codigo_parceiro,
      "Cidade": d.cidade,
      "UF": d.uf,
      "Qtd Títulos": d.qtdTitulos,
      "Saldo Total": d.saldoTotal,
      "Saldo Total (R$)": formatCurrency(d.saldoTotal),
      "Valor Total": d.valorTotal,
      "Menor Vencimento": formatDateBR(d.menorVencimento),
      "Maior Atraso (dias)": d.maiorAtraso,
      "Filiais": Array.from(d.filiais).join(", "),
      "Formas Pagamento": Array.from(d.formasPagamento).join(", "),
      "Email": d.email,
      "Documentos": d.documentos.join(", "),
    };

    if (phoneList.length > 0) {
      comTelefone.push({
        ...baseRow,
        "Qtd Telefones Válidos": phoneList.length,
        "Telefone 1": phoneList[0] || "",
        "Telefone 2": phoneList[1] || "",
        "Telefone 3": phoneList[2] || "",
        "Telefone 4": phoneList[3] || "",
        "Todos Telefones": phoneList.join(", "),
        "WhatsApp": phones.filter((p) => p.is_whatsapp).map((p) => normalizarTelefone(p.phone)).join(", "),
      });
    } else {
      semTelefone.push({
        ...baseRow,
        "Tem person_id?": d.person_id ? "Sim" : "Não",
        "Fones no Título (não validados)": d.fonesTitulo.join(", "),
      });
    }
  }

  // Ordena por saldo desc
  comTelefone.sort((a, b) => (b["Saldo Total"] as number) - (a["Saldo Total"] as number));
  semTelefone.sort((a, b) => (b["Saldo Total"] as number) - (a["Saldo Total"] as number));

  const wb = XLSX.utils.book_new();

  const wsCom = XLSX.utils.json_to_sheet(
    comTelefone.length ? comTelefone : [{ Aviso: "Nenhum devedor com telefone válido" }]
  );
  if (comTelefone.length) {
    wsCom["!cols"] = Object.keys(comTelefone[0]).map((k) => ({ wch: Math.max(k.length, 14) }));
  }
  XLSX.utils.book_append_sheet(wb, wsCom, "Discador - Com Telefone");

  const wsSem = XLSX.utils.json_to_sheet(
    semTelefone.length ? semTelefone : [{ Aviso: "Todos os devedores possuem telefone válido" }]
  );
  if (semTelefone.length) {
    wsSem["!cols"] = Object.keys(semTelefone[0]).map((k) => ({ wch: Math.max(k.length, 14) }));
  }
  XLSX.utils.book_append_sheet(wb, wsSem, "Sem Telefone Válido");

  const filename = `discador-tudobelo-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
  XLSX.writeFile(wb, filename);

  return {
    success: true,
    filename,
    totalDevedores: devedores.length,
    comTelefone: comTelefone.length,
    semTelefone: semTelefone.length,
  };
}
