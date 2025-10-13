import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface QuestionSuggestionsProps {
  suggestions: string[];
  onSelect: (question: string) => void;
  variant?: "startup" | "followup";
}

export const QuestionSuggestions = ({ suggestions, onSelect, variant = "startup" }: QuestionSuggestionsProps) => {
  return (
    <div className="space-y-2">
      {variant === "startup" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Sparkles className="w-4 h-4" />
          <span>Suggested questions to get started:</span>
        </div>
      )}
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            className="glass justify-start text-left h-auto py-3 px-4 hover:bg-primary/10"
            onClick={() => onSelect(suggestion)}
          >
            <span className="text-sm">{suggestion}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
