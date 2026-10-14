import { NextResponse } from "next/server";
import { z } from "zod";
import { db, questionSeconds, totalSeconds } from "@/lib/supabase";
export const runtime="nodejs";
const schema=z.object({submissionId:z.string().uuid(),answers:z.array(z.object({questionId:z.string().uuid(),questionNumber:z.number().int().min(1).max(10),selectedIndex:z.number().int().min(0).max(20).nullable(),elapsedSeconds:z.number().int().min(0).max(3600)})).length(10),clientElapsedSeconds:z.number().int().min(0).max(86400),expired:z.boolean().optional()});
export async function POST(req:Request){
 try{
  const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Invalid submission format."},{status:400});
  const {submissionId,answers}=p.data;const supabase=db();
  const {data:s,error:se}=await supabase.from("quiz_submissions").select("id,question_order,started_at,status").eq("id",submissionId).single();
  if(se||!s)return NextResponse.json({error:"Submission not found."},{status:404});
  if(s.status!=="in_progress")return NextResponse.json({error:"This quiz has already been submitted."},{status:409});
  const now=Date.now();const started=Date.parse(s.started_at);const serverElapsed=Math.max(0,Math.floor((now-started)/1000));
  if(serverElapsed>totalSeconds()+15)return NextResponse.json({error:"The quiz time has expired. Please contact the organizer."},{status:409});
  const expected=(s.question_order as string[]);if(answers.some(a=>expected[a.questionNumber-1]!==a.questionId)||new Set(answers.map(a=>a.questionId)).size!==10)return NextResponse.json({error:"Question order mismatch."},{status:400});
  const ids=answers.map(a=>a.questionId);
  const {data:questions,error:qe}=await supabase.from("quiz_questions").select("id,answer_index").in("id",ids);if(qe||!questions)return NextResponse.json({error:"Could not grade submission."},{status:500});
  const key=new Map(questions.map(q=>[q.id,q.answer_index]));
  const rows=answers.map(a=>({submission_id:submissionId,question_id:a.questionId,question_number:a.questionNumber,selected_index:a.selectedIndex,elapsed_seconds:Math.min(questionSeconds(),a.elapsedSeconds),is_correct:a.selectedIndex!==null&&key.get(a.questionId)===a.selectedIndex}));
  const score=rows.filter(a=>a.is_correct).length;
  const {error:ae}=await supabase.from("quiz_answers").insert(rows);if(ae)throw ae;
  const {error:ue}=await supabase.from("quiz_submissions").update({submitted_at:new Date().toISOString(),total_seconds:Math.min(totalSeconds(),serverElapsed),score,status:p.data.expired?"expired":"submitted"}).eq("id",submissionId).eq("status","in_progress");
  if(ue)throw ue;
  return NextResponse.json({ok:true,message:"Submission recorded. Results are not displayed."},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("quiz submit failed",e);return NextResponse.json({error:"Unable to submit. Contact the organizer."},{status:500})}
}