
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NumberInputPadProps {
  min: number;
  max: number;
  onSelectNumber: (value: number) => void;
  currentValue?: number | null;
  disabled?: boolean; // Overall disabled state for the pad
  isNumberInvalid?: (num: number) => boolean; // Callback to check if a specific number is invalid
  className?: string; // Allow passing additional class names
}

export function NumberInputPad({
  min,
  max,
  onSelectNumber,
  currentValue,
  disabled = false,
  isNumberInvalid,
  className,
}: NumberInputPadProps) {
  if (disabled && !isNumberInvalid) { // If pad is generally disabled but no specific invalidation logic, show N/A
    return (
      <div className="p-2 text-center text-muted-foreground">
        N/A
      </div>
    );
  }
  
  if (max < min && !isNumberInvalid) { // If range is impossible and no specific invalidation
     return (
      <div className="p-2 text-center text-muted-foreground">
        No valid entries
      </div>
    );
  }

  const numbers = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);

  if (numbers.length === 0 && !isNumberInvalid) {
     return (
      <div className="p-2 text-center text-muted-foreground">
        No valid entries available.
      </div>
    );
  }
  
  // Check if all numbers are invalid according to the rule
  let allNumbersInvalid = true;
  if (isNumberInvalid && numbers.length > 0) {
    allNumbersInvalid = numbers.every(num => isNumberInvalid(num));
  } else if (numbers.length === 0 && isNumberInvalid) {
    // This case might occur if min > max initially, but isNumberInvalid could still be relevant for display
    allNumbersInvalid = true; 
  } else {
    allNumbersInvalid = false;
  }


  if (allNumbersInvalid && numbers.length > 0) {
     return (
      <div className="p-2 text-center text-muted-foreground">
        No valid options per rules.
      </div>
    );
  }
  if (allNumbersInvalid && numbers.length === 0 && max < min) {
     return (
      <div className="p-2 text-center text-muted-foreground">
       No entries possible.
      </div>
    );
  }


  return (
    <div className={cn(
      "w-full flex flex-row flex-nowrap gap-1 p-1 bg-card rounded-md shadow-sm overflow-x-auto",
      className // Merge the passed className here
    )}>
      {numbers.map((num) => {
        const isInvalidByRule = isNumberInvalid ? isNumberInvalid(num) : false;
        const effectivelyDisabled = disabled || isInvalidByRule;

        return (
          <Button
            key={num}
            variant={currentValue === num && !isInvalidByRule ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-base aspect-square h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0", // Added flex-shrink-0
              isInvalidByRule && "text-destructive border-destructive/50 hover:text-destructive hover:bg-destructive/10",
              currentValue === num && isInvalidByRule && "bg-destructive/20 text-destructive border-destructive" // If current value is invalid
            )}
            onClick={() => {
              if (!isInvalidByRule) {
                onSelectNumber(num);
              }
            }}
            disabled={effectivelyDisabled}
            aria-disabled={effectivelyDisabled}
          >
            {num}
          </Button>
        );
      })}
    </div>
  );
}

