import { TituloTudoBelo } from "@/hooks/useTitulosTudoBelo";

export interface RemoteCedrusData {
  status_cedrus: string | null;
  inserido_cedrus: boolean;
  id_titulo_cedrus: string | null;
}

export interface CedrusFieldDiff {
  campo: keyof RemoteCedrusData;
  label: string;
  valorAnterior: string | null;
  valorNovo: string | null;
}

const FIELDS: { key: keyof RemoteCedrusData; label: string }[] = [
  { key: "status_cedrus", label: "Status Cedrus" },
  { key: "inserido_cedrus", label: "Inserido Cedrus" },
  { key: "id_titulo_cedrus", label: "ID Título Cedrus" },
];

const asString = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
};

export function computeCedrusDiff(
  local: TituloTudoBelo,
  remote: RemoteCedrusData
): CedrusFieldDiff[] {
  const diffs: CedrusFieldDiff[] = [];
  for (const { key, label } of FIELDS) {
    const before = asString((local as any)[key]);
    const after = asString(remote[key]);
    if (before !== after) {
      diffs.push({
        campo: key,
        label,
        valorAnterior: before,
        valorNovo: after,
      });
    }
  }
  return diffs;
}

export function buildUpdatePayload(
  diffs: CedrusFieldDiff[],
  remote: RemoteCedrusData
): Partial<TituloTudoBelo> {
  const payload: Partial<TituloTudoBelo> = {};
  for (const d of diffs) {
    (payload as any)[d.campo] = remote[d.campo];
  }
  return payload;
}
