import { useEffect, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Survey, Question } from '../types';

interface TakeSurveyProps {
  surveyId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function TakeSurvey({ surveyId, onBack, onSuccess }: TakeSurveyProps) {
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .maybeSingle();

      if (surveyError) throw surveyError;
      if (!surveyData) throw new Error('问卷不存在');

      setSurvey(surveyData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      const { data: existingResponse } = await supabase
        .from('responses')
        .select('id')
        .eq('survey_id', surveyId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (existingResponse) {
        setAlreadySubmitted(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const currentAnswers = (answers[questionId] as string[]) || [];
    if (checked) {
      handleAnswerChange(questionId, [...currentAnswers, option]);
    } else {
      handleAnswerChange(questionId, currentAnswers.filter((a) => a !== option));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (const question of questions) {
      if (question.is_required && !answers[question.id]) {
        setError(`请回答问题：${question.question_text}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert({
          survey_id: surveyId,
          user_id: user!.id,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      const answersToInsert = Object.entries(answers).map(([questionId, value]) => ({
        response_id: response.id,
        question_id: questionId,
        answer_value: value,
      }));

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-12 text-slate-400">加载中...</div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">您已提交过此问卷</h2>
          <p className="text-slate-600">感谢您的参与！</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600">问卷不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        返回
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">{survey.title}</h1>
          {survey.description && (
            <p className="text-slate-600">{survey.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map((question, index) => (
            <div key={question.id} className="border-l-4 border-blue-500 pl-6 py-2">
              <label className="block text-lg font-medium text-slate-800 mb-4">
                {index + 1}. {question.question_text}
                {question.is_required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>

              {question.question_type === 'text' ? (
                <textarea
                  value={(answers[question.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  required={question.is_required}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="请输入您的答案"
                />
              ) : question.question_type === 'single_choice' ? (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        required={question.is_required}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-slate-700">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={(answers[question.id] as string[] || []).includes(option)}
                        onChange={(e) =>
                          handleCheckboxChange(question.id, option, e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-slate-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              {submitting ? '提交中...' : '提交问卷'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
