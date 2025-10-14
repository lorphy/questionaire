export interface Survey {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text';
  options: string[];
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface Response {
  id: string;
  survey_id: string;
  user_id: string;
  created_at: string;
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  answer_value: string | string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}
