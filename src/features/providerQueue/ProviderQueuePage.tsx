import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useParams} from 'react-router-dom';
import {useLanguage} from '../../contexts/LanguageContext';
import {OpticalButton,OpticalCard,OpticalEyebrow,OpticalStatus,type OpticalStatusTone} from '../../components/foundation/primitives';
import {providerCopy} from './copy';
import {bookAppointment,confirmOutcome,documentUrl,escalateReferral,getProviderQueue,getProviderReferral,type QueueDetail,type QueueItem} from './api';

type ActionKind='booking'|'escalation'|'outcome';
const PAGE_SIZE=50;

function priorityTone(priority:QueueItem['priority']):OpticalStatusTone{return priority==='urgent'?'danger':priority==='review_recommended'?'warning':'neutral'}
function statusTone(status:string):OpticalStatusTone{return status==='urgent_escalated'?'danger':status==='queued'?'info':status==='appointment_booked'?'success':status==='examination_completed'||status==='outcome_confirmed'?'success':'neutral'}

export function ProviderQueuePage(){
  const {organizationId=''}=useParams();
  const {language}=useLanguage();
  const c=providerCopy[language];
  const [priority,setPriority]=useState('');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(0);
  const [total,setTotal]=useState(0);
  const [items,setItems]=useState<QueueItem[]>([]);
  const [selected,setSelected]=useState<QueueDetail|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [documentError,setDocumentError]=useState(false);
  const [pending,setPending]=useState<ActionKind|null>(null);
  const [success,setSuccess]=useState('');
  const [reload,setReload]=useState(0);
  const keys=useRef<Record<string,string>>({});
  const detailRequest=useRef(0);
  const selectedId=useRef<string|null>(null);

  useEffect(()=>{
    let alive=true;
    setLoading(true);
    setError(false);
    getProviderQueue(organizationId,priority,search,page*PAGE_SIZE,PAGE_SIZE).then(v=>{
      if(!alive)return;
      const lastPage=Math.max(0,Math.ceil(v.total/PAGE_SIZE)-1);
      setTotal(v.total);
      if(page>lastPage){setPage(lastPage);return}
      setItems(v.items);setLoading(false);
    }).catch(()=>{if(alive){setError(true);setLoading(false)}});
    return()=>{alive=false};
  },[organizationId,priority,search,page,reload]);

  async function open(id:string){
    const request=++detailRequest.current;
    try{
      setError(false);setSuccess('');
      const detail=await getProviderReferral(organizationId,id);
      if(request===detailRequest.current){selectedId.current=detail.id;setSelected(detail)}
    }catch{if(request===detailRequest.current)setError(true)}
  }
  async function act(kind:ActionKind,fn:(key:string)=>Promise<void>){
    if(pending)return;
    const referralId=selectedId.current;
    const request=detailRequest.current;
    if(!referralId)return;
    const keyScope=`${referralId}:${kind}`;
    const requestKey=keys.current[keyScope]??crypto.randomUUID();
    keys.current[keyScope]=requestKey;
    try{
      setPending(kind);setError(false);setSuccess('');
      await fn(requestKey);
      const detail=await getProviderReferral(organizationId,referralId);
      if(request===detailRequest.current&&selectedId.current===referralId)setSelected(detail);
      delete keys.current[keyScope];
      if(request===detailRequest.current&&selectedId.current===referralId)setSuccess(kind==='booking'?c.bookingSaved:kind==='escalation'?c.escalationSaved:c.outcomeSaved);
      setReload(v=>v+1);
    }catch{
      if(request===detailRequest.current&&selectedId.current===referralId)setError(true);
    }finally{setPending(null)}
  }
  function openDocument(path:string){
    setDocumentError(false);
    const popup=window.open('','_blank');
    if(!popup){setDocumentError(true);return}
    popup.opener=null;
    void documentUrl(path).then(url=>{popup.location.href=url}).catch(()=>{popup.close();setDocumentError(true)});
  }
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  return <main className="operations-shell">
    <header className="operations-hero"><div><OpticalEyebrow>{c.eyebrow}</OpticalEyebrow><h1>{c.title}</h1><p>{c.subtitle}</p></div><div className="operations-filters"><input aria-label={c.search} placeholder={c.search} value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/><select aria-label={c.all} value={priority} onChange={e=>{setPriority(e.target.value);setPage(0)}}><option value="">{c.all}</option><option value="routine">{c.routine}</option><option value="review_recommended">{c.review}</option><option value="urgent">{c.urgent}</option></select></div></header>
    {error&&<p className="employee-flow-error" role="alert">{c.failed}</p>}
    {documentError&&<p className="employee-flow-error" role="alert">{c.documentFailed}</p>}
    {success&&<p role="status">{success}</p>}
    <section className="provider-list" aria-busy={loading}>{loading?<OpticalCard><p aria-live="polite">{c.loading}</p></OpticalCard>:items.length===0?<OpticalCard>{c.empty}</OpticalCard>:items.map(i=><OpticalCard key={i.id} className="provider-row"><div><OpticalStatus tone={priorityTone(i.priority)}>{i.priority==='urgent'?c.urgent:i.priority==='review_recommended'?c.review:c.routine}</OpticalStatus><h2>{i.patientName}</h2><p>{c.sla}: <strong>{new Date(i.respondBy).toLocaleString(language)}</strong></p>{i.appointmentAt&&<p>{c.scheduledFor}: <strong>{new Date(i.appointmentAt).toLocaleString(language)}</strong></p>}</div><div><OpticalStatus tone={statusTone(i.status)}>{c[i.status as keyof typeof c]??i.status}</OpticalStatus><OpticalButton onClick={()=>void open(i.id)}>{c.open}</OpticalButton></div></OpticalCard>)}</section>
    {!loading&&total>PAGE_SIZE&&<nav className="provider-pagination" aria-label={`${c.page} ${page+1} ${c.of} ${pages}`}><OpticalButton disabled={page===0} onClick={()=>setPage(v=>Math.max(0,v-1))}>{c.previous}</OpticalButton><span>{c.page} {page+1} {c.of} {pages}</span><OpticalButton disabled={(page+1)*PAGE_SIZE>=total} onClick={()=>setPage(v=>v+1)}>{c.next}</OpticalButton></nav>}
    {selected&&<ProviderDrawer selected={selected} c={c} language={language} pending={pending} close={()=>{detailRequest.current+=1;selectedId.current=null;setSelected(null)}} act={act} openDocument={openDocument} organizationId={organizationId}/>}
  </main>;
}

