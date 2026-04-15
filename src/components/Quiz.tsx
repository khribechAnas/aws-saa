import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Home, ArrowLeft, BookMarked, Bookmark } from "lucide-react";
import databaseData from "@/data/database.json";
import computeData from "@/data/compute.json";
import devopsData from "@/data/devops.json";
import machineLearningData from "@/data/machine-learning.json";
import networkData from "@/data/network.json";
import otherData from "@/data/other.json";
import youtubeData from "@/data/youtube.json";
import githubData from "@/data/github.json";
import { cn } from "@/lib/utils";
import { saveQuestion, removeSavedQuestion, isQuestionSaved, getCustomizedCategoryById } from "@/lib/customizedQuestions";
import { useToast } from "@/hooks/use-toast";

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
interface Question {
  id: number;
  question: string;
  type: "single" | "multiple";
  choices: string[];
  correctAnswers: number[];
  explanation: string;
}

interface LegacyQuestion {
  id?: number;
  question?: string;
  type?: "single" | "multiple";
  choices?: string[];
  correctAnswers?: number[];
  options?: Record<string, string>;
  answer?: string | string[];
  correctAnswer?: string | string[];
  explanation?: string;
  [key: string]: unknown;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: Question[];
}

// Map category IDs to their data files
const categoryMap: Record<string, Category> = {
  "database": databaseData as Category,
  "compute": computeData as Category,
  "devops": devopsData as Category,
  "machine-learning": machineLearningData as Category,
  "network": networkData as Category,
  "other": otherData as Category,
  "youtube": youtubeData as Category,
  "github": githubData as Category
};

const normalizeQuestion = (raw: LegacyQuestion, fallbackId: number): Question | null => {
  const choices = Array.isArray(raw.choices)
    ? raw.choices
    : raw.options
    ? Object.keys(raw.options)
        .sort()
        .map((key) => raw.options![key])
    : [];

  if (choices.length === 0) return null;

  const optionKeys = raw.options ? Object.keys(raw.options).sort() : [];
  const keyToIndex = new Map<string, number>();
  optionKeys.forEach((key, index) => keyToIndex.set(key.toUpperCase(), index));

  let correctAnswers: number[] = [];
  if (Array.isArray(raw.correctAnswers) && raw.correctAnswers.every((x) => typeof x === "number")) {
    correctAnswers = raw.correctAnswers.filter((idx) => idx >= 0 && idx < choices.length);
  } else {
    const rawAnswers = raw.correctAnswer ?? raw.answer;
    const normalizedRawAnswers = Array.isArray(rawAnswers) ? rawAnswers : rawAnswers ? [rawAnswers] : [];
    correctAnswers = normalizedRawAnswers
      .map((value) => keyToIndex.get(String(value).trim().toUpperCase()))
      .filter((idx): idx is number => typeof idx === "number");
  }

  if (correctAnswers.length === 0) return null;

  return {
    ...(raw as Question),
    id: typeof raw.id === "number" ? raw.id : fallbackId,
    question: typeof raw.question === "string" ? raw.question : "Question unavailable",
    type: raw.type === "multiple" || correctAnswers.length > 1 ? "multiple" : "single",
    choices,
    correctAnswers,
    explanation: typeof raw.explanation === "string" ? raw.explanation : "",
  };
};

const normalizeQuestions = (questions: LegacyQuestion[] = []): Question[] => {
  return questions
    .map((question, index) => normalizeQuestion(question, index + 1))
    .filter((question): question is Question => question !== null);
};

