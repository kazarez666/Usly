import { supabase } from './supabase'

export type SecretCategory = { id:string; coupleId:string; name:string; icon:string; sortOrder:number; isDefault:boolean; createdBy:string|null }
export type SecretOption = { id:string; coupleId:string; categoryId:string; title:string; createdBy:string; createdAt:string }
export type SecretSentDesire = { id:string; coupleId:string; optionId:string; optionTitle:string; categoryName:string; fromUser:string; toUser:string; note:string; status:'pending'|'accepted'|'declined'|'completed'; createdAt:string }
export type SecretPhoto = { id:string; coupleId:string; uploadedBy:string; path:string; caption:string; createdAt:string; url:string|null }
export type SecretChatMessage = { id:string; coupleId:string; senderId:string; body:string; createdAt:string }

const rows = <T,>(data:unknown):T[] => Array.isArray(data) ? data as T[] : data && typeof data==='object' ? [data as T] : []

const mapCategory = (r:any):SecretCategory => ({ id:r.id, coupleId:r.couple_id, name:r.name, icon:r.icon??'✦', sortOrder:Number(r.sort_order??0), isDefault:Boolean(r.is_default), createdBy:r.created_by??null })
const mapOption = (r:any):SecretOption => ({ id:r.id, coupleId:r.couple_id, categoryId:r.category_id, title:r.title, createdBy:r.created_by, createdAt:r.created_at })
const mapDesire = (r:any):SecretSentDesire => ({ id:r.id, coupleId:r.couple_id, optionId:r.option_id, optionTitle:r.option_title, categoryName:r.category_name, fromUser:r.from_user, toUser:r.to_user, note:r.note??'', status:r.status, createdAt:r.created_at })

