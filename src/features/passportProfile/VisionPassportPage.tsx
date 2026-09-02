import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { OpticalButton,OpticalCard,OpticalEyebrow,OpticalStatus } from '../../components/foundation/primitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { getClinicDocumentDownloadUrl,getClinicDocumentUrl,getVisionPassport } from './api';
import { passportProfileCopy,recommendationCopy } from './copy';
import type { PassportDocument,VisionPassport } from './types';

export function VisionPassportPage(){
 const {language}=useLanguage(); const c=passportProfileCopy[language]; const {locale=language,organizationId=''}=useParams();
 const [data,setData]=useState<VisionPassport|null>(null); const [error,setError]=useState(false); const [opening,setOpening]=useState<string|null>(null);
 useEffect(()=>{let active=true;void getVisionPassport(organizationId).then(v=>active&&setData(v)).catch(()=>active&&setError(true));return()=>{active=false}},[organizationId]);
 async function openDocument(document:PassportDocument){
  const target=window.open('','_blank')
  if(!target){setError(true);return}
  target.opener=null
  setOpening(document.id)
  try{
   const url=await getClinicDocumentUrl(document.storagePath)
   target.location.href=url
  }catch{
   target?.close()
   setError(true)
  }finally{setOpening(null)}
 }
 async function downloadDocument(document:PassportDocument){
  setOpening(document.id)
  try{const url=await getClinicDocumentDownloadUrl(document.storagePath,document.title);const link=window.document.createElement('a');link.href=url;link.download=document.title;link.click()}catch{setError(true)}finally{setOpening(null)}
 }
 if(error)return <main className="employee-flow-shell" role="alert">{c.error}</main>; if(!data)return <main className="employee-flow-shell">{c.loading}</main>;
 const base=`/${locale}/organizations/${organizationId}/employee`;
 return <main className="employee-flow-shell passport-page">
  <section className="employee-flow-hero"><div><OpticalEyebrow>{c.passport.eyebrow}</OpticalEyebrow><h1>{c.passport.title}</h1><p>{c.passport.lead}</p></div><OpticalStatus tone="success">{c.profile.privacy}</OpticalStatus></section>
  <div className="passport-summary"><OpticalCard><OpticalEyebrow>{c.passport.next}</OpticalEyebrow><strong>{data.nextReviewAt?new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(data.nextReviewAt)):'—'}</strong></OpticalCard><OpticalCard><OpticalEyebrow>{c.passport.screenings}</OpticalEyebrow><strong>{data.screenings.length}</strong></OpticalCard><OpticalCard><OpticalEyebrow>{c.passport.referrals}</OpticalEyebrow><strong>{data.referrals.length}</strong></OpticalCard></div>
  <div className="passport-grid">
   <OpticalCard><h2>{c.passport.screenings}</h2><div className="passport-timeline">{data.screenings.length?data.screenings.map(s=><Link key={s.id} to={`${base}/screenings/${s.id}/result`}><time>{new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(s.completedAt))}</time><strong>{c.passport[s.outcome]}</strong><OpticalStatus tone={s.outcome==='urgent'?'warning':'success'}>{s.reviewWithinDays===0?(language==='ru'?'24 ч':'24h'):(language==='ru'?`${s.reviewWithinDays} дн.`:`${s.reviewWithinDays} days`)}</OpticalStatus></Link>):<p>{c.empty}</p>}</div></OpticalCard>
   <OpticalCard><h2>{c.passport.referrals}</h2><div className="passport-timeline">{data.referrals.length?data.referrals.map(r=><Link key={r.id} to={`${base}/referrals/${r.id}`}><time>{new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(r.createdAt))}</time><strong>{c.passport[r.priority]}</strong><OpticalStatus>{c.passport[r.status]}</OpticalStatus>{r.appointmentAt&&<span>{c.passport.scheduledFor}: <strong>{new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short'}).format(new Date(r.appointmentAt))}</strong></span>}</Link>):<p>{c.empty}</p>}</div></OpticalCard>
   <OpticalCard><h2>{c.passport.recommendations}</h2>{data.recommendations.length?data.recommendations.map(x=><div className="passport-row" key={x.id}><strong>{recommendationCopy[language][x.titleKey]}</strong><OpticalStatus>{c.passport[x.status]}</OpticalStatus></div>):<p>{c.empty}</p>}</OpticalCard>
    <OpticalCard><h2>{c.passport.documents}</h2>{data.documents.length?data.documents.map(x=><div className="passport-row" key={x.id}><div><strong>{x.title}</strong><time>{new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(x.issuedAt))}</time></div><div className="passport-actions"><OpticalButton disabled={opening===x.id} onClick={()=>void openDocument(x)}>{c.open}</OpticalButton><OpticalButton disabled={opening===x.id} onClick={()=>void downloadDocument(x)}>{c.download}</OpticalButton></div></div>):<p>{c.empty}</p>}</OpticalCard>
  </div>
 </main>;
}
