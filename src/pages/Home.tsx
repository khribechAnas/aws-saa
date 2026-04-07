import { useEffect, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import databaseData from "@/data/database.json";
import computeData from "@/data/compute.json";
import devopsData from "@/data/devops.json";
import machineLearningData from "@/data/machine-learning.json";
import networkData from "@/data/network.json";
import otherData from "@/data/other.json";
import youtubeData from "@/data/youtube.json";
import githubData from "@/data/github.json";
import { getCustomizedCategory } from "@/lib/customizedQuestions";
import { BookOpen } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: unknown[];
}

interface Results {
  [categoryId: string]: { score: number; total: number };
}

interface WrongQuestions {
  [categoryId: string]: unknown[];
}

const Home = () => {
  const [results, setResults] = useState<Results>({});
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestions>({});
  const [customizedCategory, setCustomizedCategory] = useState<Category | null>(null);
  
  // Static categories
  const staticCategories = [
    databaseData,
    computeData,
    devopsData,
    machineLearningData,
    networkData,
    otherData,
    youtubeData,
    githubData
  ] as Category[];

  useEffect(() => {
    const stored = localStorage.getItem("quizResults");
    if (stored) {
      setResults(JSON.parse(stored));
    }
    const wrongStored = localStorage.getItem("wrongQuestions");
    if (wrongStored) {
      setWrongQuestions(JSON.parse(wrongStored));
    }
    
    // Load customized category
    const customized = getCustomizedCategory();
    setCustomizedCategory(customized as Category);
  }, []);

  // Combine static categories with customized
  const categories = customizedCategory && customizedCategory.questions.length > 0
    ? [customizedCategory, ...staticCategories]
    : staticCategories;

  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);
  const completedCategories = Object.keys(results).length;
  const totalScore = Object.values(results).reduce((acc, r) => acc + r.score, 0);
  const totalAnswered = Object.values(results).reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Quiz Master
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test your knowledge across different technology domains. Select a category to begin.
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            {completedCategories > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{totalScore}/{totalAnswered}</p>
                <p className="text-sm text-muted-foreground">Total Score</p>
              </div>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              name={category.name}
              description={category.description}
              icon={category.icon}
              questionCount={category.questions.length}
              result={results[category.id] || null}
              wrongCount={wrongQuestions[category.id]?.length || 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
