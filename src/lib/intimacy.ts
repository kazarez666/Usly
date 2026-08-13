import { supabase } from './supabase'

export const intimacyTypes = ['sex','oral','orgasm','toys','date','kiss','cuddle','other'] as const
export type IntimacyType = typeof intimacyTypes[number]
export type IntimacyEvent = {id:string; coupleId:string; date:string; type:IntimacyType; createdBy:string; createdAt:string}
type Row={id:string;couple_id:string;date:string;event_type:IntimacyType;created_by:string;created_at:string}
const map=(r:Row):IntimacyEvent=>({id:r.id,coupleId:r.couple_id,date:r.date,type:r.event_type,createdBy:r.created_by,createdAt:r.created_at})
export async function getIntimacyEvents(coupleId:string){
 if(!supabase)return{ok:false,events:[] as IntimacyEvent[],error:'SUPABASE_MISSING'}
 const {data,error}=await supabase.rpc('get_my_intimacy_events',{target_couple_id:coupleId})
 if(error)return{ok:false,events:[] as IntimacyEvent[],error:error.message}
 const rows=Array.isArray(data)?data:(data?[data]:[])
 return{ok:true,events:(rows as Row[]).map(map)}
}
export async function toggleIntimacyEvent(coupleId:string,date:string,type:IntimacyType){
 if(!supabase)return{ok:false,error:'SUPABASE_MISSING'}
 const {data,error}=await supabase.rpc('toggle_intimacy_event',{target_couple_id:coupleId,input_date:date,input_type:type})
 if(error)return{ok:false,error:error.message}
 return{ok:true,added:Boolean(data)}
}
