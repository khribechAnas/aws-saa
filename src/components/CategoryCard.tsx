import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Cpu, GitBranch, Brain, Network, Sparkles, Youtube, CheckCircle2, Play, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  questionCount: number;
  result?: { score: number; total: number } | null;
  wrongCount?: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Cpu,
  GitBranch,
  Brain,
  Network,
  Sparkles,
  Youtube,
  BookMarked,
};

const CategoryCard = ({ id, name, description, icon, questionCount, result, wrongCount = 0 }: CategoryCardProps) => {
  const navigate = useNavigate();
  const IconComponent = iconMap[icon] || Database;
  const hasResult = result !== null && result !== undefined;
  const percentage = hasResult ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <Card className="quiz-card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
            hasResult ? "bg-success/10" : "bg-primary/10 group-hover:bg-primary/20"
          )}>
            <IconComponent className={cn(
              "w-7 h-7",
              hasResult ? "text-success" : "text-primary"
            )} />
          </div>
          {hasResult && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {percentage}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-1">{name}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {questionCount} questions
          </span>
          {hasResult && (
            <span className="text-xs text-muted-foreground">
              Score: {result.score}/{result.total}
            </span>
          )}
        </div>

        {hasResult && (
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-primary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        <div className="space-y-2">
          <Button 
            onClick={() => navigate(`/quiz/${id}`)}
            className="w-full gap-2"
            variant={hasResult ? "outline" : "default"}
          >
            <Play className="w-4 h-4" />
            {hasResult ? "Retry Quiz" : "Start Quiz"}
          </Button>
          {wrongCount > 0 && (
            <Button 
              onClick={() => navigate(`/quiz/${id}?mode=wrong`)}
              className="w-full gap-2"
              variant="destructive"
              size="sm"
            >
              Retry Wrong ({wrongCount})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryCard;
