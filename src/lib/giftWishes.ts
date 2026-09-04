import { supabase } from './supabase'
export type GiftWish={id:string;coupleId:string;createdBy:string;title:string;url:string|null;note:string|null;done:boolean;createdAt:string}
type Row={id:string;couple_id:string;created_by:string;title:string;url:string|null;note:string|null;done:boolean;created_at:string}
type GiftWishesResult={ok:boolean;wishes:GiftWish[];error?:string}
const giftWishesInFlight=new Map<string,Promise<GiftWishesResult>>()
const map=(r:Row):GiftWish=>({id:r.id,coupleId:r.couple_id,createdBy:r.created_by,title:r.title,url:r.url,note:r.note,done:r.done,createdAt:r.created_at})
async function fetchGiftWishes(coupleId:string):Promise<GiftWishesResult>{
 if(!supabase)return{ok:false,wishes:[],error:'SUPABASE_MISSING'}
 const {data,error}=await supabase.rpc('get_my_gift_wishes',{target_couple_id:coupleId})
 if(error)return{ok:false,wishes:[],error:error.message}
 const rows=Array.isArray(data)?data:(data?[data]:[])
 return{ok:true,wishes:(rows as Row[]).map(map)}
}
export function getGiftWishes(coupleId:string):Promise<GiftWishesResult>{
 const current=giftWishesInFlight.get(coupleId)
 if(current)return current
 let request:Promise<GiftWishesResult>
 request=fetchGiftWishes(coupleId).finally(()=>{if(giftWishesInFlight.get(coupleId)===request)giftWishesInFlight.delete(coupleId)})
 giftWishesInFlight.set(coupleId,request)
 return request
}
export async function createGiftWish(coupleId:string,title:string,url:string,note:string){
 if(!supabase)return{ok:false,error:'SUPABASE_MISSING'}
 const {error}=await supabase.rpc('create_gift_wish',{target_couple_id:coupleId,wish_title:title,wish_url:url||null,wish_note:note||null})
 return error?{ok:false,error:error.message}:{ok:true}
}
export async function toggleGiftWish(id:string){
 if(!supabase)return{ok:false,error:'SUPABASE_MISSING'}
 const {error}=await supabase.rpc('toggle_gift_wish',{target_wish_id:id})
 return error?{ok:false,error:error.message}:{ok:true}
}
export async function deleteGiftWish(id:string){
 if(!supabase)return{ok:false,error:'SUPABASE_MISSING'}
 const {error}=await supabase.rpc('delete_gift_wish',{target_wish_id:id})
 return error?{ok:false,error:error.message}:{ok:true}
}
