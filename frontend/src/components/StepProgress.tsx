import type { WorkflowStep } from "@/types/api";

const STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "detect", label: "Detect regions" },
  { id: "extract", label: "OCR" },
  { id: "translate", label: "Translate" },
  { id: "review", label: "Review" },
  { id: "done", label: "Download" },
];

interface StepProgressProps {
  currentStep: WorkflowStep;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <li
            key={step.id}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              isActive && "bg-slate-900 text-white",
              isComplete && "bg-emerald-100 text-emerald-800",
              !isActive && !isComplete && "bg-slate-100 text-slate-500",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {index + 1}. {step.label}
          </li>
        );
      })}
    </ol>
  );
}
