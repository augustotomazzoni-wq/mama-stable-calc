import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => {
  return (
    <div className="flex items-start justify-center gap-1.5 sm:gap-2 mb-8">
      {steps.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;

        return (
          <div key={i} className="flex items-start gap-1.5 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-accent",
                  !isActive && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={cn(
                // No celular, com quatro passos, o rótulo quebra em duas linhas.
                "text-[11px] sm:text-xs font-medium text-center leading-tight max-w-[4.5rem] sm:max-w-none",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                // Alinhado ao centro do círculo, qualquer que seja a altura do rótulo.
                "w-5 sm:w-12 h-0.5 mt-[17px] shrink-0",
                step < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
