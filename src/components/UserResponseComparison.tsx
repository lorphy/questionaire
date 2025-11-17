import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Survey, Question, Answer, Response } from '../types';

interface UserResponseComparisonProps {
  userId: string;
  surveyId: string;
  onBack: () => void;
}

export default function UserResponseComparison({ 
  userId, 
  surveyId, 
  onBack 
}: UserResponseComparisonProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedResponses, setSelectedResponses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparisonData();
  }, [userId, surveyId]);

  const loadComparisonData = async () => {
    try {
      // 获取问卷详情
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .maybeSingle();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      // 获取问卷问题
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // 获取用户所有回答
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('user_id', userId)
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      // 默认选择最新的两个回答
      if (responsesData && responsesData.length >= 2) {
        setSelectedResponses([responsesData[0].id, responsesData[1].id]);
      } else if (responsesData && responsesData.length === 1) {
        setSelectedResponses([responsesData[0].id]);
      }

      // 获取所有回答的答案
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .in('response_id', responsesData?.map(r => r.id) || []);

      if (answersError) throw answersError;
      setAnswers(answersData || []);

    } catch (err: any) {
      console.error('Error loading comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerForQuestion = (responseId: string, questionId: string) => {
    return answers.find(a => 
      a.response_id === responseId && 
      a.question_id === questionId
    );
  };

  const toggleResponseSelection = (responseId: string) => {
    if (selectedResponses.includes(responseId)) {
      setSelectedResponses(selectedResponses.filter(id => id !== responseId));
    } else {
      if (selectedResponses.length < 3) {
        setSelectedResponses([...selectedResponses, responseId]);
      }
    }
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

  if (responses.length < 2) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-slate-600">
            该用户只回答了{responses.length}次，无法进行对比
          </p>
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

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">选择要对比的回答</h2>
        <div className="space-y-2">
          {responses.map(response => (
            <div key={response.id} className="flex items-center">
              <input
                type="checkbox"
                id={`response-${response.id}`}
                checked={selectedResponses.includes(response.id)}
                onChange={() => toggleResponseSelection(response.id)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor={`response-${response.id}`} className="ml-2 text-slate-700">
                {new Date(response.created_at).toLocaleString()}
              </label>
            </div>
          ))}
        </div>
      </div>

      {selectedResponses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">问题</th>
                {selectedResponses.map(responseId => {
                  const response = responses.find(r => r.id === responseId);
                  return (
                    <th key={responseId} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {response ? new Date(response.created_at).toLocaleDateString() : ''}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map(question => (
                <tr key={question.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {question.question_text}
                  </td>
                  {selectedResponses.map(responseId => {
                    const answer = getAnswerForQuestion(responseId, question.id);
                    return (
                      <td key={`${responseId}-${question.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {answer ? (
                          Array.isArray(answer.answer_value) 
                            ? answer.answer_value.join(', ') 
                            : answer.answer_value
                        ) : '未回答'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}