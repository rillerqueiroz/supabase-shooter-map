import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";

const BRAZIL_TOPO_JSON = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// Função para normalizar nomes (remover acentos)
const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

// Mapeamento de nomes dos estados para siglas UF (com e sem acentos)
const stateToUF: Record<string, string> = {
  "acre": "AC",
  "alagoas": "AL",
  "amapa": "AP",
  "amazonas": "AM",
  "bahia": "BA",
  "ceara": "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  "goias": "GO",
  "maranhao": "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  "para": "PA",
  "paraiba": "PB",
  "parana": "PR",
  "pernambuco": "PE",
  "piaui": "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  "rondonia": "RO",
  "roraima": "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  "sergipe": "SE",
  "tocantins": "TO",
};

// Mapeamento inverso: sigla para nome
const ufToState: Record<string, string> = {
  "AC": "Acre",
  "AL": "Alagoas",
  "AP": "Amapá",
  "AM": "Amazonas",
  "BA": "Bahia",
  "CE": "Ceará",
  "DF": "Distrito Federal",
  "ES": "Espírito Santo",
  "GO": "Goiás",
  "MA": "Maranhão",
  "MT": "Mato Grosso",
  "MS": "Mato Grosso do Sul",
  "MG": "Minas Gerais",
  "PA": "Pará",
  "PB": "Paraíba",
  "PR": "Paraná",
  "PE": "Pernambuco",
  "PI": "Piauí",
  "RJ": "Rio de Janeiro",
  "RN": "Rio Grande do Norte",
  "RS": "Rio Grande do Sul",
  "RO": "Rondônia",
  "RR": "Roraima",
  "SC": "Santa Catarina",
  "SP": "São Paulo",
  "SE": "Sergipe",
  "TO": "Tocantins",
};

// Função para obter UF a partir de qualquer propriedade do GeoJSON
const getUFFromGeo = (geo: any): string => {
  const props = geo.properties || {};
  
  // Tentar propriedades diretas de sigla
  if (props.sigla) return props.sigla.toUpperCase();
  if (props.uf) return props.uf.toUpperCase();
  if (props.abbrev) return props.abbrev.toUpperCase();
  if (props.UF) return props.UF.toUpperCase();
  
  // Tentar nome e normalizar
  const name = props.name || props.NAME || props.nome || "";
  if (!name) return "";
  
  // Se já é uma sigla de 2 caracteres
  if (name.length === 2 && /^[A-Z]{2}$/i.test(name)) {
    return name.toUpperCase();
  }
  
  // Normalizar e buscar no mapa
  const normalized = normalizeString(name);
  return stateToUF[normalized] || "";
};

interface UFData {
  name: string;
  count: number;
  value: number;
}

interface BrazilMapProps {
  data: UFData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
};