function ProviderDrawer({selected,c,language,pending,close,act,openDocument,organizationId}:{selected:QueueDetail;c:(typeof providerCopy)[keyof typeof providerCopy];language:'en'|'ru';pending:ActionKind|null;close:()=>void;act:(kind:ActionKind,fn:(key:string)=>Promise<void>)=>Promise<void>;openDocument:(path:string)=>void;organizationId:string}){
  const canBook=['queued','appointment_booked','urgent_escalated'].includes(selected.status);
  const canEscalate=['queued','appointment_booked'].includes(selected.status);
  const canConfirm=['appointment_booked','urgent_escalated'].includes(selected.status)&&selected.appointment!==null&&new Date(selected.appointment.scheduledAt).getTime()<=Date.now();
  const hasActions=canBook||canEscalate||canConfirm;
  return <div className="operations-modal" role="dialog" aria-modal="true"><OpticalCard className="operations-drawer"><button className="operations-close" onClick={close} aria-label={c.close}>×</button><OpticalEyebrow>{selected.patientName}</OpticalEyebrow><h2>{selected.priority==='urgent'?c.urgent:selected.priority==='review_recommended'?c.review:c.routine}</h2><OpticalStatus tone={statusTone(selected.status)}>{c[selected.status as keyof typeof c]??selected.status}</OpticalStatus>{selected.appointment&&<p>{c.scheduledFor}: <strong>{new Date(selected.appointment.scheduledAt).toLocaleString(language)}</strong></p>}
    {canBook&&<Action title={c.appointment}><input id="appointment-at" type="datetime-local"/><OpticalButton disabled={pending!==null} onClick={()=>{const i=document.getElementById('appointment-at') as HTMLInputElement;if(i.value)void act('booking',key=>bookAppointment(organizationId,selected.id,selected.version,i.value,key))}}>{pending==='booking'?c.saving:c.book}</OpticalButton></Action>}
    {canEscalate&&<Action title={c.escalate}><select id="escalation-reason"><option value="clinical_red_flag">{c.redFlag}</option><option value="rapid_deterioration">{c.deterioration}</option><option value="safety_concern">{c.safety}</option></select><OpticalButton disabled={pending!==null} onClick={()=>void act('escalation',key=>escalateReferral(organizationId,selected.id,selected.version,(document.getElementById('escalation-reason') as HTMLSelectElement).value,key))}>{pending==='escalation'?c.saving:c.confirmEscalation}</OpticalButton></Action>}
    {canConfirm&&<Action title={c.outcome}><select id="outcome-code"><option value="exam_completed">{c.exam}</option><option value="treatment_started">{c.treatment}</option><option value="no_action_required">{c.none}</option><option value="referred_onward">{c.onward}</option></select><OpticalButton disabled={pending!==null} onClick={()=>void act('outcome',key=>confirmOutcome(organizationId,selected.id,selected.version,(document.getElementById('outcome-code') as HTMLSelectElement).value,key))}>{pending==='outcome'?c.saving:c.confirmOutcome}</OpticalButton></Action>}
    {!hasActions&&<p role="status">{c.careLoopClosed}</p>}
    <Action title={c.documents}>{selected.documents.length===0?<p>{c.noDocuments}</p>:selected.documents.map(d=><button className="provider-document" key={d.id} onClick={()=>openDocument(d.storagePath)}>{d.title}</button>)}</Action>
  </OpticalCard></div>;
}

function Action({title,children}:{title:string;children:ReactNode}){return <section className="provider-action"><h3>{title}</h3>{children}</section>}
