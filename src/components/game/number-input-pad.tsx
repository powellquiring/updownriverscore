
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PopoverClose } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface NumberInputPadProps {
  min: number;
  max: number;
  onSelectNumber: (value: number) => void;
  currentValue?: number | null;
  disabled?: boolean;
}

export function NumberInputPad({ min, max, onSelectNumber, currentValue, disabled = false }: NumberInputPadProps) {
  if (disabled || max < min) { // If max cards is 0, length would be 1 (0), but if min > max, no numbers.
    return (
      <div className="p-2 text-center text-muted-foreground">
        {max < min ? "No valid entries" : "N/A"}
      </div>
    );
  }
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={cn(
      "grid gap-1 p-1 bg-card rounded-md shadow-md",
      numbers.length <= 4 ? "grid-cols-4" :
      numbers.length <= 8 ? "grid-cols-4" :
      numbers.length <= 9 ? "grid-cols-3" :
      "grid-cols-4" // Default for more numbers
    )}>
      {numbers.map((num) => (
        <PopoverClose asChild key={num}>
          <Button
            variant={currentValue === num ? "default" : "outline"}
            size="sm"
            className="text-base aspect-square h-10 w-10"
            onClick={() => onSelectNumber(num)}
            disabled={disabled}
          >
            {num}
          </Button>
        </PopoverClose>
      ))}
    </div>
  );
}