export function BrazilMap({ data }: BrazilMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{
    name: string;
    uf: string;
    value: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Criar mapa de dados por UF (sigla) - convertendo nomes completos para siglas
  const dataByUF = useMemo(() => {
    const map: Record<string, UFData> = {};
    data.forEach((item) => {
      const rawName = (item.name || "").toUpperCase().trim();
      if (!rawName || rawName === "N/A") return;
      
      // Se já é uma sigla de 2 caracteres
      if (rawName.length === 2 && /^[A-Z]{2}$/.test(rawName)) {
        map[rawName] = item;
        return;
      }
      
      // Converter nome completo para sigla
      const normalized = normalizeString(rawName);
      const uf = stateToUF[normalized];
      if (uf) {
        map[uf] = item;
      }
    });
    console.log("Data by UF (normalized):", map);
    return map;
  }, [data]);

  // Calcular min/max para escala de cores
  const { minValue, maxValue } = useMemo(() => {
    const values = data.map((d) => d.value).filter((v) => v > 0);
    if (values.length === 0) {
      return { minValue: 0, maxValue: 1 };
    }
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [data]);

  // Função para calcular cor baseada no valor - escala azul mais acentuada
  const getColor = (value: number): string => {
    if (!value || value === 0) return "#f8fafc"; // slate-50 (bem claro para sem dados)
    
    // Usar escala de quantis para distribuir melhor as cores
    const sortedValues = data
      .map((d) => d.value)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    
    if (sortedValues.length === 0) return "#f8fafc";
    
    // Calcular posição percentil do valor
    const position = sortedValues.findIndex((v) => v >= value);
    const percentile = position / sortedValues.length;
    
    // Aplicar curva exponencial para acentuar diferenças
    const ratio = Math.pow(percentile, 0.5); // Exponente < 1 estica os valores baixos
    
    // Escala de azul com mais gradações: muito claro → escuro intenso
    const colors = [
      { r: 239, g: 246, b: 255 }, // blue-50
      { r: 219, g: 234, b: 254 }, // blue-100
      { r: 191, g: 219, b: 254 }, // blue-200
      { r: 147, g: 197, b: 253 }, // blue-300
      { r: 96, g: 165, b: 250 },  // blue-400
      { r: 59, g: 130, b: 246 },  // blue-500
      { r: 37, g: 99, b: 235 },   // blue-600
      { r: 29, g: 78, b: 216 },   // blue-700
      { r: 30, g: 64, b: 175 },   // blue-800
      { r: 30, g: 58, b: 138 },   // blue-900
      { r: 23, g: 37, b: 84 },    // blue-950
    ];
    
    const colorIndex = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 2);
    const localRatio = (ratio * (colors.length - 1)) - colorIndex;
    
    const c1 = colors[colorIndex];
    const c2 = colors[colorIndex + 1];
    
    const r = Math.round(c1.r + (c2.r - c1.r) * localRatio);
    const g = Math.round(c1.g + (c2.g - c1.g) * localRatio);
    const b = Math.round(c1.b + (c2.b - c1.b) * localRatio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMouseEnter = (geo: any, evt: React.MouseEvent) => {
    const uf = getUFFromGeo(geo);
    const stateName = ufToState[uf] || geo.properties.name || uf;
    const ufDataItem = dataByUF[uf];
    
    setTooltipContent({
      name: stateName,
      uf,
      value: ufDataItem?.value || 0,
      count: ufDataItem?.count || 0,
      x: evt.clientX,
      y: evt.clientY,
    });
  };

  const handleMouseLeave = () => {
    setTooltipContent(null);
  };

  // Calcular valores para a legenda
  const legendSteps = useMemo(() => {
    const steps = 5;
    const result = [];
    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const value = minValue + ratio * (maxValue - minValue);
      result.push({
        value,
        color: getColor(value || 1),
      });
    }
    return result;
  }, [minValue, maxValue]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 750,
          center: [-54, -15],
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={BRAZIL_TOPO_JSON}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const uf = getUFFromGeo(geo);
              const ufDataItem = dataByUF[uf];
              const value = ufDataItem?.value || 0;
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    default: {
                      fill: getColor(value),
                      stroke: "#fff",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: "#3b82f6",
                      stroke: "#fff",
                      strokeWidth: 1,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "#2563eb",
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-popover text-popover-foreground border rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipContent.x + 10,
            top: tooltipContent.y - 10,
          }}
        >
          <div className="font-semibold">{tooltipContent.name} ({tooltipContent.uf})</div>
          <div className="text-muted-foreground">
            Saldo: <span className="text-primary font-medium">{formatCurrencyFull(tooltipContent.value)}</span>
          </div>
          <div className="text-muted-foreground">
            Títulos: <span className="font-medium">{tooltipContent.count.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border shadow-sm">
        <div className="text-xs font-medium mb-2 text-muted-foreground">Saldo por Estado</div>
        <div className="flex items-center gap-1">
          {legendSteps.map((step, index) => (
            <div
              key={index}
              className="w-6 h-4 rounded-sm"
              style={{ backgroundColor: step.color }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{formatCurrency(minValue)}</span>
          <span>{formatCurrency(maxValue)}</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
          UFs com dados: {Object.keys(dataByUF).filter(k => k !== "N/A").length}/27
        </div>
      </div>
    </div>
  );
}