export async function getSecretCategories(coupleId:string){
  if(!supabase) return {ok:false,categories:[] as SecretCategory[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_secret_categories',{target_couple_id:coupleId})
  if(error) return {ok:false,categories:[] as SecretCategory[],error:error.message}
  return {ok:true,categories:rows<any>(data).map(mapCategory)}
}
export async function createSecretCategory(coupleId:string,name:string,icon='✦'){
  if(!supabase) return {ok:false,category:null as SecretCategory|null,error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('create_secret_category',{target_couple_id:coupleId,category_name:name.trim().slice(0,40),category_icon:icon.slice(0,4)})
  if(error) return {ok:false,category:null,error:error.message}
  return {ok:true,category:mapCategory(data)}
}
export async function updateSecretCategory(id:string,name:string,icon='✦'){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('update_secret_category',{target_category_id:id,category_name:name.trim().slice(0,40),category_icon:icon.slice(0,4)})
  return error?{ok:false,error:error.message}:{ok:true}
}
export async function deleteSecretCategory(id:string){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('delete_secret_category',{target_category_id:id})
  return error?{ok:false,error:error.message}:{ok:true}
}
export async function getSecretOptions(coupleId:string,categoryId?:string){
  if(!supabase) return {ok:false,options:[] as SecretOption[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_secret_options',{target_couple_id:coupleId,target_category_id:categoryId??null})
  if(error) return {ok:false,options:[] as SecretOption[],error:error.message}
  return {ok:true,options:rows<any>(data).map(mapOption)}
}
export async function createSecretOption(coupleId:string,categoryId:string,title:string){
  if(!supabase) return {ok:false,option:null as SecretOption|null,error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('create_secret_option',{target_couple_id:coupleId,target_category_id:categoryId,option_title:title.trim().slice(0,100)})
  if(error) return {ok:false,option:null,error:error.message}
  return {ok:true,option:mapOption(data)}
}
export async function deleteSecretOption(id:string){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('delete_secret_option',{target_option_id:id})
  return error?{ok:false,error:error.message}:{ok:true}
}
export async function sendSecretDesire(coupleId:string,optionId:string,note=''){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('send_secret_desire',{target_couple_id:coupleId,target_option_id:optionId,desire_note:note.trim().slice(0,300)})
  return error?{ok:false,error:error.message}:{ok:true}
}
export async function getSecretDesiresInbox(coupleId:string){
  if(!supabase) return {ok:false,desires:[] as SecretSentDesire[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_secret_desires',{target_couple_id:coupleId})
  if(error) return {ok:false,desires:[] as SecretSentDesire[],error:error.message}
  return {ok:true,desires:rows<any>(data).map(mapDesire)}
}
export async function deleteSecretDesire(desireId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'SUPABASE_MISSING' }
  const { error } = await supabase.rpc('delete_secret_desire', { target_desire_id: desireId })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function updateSecretDesireStatus(id:string,status:'accepted'|'declined'|'completed'){ 
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('update_secret_desire_status',{target_desire_id:id,new_status:status})
  return error?{ok:false,error:error.message}:{ok:true}
}

export async function getSecretPhotos(coupleId:string){
  if(!supabase) return {ok:false,photos:[] as SecretPhoto[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_secret_photos',{target_couple_id:coupleId})
  if(error) return {ok:false,photos:[] as SecretPhoto[],error:error.message}
  const photos:SecretPhoto[]=[]
  for(const r of rows<any>(data)){ let url:null|string=null; if(r.path){ const signed=await supabase.storage.from('secret-media').createSignedUrl(r.path,3600); url=signed.data?.signedUrl??null } photos.push({id:r.id,coupleId:r.couple_id,uploadedBy:r.uploaded_by,path:r.path,caption:r.caption??'',createdAt:r.created_at,url}) }
  return {ok:true,photos}
}
export async function uploadSecretPhoto(coupleId:string,file:File,caption=''){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  if(!file.type.startsWith('image/')) return {ok:false,error:'IMAGE_ONLY'}
  if(file.size>15*1024*1024) return {ok:false,error:'PHOTO_TOO_LARGE'}
  const {data:user,error:userError}=await supabase.auth.getUser(); if(userError||!user.user) return {ok:false,error:'NOT_AUTHENTICATED'}
  const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').slice(0,6)||'jpg'
  const path=`${coupleId}/${user.user.id}/${crypto.randomUUID()}.${ext}`
  const up=await supabase.storage.from('secret-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false})
  if(up.error) return {ok:false,error:up.error.message}
  const {error}=await supabase.rpc('create_secret_photo',{target_couple_id:coupleId,photo_path:path,photo_caption:caption.trim().slice(0,160)})
  if(error){await supabase.storage.from('secret-media').remove([path]);return {ok:false,error:error.message}}
  return {ok:true}
}
export async function deleteSecretPhoto(id:string,path:string){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('delete_secret_photo',{target_photo_id:id})
  if(error) return {ok:false,error:error.message}
  await supabase.storage.from('secret-media').remove([path]); return {ok:true}
}

export async function getSecretChat(coupleId:string){
  if(!supabase) return {ok:false,messages:[] as SecretChatMessage[],error:'SUPABASE_MISSING'}
  const {data,error}=await supabase.rpc('get_secret_chat',{target_couple_id:coupleId})
  if(error) return {ok:false,messages:[] as SecretChatMessage[],error:error.message}
  return {ok:true,messages:rows<any>(data).map(r=>({id:r.id,coupleId:r.couple_id,senderId:r.sender_id,body:r.body,createdAt:r.created_at}))}
}
export async function sendSecretChat(coupleId:string,body:string){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('send_secret_chat',{target_couple_id:coupleId,message_body:body.trim().slice(0,2000)})
  return error?{ok:false,error:error.message}:{ok:true}
}
export async function deleteSecretChatMessage(id:string){
  if(!supabase) return {ok:false,error:'SUPABASE_MISSING'}
  const {error}=await supabase.rpc('delete_secret_chat_message',{target_message_id:id})
  return error?{ok:false,error:error.message}:{ok:true}
}
