/*
  # 调查问卷系统数据库架构

  ## 概述
  创建一个完整的调查问卷系统，支持用户注册、问卷设计和回答功能。

  ## 新建表

  ### 1. surveys（问卷表）
  - `id` (uuid, 主键) - 问卷唯一标识
  - `title` (text) - 问卷标题
  - `description` (text) - 问卷描述
  - `creator_id` (uuid) - 创建者ID，关联到auth.users
  - `is_active` (boolean) - 是否激活
  - `created_at` (timestamptz) - 创建时间
  - `updated_at` (timestamptz) - 更新时间

  ### 2. questions（问题表）
  - `id` (uuid, 主键) - 问题唯一标识
  - `survey_id` (uuid) - 关联的问卷ID
  - `question_text` (text) - 问题内容
  - `question_type` (text) - 问题类型：'single_choice'（单选）, 'multiple_choice'（多选）, 'text'（文本）
  - `options` (jsonb) - 选项数据（对于选择题）
  - `is_required` (boolean) - 是否必填
  - `order_index` (integer) - 问题顺序
  - `created_at` (timestamptz) - 创建时间

  ### 3. responses（回答表）
  - `id` (uuid, 主键) - 回答唯一标识
  - `survey_id` (uuid) - 关联的问卷ID
  - `user_id` (uuid) - 回答者ID
  - `created_at` (timestamptz) - 回答时间

  ### 4. answers（答案表）
  - `id` (uuid, 主键) - 答案唯一标识
  - `response_id` (uuid) - 关联的回答ID
  - `question_id` (uuid) - 关联的问题ID
  - `answer_value` (jsonb) - 答案内容（支持多选、单选、文本）
  - `created_at` (timestamptz) - 创建时间

  ## 安全设置
  - 所有表启用行级安全 (RLS)
  - 用户可以查看和创建自己的问卷
  - 用户可以查看激活的问卷
  - 用户可以提交问卷回答
  - 问卷创建者可以查看所有回答结果

  ## 索引
  - 为外键关系创建索引以提升查询性能
*/

-- 创建 surveys 表
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建 questions 表
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'text')),
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 创建 responses 表
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(survey_id, user_id)
);

-- 创建 answers 表
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  answer_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_response_id ON answers(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- 启用 RLS
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Surveys 策略
CREATE POLICY "Users can view active surveys"
  ON surveys FOR SELECT
  TO authenticated
  USING (is_active = true OR creator_id = auth.uid());

CREATE POLICY "Users can create their own surveys"
  ON surveys FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own surveys"
  ON surveys FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can delete their own surveys"
  ON surveys FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Questions 策略
CREATE POLICY "Users can view questions from accessible surveys"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = questions.survey_id
      AND (surveys.is_active = true OR surveys.creator_id = auth.uid())
    )
  );

CREATE POLICY "Survey creators can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = questions.survey_id
      AND surveys.creator_id = auth.uid()
    )
  );

CREATE POLICY "Survey creators can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = questions.survey_id
      AND surveys.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = questions.survey_id
      AND surveys.creator_id = auth.uid()
    )
  );

CREATE POLICY "Survey creators can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = questions.survey_id
      AND surveys.creator_id = auth.uid()
    )
  );

-- Responses 策略
CREATE POLICY "Users can view their own responses"
  ON responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Survey creators can view all responses"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = responses.survey_id
      AND surveys.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create responses to active surveys"
  ON responses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = responses.survey_id
      AND surveys.is_active = true
    )
  );

-- Answers 策略
CREATE POLICY "Users can view their own answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = answers.response_id
      AND responses.user_id = auth.uid()
    )
  );

CREATE POLICY "Survey creators can view all answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM responses
      JOIN surveys ON surveys.id = responses.survey_id
      WHERE responses.id = answers.response_id
      AND surveys.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert answers to their responses"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM responses
      WHERE responses.id = answers.response_id
      AND responses.user_id = auth.uid()
    )
  );