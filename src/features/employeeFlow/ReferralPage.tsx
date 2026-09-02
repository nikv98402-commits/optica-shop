import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OpticalCard, OpticalEyebrow, OpticalStatus } from '../../components/foundation/primitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { consentAndAssignReferral, getReferral, getReferralProviderOptions } from './api';
import { employeeFlowCopy } from './copy';
import type { Referral, ReferralProviderOption } from './types';

export function ReferralPage() {
  const { language } = useLanguage(); const copy = employeeFlowCopy[language];
  const { locale = language, organizationId = '', referralId = '' } = useParams();
  const [referral, setReferral] = useState<Referral | null>(null); const [error, setError] = useState(false);
  const [providers, setProviders] = useState<ReferralProviderOption[]>([]); const [providerId, setProviderId] = useState('');
  const [pending, setPending] = useState(false); const [actionError, setActionError] = useState(false); const [assigned, setAssigned] = useState(false);
  const operationKey = useRef(crypto.randomUUID());
  useEffect(() => { let active = true; void Promise.all([getReferral(organizationId, referralId), getReferralProviderOptions(organizationId)]).then(([value, options]) => { if (active) { setReferral(value); setProviders(options); setProviderId(options[0]?.id ?? ''); } }).catch(() => active && setError(true)); return () => { active = false; }; }, [organizationId, referralId]);
  if (!referral && !error) return <main className="employee-flow-shell">{copy.common.loading}</main>;
  if (!referral) return <main className="employee-flow-shell"><div className="employee-flow-error" role="alert">{copy.common.retry}</div></main>;
  const formatter = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'long' });
  const appointmentFormatter = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const providerStatus = referral.provider_status === 'unassigned' ? null : referral.provider_status;
  const statusText = providerStatus ? copy.referral[providerStatus] : copy.referral.statusValue;
  return <main className="employee-flow-shell">
    <section className="employee-flow-hero"><div><OpticalEyebrow>{copy.referral.eyebrow}</OpticalEyebrow><h1>{copy.referral.title}</h1><p>{copy.referral.lead}</p></div><OpticalStatus tone="success">{copy.common.privacy}</OpticalStatus></section>
    <div className="employee-flow-grid">
      <OpticalCard className="employee-flow-primary-card">
        <OpticalEyebrow>{copy.referral.status}</OpticalEyebrow><h2>{statusText}</h2>
        <div className="employee-flow-result-window"><small>{referral.appointment_at ? copy.referral.scheduledFor : copy.referral.deadline}</small><strong>{referral.appointment_at ? appointmentFormatter.format(new Date(referral.appointment_at)) : formatter.format(new Date(referral.respond_by))}</strong></div>
        {!referral.provider_organization_id && <div className="employee-flow-provider"><label>{copy.referral.chooseProvider}<select value={providerId} onChange={(event) => setProviderId(event.target.value)} disabled={pending}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><p>{copy.referral.consentNotice}</p><button className="optical-button" disabled={!providerId || pending} onClick={() => { setPending(true); setActionError(false); void consentAndAssignReferral(organizationId, referral, providerId, operationKey.current).then((value) => { setReferral(value); setAssigned(true); operationKey.current = crypto.randomUUID(); }).catch(() => setActionError(true)).finally(() => setPending(false)); }}>{pending ? copy.referral.sending : copy.referral.shareAndSend}</button></div>}
        {assigned && <p role="status">{copy.referral.assignmentSuccess}</p>}{actionError && <p role="alert">{copy.referral.assignmentFailed}</p>}
        <Link className="optical-button" to={`/${locale}/organizations/${organizationId}/employee/today`}>{copy.common.back}</Link>
      </OpticalCard>
      <OpticalCard><OpticalEyebrow>{copy.referral.next}</OpticalEyebrow><ol className="employee-flow-steps">{copy.referral.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>)}</ol></OpticalCard>
    </div>
    <aside className="employee-flow-safety" role="note">{copy.referral.safety}</aside>
  </main>;
}
