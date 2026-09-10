export type Level = "beginner" | "advanced" | "expert";
export type Role = "student" | "admin";
export type SubscriptionPackage = "bronze" | "diamond";
export type ContentPackageScope = SubscriptionPackage | "both";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  level: Level | null;
  role: Role;
  subscription_package: SubscriptionPackage;
  is_active: boolean;
  has_completed_placement_test: boolean;
  created_at: string;
};

export type QuestionOption = {
  id: string;
  question_id?: string;
  option_text: string;
  is_correct: boolean;
};

export type Question = {
  id: string;
  level: Level;
  question_text: string;
  explanation?: string;
  question_order: number;
  is_active?: boolean;
  options: QuestionOption[];
};

export type Lesson = {
  id: string;
  level: Level;
  title: string;
  description: string | null;
  summary: string | null;
  summary_links: LessonSummaryLink[] | null;
  vocabulary: LessonVocabularyItem[] | null;
  drive_file_id: string;
  bunny_video_id: string | null;
  package_access: ContentPackageScope;
  lesson_order: number;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  is_locked?: boolean;
  lesson_progress?: {
    watched?: boolean;
    watched_at?: string | null;
    completed: boolean;
    completed_at: string | null;
    quiz_score?: number | null;
    quiz_total?: number | null;
    quiz_percentage?: number | null;
    quiz_passed?: boolean;
  }[];
};

export type LessonVocabularyItem = {
  term: string;
  definition: string;
};

export type LessonSummaryLink = {
  label: string;
  url: string;
};

export type LessonQuestionOption = {
  id: string;
  lesson_question_id?: string;
  option_text: string;
  is_correct: boolean;
};

export type LessonQuestion = {
  id: string;
  lesson_id: string;
  question_text: string;
  explanation: string | null;
  question_order: number;
  is_active: boolean;
  created_at: string;
  options: LessonQuestionOption[];
  lesson?: Pick<Lesson, "id" | "title" | "level">;
};

export type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  level: Level;
  applies_to_all?: boolean;
  instructor_name: string | null;
  start_time: string;
  end_time: string;
  live_url: string | null;
  replay_url: string | null;
  package_access: ContentPackageScope;
  is_active: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export type SuccessStory = {
  id: string;
  student_name: string;
  title: string;
  description: string;
  before_level: Level | null;
  after_level: Level | null;
  score: number | null;
  score_currency?: "USD" | "SAR" | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
};
