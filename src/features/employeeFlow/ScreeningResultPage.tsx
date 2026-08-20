import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OpticalButton, OpticalCard, OpticalEyebrow, OpticalStatus } from '../../components/foundation/primitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { createReferral, getScreeningResult } from './api';
import { employeeFlowCopy } from './copy';
import type { Screening, ScreeningResult } from './types';

export function ScreeningResultPage() {
  const { language } = useLanguage(); const copy = employeeFlowCopy[language];
  const { locale = language, organizationId = '', screeningId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ screening: Screening; result: ScreeningResult } | null>(null);
  const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  const today = `/${locale}/organizations/${organizationId}/employee/today`;
  useEffect(() => { let active = true; void getScreeningResult(organizationId, screeningId).then((value) => active && setData(value)).catch(() => active && setError(true)); return () => { active = false; }; }, [organizationId, screeningId]);
  async function refer() {
    setBusy(true); setError(false);
    try { const referral = await createReferral(organizationId, screeningId); navigate(`/${locale}/organizations/${organizationId}/employee/referrals/${referral.id}`); }
    catch { setError(true); } finally { setBusy(false); }
  }
  if (!data && !error) return <main className="employee-flow-shell">{copy.common.loading}</main>;
  if (!data) return <main className="employee-flow-shell"><div className="employee-flow-error" role="alert">{copy.common.retry}</div></main>;
  const outcome = data.result.outcome; const needsReferral = outcome !== 'routine';
  return <main className="employee-flow-shell">
    <section className="employee-flow-grid">
      <OpticalCard className="employee-flow-primary-card">
        <OpticalStatus tone={outcome === 'urgent' ? 'warning' : 'signal'}>{copy.result.eyebrow}</OpticalStatus>
        <h1>{copy.result.title[outcome]}</h1><p>{copy.result.summary[outcome]}</p>
        <div className="employee-flow-result-window"><small>{copy.result.window}</small><strong>{copy.result.days[data.result.review_within_days]}</strong></div>
        {needsReferral ? <OpticalButton disabled={busy} onClick={refer}>{copy.result.createReferral}</OpticalButton> : <Link className="optical-button" to={today}>{copy.result.noReferral}</Link>}
      </OpticalCard>
      <OpticalCard className="employee-flow-dark-card"><OpticalEyebrow>{copy.result.why}</OpticalEyebrow><h2>{copy.today.helperTitle}</h2><p>{copy.result.boundary}</p><small>{data.result.protocol_version} · {data.result.scoring_version}</small></OpticalCard>
    </section>
    <p className="employee-flow-privacy">{copy.common.privacy}</p>
    {error && <div className="employee-flow-error" role="alert">{copy.common.retry}</div>}
  </main>;
}
