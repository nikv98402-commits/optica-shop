import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OpticalCard, OpticalEyebrow, OpticalStatus } from '../../components/foundation/primitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { getReferral } from './api';
import { employeeFlowCopy } from './copy';
import type { Referral } from './types';

export function ReferralPage() {
  const { language } = useLanguage(); const copy = employeeFlowCopy[language];
  const { locale = language, organizationId = '', referralId = '' } = useParams();
  const [referral, setReferral] = useState<Referral | null>(null); const [error, setError] = useState(false);
  useEffect(() => { let active = true; void getReferral(organizationId, referralId).then((value) => active && setReferral(value)).catch(() => active && setError(true)); return () => { active = false; }; }, [organizationId, referralId]);
  if (!referral && !error) return <main className="employee-flow-shell">{copy.common.loading}</main>;
  if (!referral) return <main className="employee-flow-shell"><div className="employee-flow-error" role="alert">{copy.common.retry}</div></main>;
  const formatter = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'long' });
  return <main className="employee-flow-shell">
    <section className="employee-flow-hero"><div><OpticalEyebrow>{copy.referral.eyebrow}</OpticalEyebrow><h1>{copy.referral.title}</h1><p>{copy.referral.lead}</p></div><OpticalStatus tone="success">{copy.common.privacy}</OpticalStatus></section>
    <div className="employee-flow-grid">
      <OpticalCard className="employee-flow-primary-card">
        <OpticalEyebrow>{copy.referral.status}</OpticalEyebrow><h2>{copy.referral.statusValue}</h2>
        <div className="employee-flow-result-window"><small>{copy.referral.deadline}</small><strong>{formatter.format(new Date(referral.respond_by))}</strong></div>
        <Link className="optical-button" to={`/${locale}/organizations/${organizationId}/employee/today`}>{copy.common.back}</Link>
      </OpticalCard>
      <OpticalCard><OpticalEyebrow>{copy.referral.next}</OpticalEyebrow><ol className="employee-flow-steps">{copy.referral.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>)}</ol></OpticalCard>
    </div>
    <aside className="employee-flow-safety" role="note">{copy.referral.safety}</aside>
  </main>;
}
