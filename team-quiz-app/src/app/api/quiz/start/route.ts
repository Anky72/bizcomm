import { NextResponse } from "next/server";
import { z } from "zod";
import { db, questionSeconds, totalSeconds } from "@/lib/supabase";
export const runtime = "nodejs";
const schema=z.object({teamId:z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/),leaderName:z.string().trim().min(1).max(100),memberNames:z.array(z.string().trim().max(100)).max(3),whatsappPhone:z.string().trim().regex(/^[+0-9 ()-]{8,20}$/),memberCount:z.number().int().min(1).max(4)});
export async function POST(req:Request){
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:"Check the required team details."},{status:400});
  const d=parsed.data;if(d.memberNames.length>d.memberCount-1)return NextResponse.json({error:"Too many member names."},{status:400});
  const supabase=db();const {data:existing}=await supabase.from("quiz_submissions").select("id").eq("team_id",d.teamId).maybeSingle();
  if(existing)return NextResponse.json({error:"This Team ID has already been used. Contact the organizer if you need help."},{status:409});
  const {data:all,error:qerr}=await supabase.from("quiz_questions").select("id,prompt,options").eq("active",true);
  if(qerr)throw qerr;if(!all||all.length<10)return NextResponse.json({error:"The quiz is not ready. Please contact the organizer."},{status:503});
  const questions=[...all].sort(()=>Math.random()-.5).slice(0,10);
  const startedAt=new Date().toISOString();
  const {data:submission,error}=await supabase.from("quiz_submissions").insert({team_id:d.teamId,leader_name:d.leaderName,member_names:d.memberNames,whatsapp_phone:d.whatsappPhone,member_count:d.memberCount,question_order:questions.map(q=>q.id),started_at:startedAt,status:"in_progress"}).select("id").single();
  if(error){if(error.code==="23505")return NextResponse.json({error:"This Team ID has already been used."},{status:409});throw error;}
  // The answer_index is deliberately omitted from the response.
  return NextResponse.json({submissionId:submission.id,questions:questions.map(q=>({id:q.id,prompt:q.prompt,options:q.options})),startedAt,totalSeconds:totalSeconds(),questionSeconds:questionSeconds()},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){console.error("quiz start failed",e);return NextResponse.json({error:"Unable to start the quiz right now."},{status:500})}
}