const Quiz = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check if we're in "retry wrong" mode
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode');
  const isWrongMode = mode === 'wrong';
  
  // Handle customized category
  const isCustomizedCategory = !!categoryId?.startsWith("customized");
  const category = categoryId 
    ? (isCustomizedCategory ? getCustomizedCategoryById(categoryId) : categoryMap[categoryId])
    : undefined;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [questionSaved, setQuestionSaved] = useState(false);

  // Shuffle questions once when component mounts or category changes
  const [shuffledQuestions] = useState(() => {
    if (!category) return [];
    
    // If in wrong mode, load wrong questions from localStorage
    if (isWrongMode) {
      const wrongStored = localStorage.getItem('wrongQuestions');
      if (wrongStored) {
        const wrongData = JSON.parse(wrongStored);
        const categoryWrong = wrongData[categoryId || ''];
        if (categoryWrong && categoryWrong.length > 0) {
          return shuffleArray(normalizeQuestions(categoryWrong));
        }
      }
      // If no wrong questions found, use all questions
      return shuffleArray(normalizeQuestions(category.questions as LegacyQuestion[]));
    }
    
    return shuffleArray(normalizeQuestions(category.questions as LegacyQuestion[]));
  });

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md quiz-card text-center">
          <CardContent className="pt-6 space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Category not found</h2>
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = shuffledQuestions;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md quiz-card text-center">
          <CardContent className="pt-6 space-y-4">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">No valid questions found</h2>
            <p className="text-sm text-muted-foreground">
              This category contains questions with unsupported format.
            </p>
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check saved status when question changes
  useEffect(() => {
    if (categoryId && currentQuestion) {
      setQuestionSaved(isQuestionSaved(currentQuestion.id, isCustomizedCategory ? (currentQuestion as any).categoryId : categoryId));
    }
  }, [currentQuestionIndex, categoryId, currentQuestion, isCustomizedCategory]);

  const handleSaveQuestion = () => {
    if (!categoryId || !currentQuestion) return;

    const questionCategoryId = isCustomizedCategory ? (currentQuestion as any).categoryId : categoryId;
    const questionCategoryName = isCustomizedCategory ? (currentQuestion as any).categoryName : category.name;

    if (questionSaved) {
      // Remove from saved
      removeSavedQuestion(currentQuestion.id, questionCategoryId);
      setQuestionSaved(false);
      toast({
        title: "Removed from Customized",
        description: "Question removed from your saved questions",
      });
      
      // If we're in customized category, refresh questions
      if (isCustomizedCategory) {
        window.location.reload();
      }
    } else {
      // Save question
      saveQuestion({
        ...currentQuestion,
        categoryId: questionCategoryId,
        categoryName: questionCategoryName
      });
      setQuestionSaved(true);
      toast({
        title: "Saved to Customized",
        description: "Question added to your saved difficult questions",
      });
    }
  };

  const handleChoiceClick = (index: number) => {
    if (isSubmitted) return;

    if (currentQuestion.type === "single") {
      setSelectedAnswers([index]);
    } else {
      setSelectedAnswers((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    }
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0) return;

    const correct =
      selectedAnswers.length === currentQuestion.correctAnswers.length &&
      selectedAnswers.every((ans) => currentQuestion.correctAnswers.includes(ans));

    setIsCorrect(correct);
    setIsSubmitted(true);
    if (correct) {
      setScore((prev) => prev + 1);
    } else {
      // Track wrong questions
      setWrongQuestions((prev) => [...prev, currentQuestion]);
    }
  };

  const handleContinue = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswers([]);
      setIsSubmitted(false);
      setIsCorrect(false);
    } else {
      // Save result and wrong questions to localStorage
      const stored = localStorage.getItem("quizResults");
      const results = stored ? JSON.parse(stored) : {};
      results[category.id] = { score: score, total: questions.length };
      localStorage.setItem("quizResults", JSON.stringify(results));

      // Save wrong questions - if in wrong mode and all correct, clear them
      const wrongStored = localStorage.getItem("wrongQuestions");
      const wrongData = wrongStored ? JSON.parse(wrongStored) : {};
      
      if (isWrongMode && wrongQuestions.length === 0) {
        // All questions answered correctly in retry mode, clear wrong questions
        delete wrongData[category.id];
      } else {
        // Save current wrong questions
        wrongData[category.id] = wrongQuestions;
      }
      localStorage.setItem("wrongQuestions", JSON.stringify(wrongData));

      setIsQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setIsSubmitted(false);
    setIsCorrect(false);
    setIsQuizComplete(false);
    setScore(0);
    setWrongQuestions([]);
  };

  const handleRetryWrong = () => {
    if (wrongQuestions.length > 0) {
      // Restart with only wrong questions
      const shuffled = shuffleArray(wrongQuestions);
      // @ts-ignore - we're setting a new set of questions
      shuffledQuestions.length = 0;
      shuffled.forEach(q => shuffledQuestions.push(q));
      
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setIsSubmitted(false);
      setIsCorrect(false);
      setIsQuizComplete(false);
      setScore(0);
      setWrongQuestions([]);
    }
  };

  if (isQuizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl quiz-card">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{category.name}</p>
              <h1 className="text-3xl font-bold text-foreground">Quiz Complete!</h1>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-5xl font-bold text-primary">
                {score} / {questions.length}
              </p>
              <p className="text-muted-foreground text-lg">
                {percentage >= 80
                  ? "Excellent work!"
                  : percentage >= 60
                  ? "Great job! Keep learning!"
                  : "Keep practicing, you'll get better!"}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {wrongQuestions.length > 0 && (
              <div className="text-sm text-muted-foreground">
                You got {wrongQuestions.length} question{wrongQuestions.length !== 1 ? 's' : ''} wrong
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center gap-3 flex-wrap">
            <Button onClick={() => navigate("/")} variant="outline" size="lg" className="gap-2">
              <Home className="w-5 h-5" />
              Go Home
            </Button>
            <Button onClick={handleRestart} variant="outline" size="lg" className="gap-2">
              <RotateCcw className="w-5 h-5" />
              Restart Quiz
            </Button>
            {wrongQuestions.length > 0 && (
              <Button onClick={handleRetryWrong} size="lg" className="gap-2">
                <XCircle className="w-5 h-5" />
                Retry Wrong ({wrongQuestions.length})
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Back Button & Category */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{category.name}</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="quiz-card">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                currentQuestion.type === "single" 
                  ? "bg-primary/10 text-primary" 
                  : "bg-accent/10 text-accent-foreground"
              )}>
                {currentQuestion.type === "single" ? "Single Choice" : "Multiple Choice"}
              </span>
              <Button
                variant={questionSaved ? "default" : "outline"}
                size="sm"
                onClick={handleSaveQuestion}
                className="gap-2"
              >
                {questionSaved ? (
                  <>
                    <BookMarked className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed">
              {currentQuestion.question}
            </h2>
          </CardHeader>

          <CardContent className="space-y-3">
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selectedAnswers.includes(index);
              const isCorrectAnswer = currentQuestion.correctAnswers.includes(index);
              
              let choiceState = "default";
              if (isSubmitted) {
                if (isCorrectAnswer) choiceState = "correct";
                else if (isSelected && !isCorrectAnswer) choiceState = "incorrect";
              } else if (isSelected) {
                choiceState = "selected";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleChoiceClick(index)}
                  disabled={isSubmitted}
                  className={cn(
                    "choice-button w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                    "flex items-center gap-4 group",
                    choiceState === "default" && "border-border hover:border-primary/50 hover:bg-muted/50",
                    choiceState === "selected" && "border-primary bg-primary/5",
                    choiceState === "correct" && "border-success bg-success/10",
                    choiceState === "incorrect" && "border-destructive bg-destructive/10",
                    isSubmitted && "cursor-default"
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all",
                    choiceState === "default" && "border-muted-foreground/30 text-muted-foreground group-hover:border-primary group-hover:text-primary",
                    choiceState === "selected" && "border-primary bg-primary text-primary-foreground",
                    choiceState === "correct" && "border-success bg-success text-white",
                    choiceState === "incorrect" && "border-destructive bg-destructive text-white"
                  )}>
                    {choiceState === "correct" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : choiceState === "incorrect" ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </span>
                  <span className={cn(
                    "flex-1 font-medium",
                    choiceState === "correct" && "text-success",
                    choiceState === "incorrect" && "text-destructive"
                  )}>
                    {choice}
                  </span>
                </button>
              );
            })}
          </CardContent>

          {/* Feedback Section */}
          {isSubmitted && (
            <div className={cn(
              "mx-6 mb-6 p-4 rounded-xl animate-fade-in",
              isCorrect ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
            )}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className={cn(
                    "font-semibold",
                    isCorrect ? "text-success" : "text-destructive"
                  )}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  <p className="text-foreground/80 text-sm leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          <CardFooter className="flex justify-end gap-3 pt-0">
            {!isSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswers.length === 0}
                size="lg"
                className="min-w-[120px]"
              >
                Submit
              </Button>
            ) : (
              <Button
                onClick={handleContinue}
                size="lg"
                className="gap-2 min-w-[120px]"
              >
                {currentQuestionIndex < questions.length - 1 ? (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  "See Results"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;
