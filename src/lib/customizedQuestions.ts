// Utility functions to manage customized (saved) questions

export interface SavedQuestion {
  id: number;
  question: string;
  type: "single" | "multiple";
  choices: string[];
  correctAnswers: number[];
  explanation: string;
  categoryId: string; // Track which category it came from
  categoryName: string;
}

const STORAGE_KEY = "customizedQuestions";

// Get all saved questions
export const getCustomizedQuestions = (): SavedQuestion[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading customized questions:", error);
    return [];
  }
};

// Save a question to customized
export const saveQuestion = (
  question: Omit<SavedQuestion, "categoryId" | "categoryName"> & { categoryId: string; categoryName: string }
): void => {
  try {
    const questions = getCustomizedQuestions();
    
    // Check if question already exists (by id and categoryId)
    const exists = questions.some(
      q => q.id === question.id && q.categoryId === question.categoryId
    );
    
    if (!exists) {
      questions.push(question as SavedQuestion);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  } catch (error) {
    console.error("Error saving question:", error);
  }
};

// Remove a question from customized
export const removeSavedQuestion = (questionId: number, categoryId: string): void => {
  try {
    const questions = getCustomizedQuestions();
    const filtered = questions.filter(
      q => !(q.id === questionId && q.categoryId === categoryId)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing question:", error);
  }
};

// Check if a question is saved
export const isQuestionSaved = (questionId: number, categoryId: string): boolean => {
  const questions = getCustomizedQuestions();
  return questions.some(q => q.id === questionId && q.categoryId === categoryId);
};

// Get customized category data (formatted like other categories)
export const getCustomizedCategory = () => {
  const questions = getCustomizedQuestions();
  return {
    id: "customized",
    name: "Customized",
    description: "Your saved difficult questions",
    icon: "BookMarked",
    questions: questions
  };
};
