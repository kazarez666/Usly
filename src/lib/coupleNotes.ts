import { supabase } from './supabase'
import { sendPartnerPush } from './push'

export type CoupleNote = { id:string; coupleId:string; createdBy:string; body:string; createdAt:string }

type Row = { id:string; couple_id:string; created_by:string; body:string; created_at:string }
const map=(r:Row):CoupleNote=>({id:r.id,coupleId:r.couple_id,createdBy:r.created_by,body:r.body,createdAt:r.created_at})

export async function getCoupleNotes(coupleId:string){
  if(!supabase) return {ok:false,notes:[] as CoupleNote[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_my_couple_notes',{target_couple_id:coupleId})
  if(error) return {ok:false,notes:[] as CoupleNote[],error:error.message}
  const rows=Array.isArray(data)?data:(data?[data]:[])
  return {ok:true,notes:(rows as Row[]).map(map)}
}
export async function createCoupleNote(coupleId:string,body:string){
  if(!supabase) return {ok:false,note:null as CoupleNote|null,error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('create_couple_note',{target_couple_id:coupleId,note_body:body.trim().slice(0,500)})
  if(error) return {ok:false,note:null,error:error.message}
  const note=data?map(data as Row):null
  if(note) void sendPartnerPush(coupleId,{type:'note',title:'Новая записка для вас двоих',body:note.body,entityId:note.id})
  return {ok:true,note}
}
export async function deleteCoupleNote(id:string){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('delete_couple_note',{target_note_id:id})
  return error?{ok:false,error:error.message}:{ok:true}
}
