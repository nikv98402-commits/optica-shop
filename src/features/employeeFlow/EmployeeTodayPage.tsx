import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OpticalButton, OpticalCard, OpticalEyebrow, OpticalStatus } from '../../components/foundation/primitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { completeScreening, getLatestScreening, getScreeningProgress, saveScreeningProgress, startScreening } from './api';
import { employeeFlowCopy } from './copy';
import { useEmployeeFlowState } from './EmployeeFlowState';
import type { ScreeningAnswer } from './types';

export function EmployeeTodayPage() {
  const { language } = useLanguage();
  const copy = employeeFlowCopy[language];
  const { locale = language, organizationId = '' } = useParams();
  const navigate = useNavigate();
  const { activeScreening, setActiveScreening } = useEmployeeFlowState();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ScreeningAnswer[]>([]);

  useEffect(() => {
    let mounted = true;
    void getLatestScreening(organizationId).then(async (screening) => {
      if (!mounted) return;
      setActiveScreening(screening);
      if (screening?.status === 'in_progress') {
        const progress = await getScreeningProgress(organizationId, screening.id);
        if (mounted && progress) {
          setAnswers(progress.answers);
          setStep(Math.min(progress.current_step, copy.questions.length - 1));
        }
      }
    }).catch(() => mounted && setError(true)).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [copy.questions.length, organizationId, setActiveScreening]);

  const question = copy.questions[step];
  const selected = answers.find((answer) => answer.questionId === question?.id)?.score;
  const progress = useMemo(() => ((step + 1) / copy.questions.length) * 100, [copy.questions.length, step]);
  const resultPath = activeScreening ? `/${locale}/organizations/${organizationId}/employee/screenings/${activeScreening.id}/result` : '';

  async function begin() {
    if (activeScreening?.status === 'completed') return navigate(resultPath);
    if (!activeScreening) {
      setBusy(true); setError(false);
      try { setActiveScreening(await startScreening(organizationId)); } catch { setError(true); }
      finally { setBusy(false); }
    }
  }

  function choose(score: number) {
    if (!question) return;
    const urgent = (question.id === 'one-eye' || question.id === 'distortion') && score === 3;
    setAnswers((current) => [...current.filter((item) => item.questionId !== question.id), {
      questionId: question.id as ScreeningAnswer['questionId'], score: score as ScreeningAnswer['score'], urgent,
    }]);
  }

  async function next() {
    if (selected === undefined || !activeScreening) return;
    if (step < copy.questions.length - 1) {
      setBusy(true); setError(false);
      try {
        const updated = await saveScreeningProgress(organizationId, activeScreening, step + 1, answers);
        setActiveScreening(updated);
        setStep((value) => value + 1);
      } catch { setError(true); } finally { setBusy(false); }
      return;
    }
    setBusy(true); setError(false);
    try {
      const completed = await completeScreening(organizationId, activeScreening, answers);
      setActiveScreening(completed.screening);
      navigate(`/${locale}/organizations/${organizationId}/employee/screenings/${completed.screening.id}/result`);
    } catch { setError(true); } finally { setBusy(false); }
  }

  if (loading) return <main className="employee-flow-shell" aria-live="polite">{copy.common.loading}</main>;
  return (
    <main className="employee-flow-shell">
      <section className="employee-flow-hero">
        <div>
          <OpticalEyebrow>{copy.today.eyebrow}</OpticalEyebrow>
          <h1>{copy.today.title}</h1>
          <p>{copy.today.lead}</p>
        </div>
        <OpticalStatus tone="success">{copy.common.privacy}</OpticalStatus>
      </section>

      {!activeScreening || activeScreening.status === 'completed' ? (
        <div className="employee-flow-grid">
          <OpticalCard className="employee-flow-primary-card">
            <OpticalEyebrow>{activeScreening?.status === 'completed' ? copy.result.eyebrow : copy.today.eyebrow}</OpticalEyebrow>
            <h2>{activeScreening?.status === 'completed' ? copy.today.viewResult : copy.today.title}</h2>
            <p>{copy.today.lead}</p>
            <OpticalButton disabled={busy} onClick={begin}>{activeScreening?.status === 'completed' ? copy.today.viewResult : copy.today.start}</OpticalButton>
          </OpticalCard>
          <OpticalCard className="employee-flow-dark-card">
            <span className="employee-flow-mark" aria-hidden="true">V</span>
            <h2>{copy.today.helperTitle}</h2><p>{copy.today.helper}</p>
          </OpticalCard>
        </div>
      ) : (
        <OpticalCard className="employee-flow-question" aria-live="polite">
          <div className="employee-flow-question__meta">
            <OpticalEyebrow>{copy.today.step} {step + 1} {copy.today.of} {copy.questions.length}</OpticalEyebrow>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="employee-flow-progress"><span style={{ width: `${progress}%` }} /></div>
          <h2>{question.title}</h2>
          <div className="employee-flow-options">
            {question.options.map((label, score) => <button key={label} aria-pressed={selected === score} className={selected === score ? 'is-selected' : ''} onClick={() => choose(score)}>{label}</button>)}
          </div>
          <OpticalButton disabled={selected === undefined || busy} onClick={next}>{step === copy.questions.length - 1 ? copy.today.finish : copy.today.continue}</OpticalButton>
        </OpticalCard>
      )}
      {error && <div className="employee-flow-error" role="alert"><span>{copy.common.retry}</span><button onClick={() => location.reload()}>{copy.common.retry}</button></div>}
    </main>
  );
}
