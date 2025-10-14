import { useEffect, useState } from 'react';
import { FileText, Plus, BarChart3, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Survey } from '../types';

interface SurveyListProps {
  onCreateSurvey: () => void;
  onTakeSurvey: (surveyId: string) => void;
  onViewResults: (surveyId: string) => void;
}

export default function SurveyList({ onCreateSurvey, onTakeSurvey, onViewResults }: SurveyListProps) {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  useEffect(() => {
    loadSurveys();
  }, [activeTab]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab === 'my') {
        query = query.eq('creator_id', user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error('Error loading surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">问卷列表</h2>
          <button
            onClick={onCreateSurvey}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            创建问卷
          </button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-2 font-medium transition-colors border-b-2 ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            所有问卷
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`pb-3 px-2 font-medium transition-colors border-b-2 ${
              activeTab === 'my'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            我的问卷
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">加载中...</div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400">
              {activeTab === 'my' ? '您还没有创建任何问卷' : '暂无可用问卷'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="border border-slate-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      {survey.title}
                    </h3>
                    {survey.description && (
                      <p className="text-slate-600 mb-3">{survey.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {formatDate(survey.created_at)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          survey.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {survey.is_active ? '进行中' : '已关闭'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {survey.creator_id === user!.id ? (
                      <button
                        onClick={() => onViewResults(survey.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <BarChart3 size={18} />
                        查看结果
                      </button>
                    ) : survey.is_active ? (
                      <button
                        onClick={() => onTakeSurvey(survey.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileText size={18} />
                        填写问卷
                      </button>
                    ) : (
                      <span className="px-4 py-2 text-slate-400">问卷已关闭</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
