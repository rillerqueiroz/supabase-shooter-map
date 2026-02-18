import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineMultiSelectProps {
  placeholder: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  className?: string;
}

export function InlineMultiSelect({
  placeholder,
  options,
  selectedValues,
  onSelectionChange,
  className,
}: InlineMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sort options alphabetically
  const sortedOptions = [...options].sort((a, b) => 
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

  // Filter options by search term
  const filteredOptions = sortedOptions.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    onSelectionChange(sortedOptions);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleToggle = (option: string) => {
    if (selectedValues.includes(option)) {
      onSelectionChange(selectedValues.filter(v => v !== option));
    } else {
      onSelectionChange([...selectedValues, option]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) return selectedValues[0];
    if (selectedValues.length === options.length) return `Todos (${options.length})`;
    return `${selectedValues.length} selecionados`;
  };

  const hasSelection = selectedValues.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            hasSelection && "border-primary/50 bg-primary/5",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {hasSelection && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[220px] p-0 bg-popover border shadow-lg z-50" 
        align="start"
        sideOffset={4}
      >
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Select All / Clear All */}
        <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-7 text-xs flex-1"
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 text-xs flex-1"
          >
            Nenhum
          </Button>
        </div>

        {/* Options List */}
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Nenhum item encontrado
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  onClick={() => handleToggle(option)}
                >
                  <Checkbox
                    checked={selectedValues.includes(option)}
                    onCheckedChange={() => handleToggle(option)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm truncate flex-1">{option}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
