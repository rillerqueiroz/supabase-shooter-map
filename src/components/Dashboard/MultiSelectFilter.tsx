import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectFilterProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({ title, options, selectedValues, onSelectionChange }: MultiSelectFilterProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onSelectionChange(selectedValues.filter(s => s !== option));
    } else {
      onSelectionChange([...selectedValues, option]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed justify-between min-w-[120px]">
          <span className="truncate">
            {title}
            {selectedValues.length > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
                {selectedValues.length}
              </Badge>
            )}
          </span>
          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <div className="flex items-center gap-1 mb-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex items-center gap-1 mb-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs flex-1 justify-center" onClick={() => onSelectionChange([...filteredOptions])}>
            Todos
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs flex-1 justify-center" onClick={clearAll}>
            Nenhum
          </Button>
          {selectedValues.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs px-1" onClick={clearAll}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-1">
            {filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted cursor-pointer text-xs"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                  className="h-3 w-3"
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum resultado</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
