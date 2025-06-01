
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NumberInputPadProps {
  min: number;
  max: number;
  onSelectNumber: (value: number) => void;
  currentValue?: number | null;
  disabled?: boolean;
  excludeNumber?: number | null; // New prop
}

export function NumberInputPad({ min, max, onSelectNumber, currentValue, disabled = false, excludeNumber = null }: NumberInputPadProps) {
  if (disabled || max < min) {
    return (
      <div className="p-2 text-center text-muted-foreground">
        {max < min ? "No valid entries" : "N/A"}
      </div>
    );
  }
  let numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  if (excludeNumber !== null && excludeNumber >= min && excludeNumber <= max) {
    numbers = numbers.filter(num => num !== excludeNumber);
  }

  if (numbers.length === 0) {
    return (
      <div className="p-2 text-center text-muted-foreground">
        No valid bids available.
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-1 p-1 bg-card rounded-md shadow-sm",
      numbers.length <= 4 ? "grid-cols-4" :
      numbers.length <= 8 ? "grid-cols-4" :
      numbers.length <= 9 ? "grid-cols-3" :
      "grid-cols-4" 
    )}>
      {numbers.map((num) => (
          <Button
            key={num}
            variant={currentValue === num ? "default" : "outline"}
            size="sm"
            className="text-base aspect-square h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => onSelectNumber(num)}
            disabled={disabled}
          >
            {num}
          </Button>
      ))}
    </div>
  );
}
