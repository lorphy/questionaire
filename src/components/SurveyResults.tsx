import { useEffect, useState } from 'react';
import { ArrowLeft, Users, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, Question, Response, Answer } from '../types';

interface SurveyResultsProps {
  surveyId: string;
  onBack: () => void;
}

interface QuestionStats {
  question: Question;
  totalResponses: number;
  answers: Record<string, number>;
  textAnswers: string[];
}

export default function SurveyResults({ surveyId, onBack }: SurveyResultsProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<QuestionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResponses, setTotalResponses] = useState(0);

  useEffect(() => {
    loadResults();
  }, [surveyId]);

  const loadResults = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .maybeSingle();

      if (surveyError) throw surveyError;
      if (!surveyData) throw new Error('问卷不存在');

      setSurvey(surveyData);

      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_id', surveyId);

      if (responsesError) throw responsesError;

      setTotalResponses(responsesData?.length || 0);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (questionsError) throw questionsError;

      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .in('response_id', responsesData?.map(r => r.id) || []);

      if (answersError) throw answersError;

      const questionStats: QuestionStats[] = (questionsData || []).map((question) => {
        const questionAnswers = answersData?.filter((a) => a.question_id === question.id) || [];

        const stats: QuestionStats = {
          question,
          totalResponses: questionAnswers.length,
          answers: {},
          textAnswers: [],
        };

        if (question.question_type === 'text') {
          stats.textAnswers = questionAnswers.map((a) => a.answer_value as string);
        } else {
          questionAnswers.forEach((answer) => {
            const value = answer.answer_value;
            if (Array.isArray(value)) {
              value.forEach((v) => {
                stats.answers[v] = (stats.answers[v] || 0) + 1;
              });
            } else {
              stats.answers[value] = (stats.answers[value] || 0) + 1;
            }
          });
        }

        return stats;
      });

      setStats(questionStats);
    } catch (err: any) {
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
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
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Users size={20} />
            <span className="font-semibold">{totalResponses} 人参与</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {stats.map((stat, index) => (
          <div key={stat.question.id} className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-3 mb-6">
              <BarChart2 className="text-blue-600 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-800 mb-1">
                  {index + 1}. {stat.question.question_text}
                </h3>
                <p className="text-sm text-slate-500">
                  {stat.totalResponses} 个回答
                </p>
              </div>
            </div>

            {stat.question.question_type === 'text' ? (
              <div className="space-y-3">
                {stat.textAnswers.length > 0 ? (
                  stat.textAnswers.map((answer, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <p className="text-slate-700">{answer}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-8">暂无回答</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {stat.question.options.map((option) => {
                  const count = stat.answers[option] || 0;
                  const percentage = getPercentage(count, stat.totalResponses);

                  return (
                    <div key={option}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-700 font-medium">{option}</span>
                        <span className="text-slate-600">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {stats.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-slate-400">暂无统计数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
