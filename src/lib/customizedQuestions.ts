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
const CUSTOMIZED_CHUNK_SIZE = 100;

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
  const categories = getCustomizedCategories();
  return categories[0] || {
    id: "customized",
    name: "Customized",
    description: "Your saved difficult questions",
    icon: "BookMarked",
    questions: []
  };
};

// Split saved questions into multiple virtual categories of 100 questions each.
export const getCustomizedCategories = () => {
  const questions = getCustomizedQuestions();
  const categories: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    questions: SavedQuestion[];
  }> = [];

  for (let i = 0; i < questions.length; i += CUSTOMIZED_CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CUSTOMIZED_CHUNK_SIZE);
    const chunkNumber = chunkIndex + 1;
    const chunkQuestions = questions.slice(i, i + CUSTOMIZED_CHUNK_SIZE);

    categories.push({
      id: chunkNumber === 1 ? "customized" : `customized-${chunkNumber}`,
      name: chunkNumber === 1 ? "Customized" : `Customized ${chunkNumber}`,
      description: "Your saved difficult questions",
      icon: "BookMarked",
      questions: chunkQuestions,
    });
  }

  return categories;
};

// Resolve a specific customized category ID (customized, customized-2, ...).
export const getCustomizedCategoryById = (categoryId: string) => {
  if (!categoryId.startsWith("customized")) {
    return null;
  }

  const categories = getCustomizedCategories();
  return categories.find((c) => c.id === categoryId) || null;
};
