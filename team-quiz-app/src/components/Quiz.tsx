 "use client";
import { useEffect, useRef, useState } from "react";
type Q = { id:string; prompt:string; options:string[] };
type Started = { submissionId:string; questions:Q[]; totalSeconds:number; questionSeconds:number; startedAt:string };
export default function Quiz() {
  const [phase,setPhase]=useState<"form"|"quiz"|"done">("form");
  const [teamId,setTeamId]=useState(""); const [leader,setLeader]=useState(""); const [members,setMembers]=useState(["",""]);
  const [phone,setPhone]=useState(""); const [count,setCount]=useState("1");
  const [quiz,setQuiz]=useState<Started|null>(null); const [answers,setAnswers]=useState<Record<string,number>>({});
  const [qStart,setQStart]=useState(Date.now()); const [qElapsed,setQElapsed]=useState<Record<string,number>>({});
  const [now,setNow]=useState(Date.now()); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const submitted=useRef(false);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(t)},[]);
  const current=quiz?.questions.find((q)=>answers[`__current`]===undefined) ;
  const [index,setIndex]=useState(0);
  const active=quiz?.questions[index];
  const elapsed=quiz?Math.max(0,Math.floor((now-new Date(quiz.startedAt).getTime())/1000)):0;
  const qLeft=quiz?Math.max(0,quiz.questionSeconds-Math.floor((now-qStart)/1000)):0;
  const totalLeft=quiz?Math.max(0,quiz.totalSeconds-elapsed):0;
  async function start(e:React.FormEvent) {
    e.preventDefault();setError("");setBusy(true);
    try {
      const res=await fetch("/api/quiz/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({teamId,leaderName:leader,memberNames:members.slice(0,Math.max(0,Number(count)-1)).filter(Boolean),whatsappPhone:phone,memberCount:Number(count)})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not start quiz.");
      setQuiz(data);setIndex(0);setQStart(Date.now());setPhase("quiz");
    } catch(err){setError(err instanceof Error?err.message:"Something went wrong.");} finally{setBusy(false)}
  }
  async function finish(expired=false) {
    if(!quiz||submitted.current)return;submitted.current=true;setBusy(true);
    const finalElapsed=Math.max(0,Math.floor((Date.now()-new Date(quiz.startedAt).getTime())/1000));
    const records=quiz.questions.map((q,i)=>({questionId:q.id,questionNumber:i+1,selectedIndex:answers[q.id]??null,elapsedSeconds:i===index?Math.min(quiz.questionSeconds,Math.floor((Date.now()-qStart)/1000)):(qElapsed[q.id]??0)}));
    try {const res=await fetch("/api/quiz/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({submissionId:quiz.submissionId,answers:records,clientElapsedSeconds:finalElapsed,expired})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Submission failed.");setPhase("done");}
    catch(err){submitted.current=false;setError(err instanceof Error?err.message:"Submission failed. Please contact the event organizer.");}
    finally{setBusy(false)}
  }
  useEffect(()=>{if(phase==="quiz"&&quiz&&totalLeft<=0&&!submitted.current)void finish(true)},[totalLeft,phase]);
  useEffect(()=>{if(phase==="quiz"&&quiz&&qLeft<=0&&!submitted.current&&active){setQElapsed(prev=>({...prev,[active.id]:quiz.questionSeconds}));if(index>=quiz.questions.length-1)void finish(false);else {setIndex(i=>i+1);setQStart(Date.now())}}},[qLeft,phase]);
  if(phase==="done")return <div className="notice"><h2>Submission received</h2><p>Your answers have been recorded. Results will not be displayed here.</p><p>You may now close this page.</p></div>;
  if(phase==="quiz"&&quiz&&active)return <section>
    <div className="topbar"><div><strong>Team:</strong> {teamId} <span className="muted">· Question {index+1} of {quiz.questions.length}</span></div><div className="timer">Total {Math.floor(totalLeft/60).toString().padStart(2,"0")}:{(totalLeft%60).toString().padStart(2,"0")} · Q {qLeft}s</div></div>
    <div className="question"><h2>{active.prompt}</h2>{active.options.map((o,i)=><label className="option" key={i}><input type="radio" name={active.id} checked={answers[active.id]===i} onChange={()=>setAnswers(a=>({...a,[active.id]:i}))}/><span>{o}</span></label>)}</div>
    {error&&<div className="notice error">{error}</div>}
    <div className="topbar"><span className="muted">Each question advances when its timer expires.</span><button disabled={busy} onClick={()=>{setQElapsed(p=>({...p,[active.id]:Math.min(quiz.questionSeconds,Math.floor((Date.now()-qStart)/1000))}));if(index===quiz.questions.length-1)void finish(false);else{setIndex(i=>i+1);setQStart(Date.now())}}}>{index===quiz.questions.length-1?"Submit quiz":"Next question"}</button></div>
  </section>;
  return <form onSubmit={start}>
    <h2>Section 1 — Team information</h2>
    <div className="grid">
      <div className="field"><label>Team ID *</label><input required value={teamId} onChange={e=>setTeamId(e.target.value.trim())} maxLength={40} placeholder="e.g. TEAM-014"/></div>
      <div className="field"><label>Team leader name *</label><input required value={leader} onChange={e=>setLeader(e.target.value)} maxLength={100}/></div>
      <div className="field"><label>Team leader WhatsApp number *</label><input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} pattern="[+0-9 ()-]{8,20}" placeholder="+91 9876543210"/></div>
      <div className="field"><label>Number of members including leader *</label><select required value={count} onChange={e=>setCount(e.target.value)}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
    </div>
    {Number(count)>1&&<><h3>Team member names (optional)</h3>{Array.from({length:Number(count)-1},(_,i)=><div className="field" key={i}><label>Member {i+1} name</label><input value={members[i]||""} onChange={e=>setMembers(m=>{const a=[...m];a[i]=e.target.value;return a})} maxLength={100}/></div>)}</>}
    <div className="notice">The quiz has 10 randomly selected questions. The total timer and each question timer start when you begin. You cannot view your score after submission.</div>
    {error&&<div className="notice error">{error}</div>}<button disabled={busy}>{busy?"Starting…":"Start timed quiz"}</button>
  </form>;
}