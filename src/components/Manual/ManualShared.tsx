import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database } from "lucide-react";

/* Shared helper components for both manuals */

export function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
      </div>
      <Separator className="mt-4" />
    </div>
  );
}

export function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="font-semibold mb-2 text-foreground">{title}</h4>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export function TechBadge({ children }: { children: React.ReactNode }) {
  return <Badge variant="outline" className="font-mono text-xs">{children}</Badge>;
}

export function TableSchema({ tableName, columns }: { tableName: string; columns: { name: string; type: string; desc: string }[] }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-4 w-4 text-primary" />
        <code className="text-sm font-mono font-semibold text-primary">{tableName}</code>
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 font-medium">Coluna</th>
              <th className="text-left p-2 font-medium">Tipo</th>
              <th className="text-left p-2 font-medium">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.name} className="border-t">
                <td className="p-2 font-mono text-primary">{col.name}</td>
                <td className="p-2 font-mono text-muted-foreground">{col.type}</td>
                <td className="p-2 text-muted-foreground">{col.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SimpleTableInfo({ tableName, description }: { tableName: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <Database className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-sm">{tableName}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function FlowStep({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
        {step}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function AlertBlock({ type = "info", children }: { type?: "info" | "warning" | "important"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
    important: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
  };
  const icons = { info: "ℹ️", warning: "⚠️", important: "🔴" };
  return (
    <div className={`p-3 border rounded-lg text-sm ${styles[type]}`}>
      <span className="mr-1">{icons[type]}</span>
      {children}
    </div>
  );
}
