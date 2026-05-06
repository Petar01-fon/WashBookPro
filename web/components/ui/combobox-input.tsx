"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
};

export function ComboboxInput({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const allOptions = inputValue && !options.includes(inputValue)
    ? [...options, inputValue]
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {value || placeholder || "Izaberi..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Izaberi ili unesi novi..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  onChange(inputValue);
                  setOpen(false);
                  setInputValue("");
                }}
              >
                Dodaj &quot;{inputValue}&quot;
              </button>
            </CommandEmpty>
            <CommandGroup>
              {allOptions.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                    setInputValue("");
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${value === opt ? "opacity-100" : "opacity-0"}`}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}