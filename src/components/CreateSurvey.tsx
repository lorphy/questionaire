import { useState } from 'react';
import { Plus, Trash2, GripVertical, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Question } from '../types';

interface CreateSurveyProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateSurvey({ onBack, onSuccess }: CreateSurveyProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'survey_id' | 'created_at'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = (type: 'single_choice' | 'multiple_choice' | 'text') => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: type,
        options: type === 'text' ? [] : [''],
        is_required: true,
        order_index: questions.length,
      },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push('');
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.splice(optionIndex, 1);
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => q.order_index = i);
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入问卷标题');
      return;
    }

    if (questions.length === 0) {
      setError('请至少添加一个问题');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        setError(`问题 ${i + 1} 的内容不能为空`);
        return;
      }
      if (questions[i].question_type !== 'text' && questions[i].options.length < 2) {
        setError(`问题 ${i + 1} 至少需要两个选项`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title,
          description,
          creator_id: user!.id,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const questionsToInsert = questions.map((q) => ({
        survey_id: survey.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        is_required: q.is_required,
        order_index: q.order_index,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        返回
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">创建新问卷</h2>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              问卷标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入问卷标题"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              问卷描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="输入问卷描述（可选）"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">问题列表</h3>
            <div className="flex gap-2">
              <button
                onClick={() => addQuestion('single_choice')}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + 单选题
              </button>
              <button
                onClick={() => addQuestion('multiple_choice')}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                + 多选题
              </button>
              <button
                onClick={() => addQuestion('text')}
                className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                + 文本题
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                <div className="flex items-start gap-3 mb-4">
                  <GripVertical className="text-slate-400 mt-2" size={20} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-slate-600">
                        问题 {qIndex + 1}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-200 text-slate-700">
                        {question.question_type === 'single_choice' && '单选'}
                        {question.question_type === 'multiple_choice' && '多选'}
                        {question.question_type === 'text' && '文本'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入问题内容"
                    />

                    {question.question_type !== 'text' && (
                      <div className="mt-4 space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">选项 {oIndex + 1}</span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="输入选项内容"
                            />
                            {question.options.length > 1 && (
                              <button
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(qIndex)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          + 添加选项
                        </button>
                      </div>
                    )}

                    <label className="flex items-center gap-2 mt-4 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={question.is_required}
                        onChange={(e) => updateQuestion(qIndex, 'is_required', e.target.checked)}
                        className="rounded"
                      />
                      必填
                    </label>
                  </div>
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                点击上方按钮添加问题
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={20} />
            {loading ? '保存中...' : '保存问卷'}
          </button>
        </div>
      </div>
    </div>
  );
}
