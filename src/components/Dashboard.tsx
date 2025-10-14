import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SurveyList from './SurveyList';
import CreateSurvey from './CreateSurvey';
import TakeSurvey from './TakeSurvey';
import SurveyResults from './SurveyResults';

type View =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'take'; surveyId: string }
  | { type: 'results'; surveyId: string };

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>({ type: 'list' });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">调查问卷系统</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 text-sm">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="py-8">
        {view.type === 'list' && (
          <SurveyList
            onCreateSurvey={() => setView({ type: 'create' })}
            onTakeSurvey={(surveyId) => setView({ type: 'take', surveyId })}
            onViewResults={(surveyId) => setView({ type: 'results', surveyId })}
          />
        )}

        {view.type === 'create' && (
          <CreateSurvey
            onBack={() => setView({ type: 'list' })}
            onSuccess={() => setView({ type: 'list' })}
          />
        )}

        {view.type === 'take' && (
          <TakeSurvey
            surveyId={view.surveyId}
            onBack={() => setView({ type: 'list' })}
            onSuccess={() => setView({ type: 'list' })}
          />
        )}

        {view.type === 'results' && (
          <SurveyResults
            surveyId={view.surveyId}
            onBack={() => setView({ type: 'list' })}
          />
        )}
      </main>
    </div>
  );
}
