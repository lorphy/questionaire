import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, Question, Answer } from '../types';

interface UserResponseDetailProps {
  responseId: string;
  onBack: () => void;
}

export default function UserResponseDetail({ responseId, onBack }: UserResponseDetailProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResponseDetails();
  }, [responseId]);

  const loadResponseDetails = async () => {
    try {
      // 获取回答关联的问卷
      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .select('survey_id')
        .eq('id', responseId)
        .maybeSingle();

      if (responseError) throw responseError;
      if (!responseData) throw new Error('回答不存在');

      // 获取问卷详情
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', responseData.survey_id)
        .maybeSingle();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      // 获取问卷问题
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', responseData.survey_id)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // 获取回答详情
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .eq('response_id', responseId);

      if (answersError) throw answersError;
      setAnswers(answersData || []);

    } catch (err: any) {
      console.error('Error loading response details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.question_id === questionId);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center py-12 text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600">问卷不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        返回
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{survey.title}</h1>
            {survey.description && (
              <p className="text-slate-600">{survey.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => {
          const answer = getAnswerForQuestion(question.id);
          
          return (
            <div key={question.id} className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">
                {index + 1}. {question.question_text}
              </h3>

              {answer ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-700">
                    {Array.isArray(answer.answer_value) 
                      ? answer.answer_value.join(', ') 
                      : answer.answer_value}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400">未回答</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}