import { supabase } from './supabase'

export type TruthCategory = 'concern' | 'change' | 'add' | 'appreciation' | 'important'
export type TruthStatus = 'open' | 'discussing' | 'agreed' | 'done'
export type TruthTopic = {
  id: string
  coupleId: string
  createdBy: string
  category: TruthCategory
  title: string
  body: string
  feeling: string | null
  request: string | null
  status: TruthStatus
  createdAt: string
  updatedAt: string
}
export type TruthReply = { id: string; topicId: string; coupleId: string; createdBy: string; body: string; createdAt: string }

type TopicRow = { id:string; couple_id:string; created_by:string; category:TruthCategory; title:string; body:string; feeling:string|null; request:string|null; status:TruthStatus; created_at:string; updated_at:string }
type ReplyRow = { id:string; topic_id:string; couple_id:string; created_by:string; body:string; created_at:string }
const mapTopic=(r:TopicRow):TruthTopic=>({id:r.id,coupleId:r.couple_id,createdBy:r.created_by,category:r.category,title:r.title,body:r.body,feeling:r.feeling,request:r.request,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at})
const mapReply=(r:ReplyRow):TruthReply=>({id:r.id,topicId:r.topic_id,coupleId:r.couple_id,createdBy:r.created_by,body:r.body,createdAt:r.created_at})

export async function getTruthTopics(coupleId:string){
  if(!supabase)return{ok:false,topics:[] as TruthTopic[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_my_truth_topics',{target_couple_id:coupleId})
  if(error)return{ok:false,topics:[] as TruthTopic[],error:error.message}
  const rows=Array.isArray(data)?data:(data?[data]:[])
  return{ok:true,topics:(rows as TopicRow[]).map(mapTopic)}
}
export async function getTruthReplies(coupleId:string){
  if(!supabase)return{ok:false,replies:[] as TruthReply[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_my_truth_replies',{target_couple_id:coupleId})
  if(error)return{ok:false,replies:[] as TruthReply[],error:error.message}
  const rows=Array.isArray(data)?data:(data?[data]:[])
  return{ok:true,replies:(rows as ReplyRow[]).map(mapReply)}
}
export async function createTruthTopic(coupleId:string,category:TruthCategory,title:string,body:string,feeling:string,request:string){
  if(!supabase)return{ok:false,topic:null as TruthTopic|null,error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('create_truth_topic',{target_couple_id:coupleId,input_category:category,input_title:title,input_body:body,input_feeling:feeling||null,input_request:request||null})
  if(error)return{ok:false,topic:null,error:error.message}
  return{ok:true,topic:data?mapTopic(data as TopicRow):null}
}
export async function createTruthReply(topicId:string,body:string){
  if(!supabase)return{ok:false,reply:null as TruthReply|null,error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('create_truth_reply',{target_topic_id:topicId,reply_body:body})
  if(error)return{ok:false,reply:null,error:error.message}
  return{ok:true,reply:data?mapReply(data as ReplyRow):null}
}
export async function updateTruthStatus(topicId:string,status:TruthStatus){
  if(!supabase)return{ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('update_truth_topic_status',{target_topic_id:topicId,new_status:status})
  return error?{ok:false,error:error.message}:{ok:true}
}
