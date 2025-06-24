
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
  console.log('NumberInputPad rendering', { min, max, currentValue, disabled });
  
  if (disabled && !isNumberInvalid) { // If pad is generally disabled but no specific invalidation logic, show N/A
    return (
      <div className={cn("p-2 text-center text-muted-foreground", className)}>
        N/A
      </div>
    );
  }
  
  if (max < min && !isNumberInvalid) { // If range is impossible and no specific invalidation
     return (
      <div className={cn("p-2 text-center text-muted-foreground", className)}>
        No valid entries
      </div>
    );
  }

  const numbers = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);

  if (numbers.length === 0 && !isNumberInvalid) {
     return (
      <div className={cn("p-2 text-center text-muted-foreground", className)}>
        No valid entries available.
      </div>
    );
  }
  
  let allNumbersInvalid = true;
  if (isNumberInvalid && numbers.length > 0) {
    allNumbersInvalid = numbers.every(num => isNumberInvalid(num));
  } else if (numbers.length === 0 && isNumberInvalid) {
    allNumbersInvalid = true; 
  } else {
    allNumbersInvalid = false;
  }


  if (allNumbersInvalid && numbers.length > 0) {
     return (
      <div className={cn("p-2 text-center text-muted-foreground", className)}>
        No valid options per rules.
      </div>
    );
  }
  if (allNumbersInvalid && numbers.length === 0 && max < min) {
     return (
      <div className={cn("p-2 text-center text-muted-foreground", className)}>
       No entries possible.
      </div>
    );
  }


  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-flex flex-row flex-nowrap gap-1 p-1 bg-card rounded-md shadow-sm">
        {numbers.map((num) => {
          const isInvalidByRule = isNumberInvalid ? isNumberInvalid(num) : false;
          const effectivelyDisabled = disabled || isInvalidByRule;

          return (
            <Button
              key={num}
              variant={currentValue === num && !isInvalidByRule ? "default" : "outline"}
              size="sm"
              className={cn(
                "text-base aspect-square h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0",
                "text-lg sm:text-xl font-medium", // Increased text size
                isInvalidByRule && "text-destructive border-destructive/50 hover:text-destructive hover:bg-destructive/10",
                currentValue === num && isInvalidByRule && "bg-destructive/20 text-destructive border-destructive"
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
    </div>
  );
}
