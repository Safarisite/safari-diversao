
(function(){
  const cfg = window.SAFARI_SUPABASE || {};
  let client = null;
  let schemaReadyCache = null;

  if(cfg.enabled && window.supabase?.createClient){
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }

  const mapPrize = row => ({
    id:row.id,
    enabled:row.enabled !== false,
    label:row.label || row.name || "Prêmio",
    icon:row.icon || "ticket",
    color:row.color || "#7b3fd6",
    visualCopies:Math.max(1,Number(row.visual_copies)||1),
    mode:row.mode === "interval" ? "interval" : "random",
    weight:Math.max(0,Number(row.chance_percent)||0),
    intervals:Array.isArray(row.intervals)?row.intervals:[],
    blockFirst:Math.max(0,Number(row.block_first)||0),
    minGap:Math.max(0,Number(row.min_gap)||0),
    allowOnRetry:Boolean(row.allow_on_retry),
    retry:Boolean(row.is_retry),
    emoji:row.emoji || "★",
    kicker:row.kicker || "PARABÉNS!",
    title:row.result_title || row.name || "Você ganhou!",
    message:row.result_message || "",
    prizeText:row.result_prize_text || row.name || "PRÊMIO",
    pool:Number(row.coupon_count)>0 ? row.id : null,
    couponCount:Math.max(0,Number(row.coupon_count)||0),
    futurePurchase:Boolean(row.future_purchase)
  });

  const prizeRow = (p,index) => ({
    id:p.id,
    name:String(p.title || p.label || "Prêmio").replaceAll("\n"," "),
    label:p.label || p.title || "Prêmio",
    icon:p.icon || "ticket",
    color:p.color || "#7b3fd6",
    enabled:p.enabled !== false,
    visual_copies:Math.max(1,Number(p.visualCopies)||1),
    mode:p.mode === "interval" ? "interval" : "random",
    chance_percent:Math.max(0,Number(p.weight)||0),
    intervals:Array.isArray(p.intervals)?p.intervals.map(Number).filter(n=>n>0):[],
    block_first:Math.max(0,Number(p.blockFirst)||0),
    min_gap:Math.max(0,Number(p.minGap)||0),
    allow_on_retry:Boolean(p.allowOnRetry),
    is_retry:Boolean(p.retry),
    emoji:p.emoji || "★",
    kicker:p.kicker || "PARABÉNS!",
    result_title:p.title || "Você ganhou!",
    result_message:p.message || "",
    result_prize_text:p.prizeText || p.title || "PRÊMIO",
    coupon_count:Math.max(0,Number(p.couponCount)||0),
    future_purchase:Boolean(p.futurePurchase),
    sort_order:index
  });

  async function schemaReady(force=false){
    if(!client) return false;
    if(schemaReadyCache !== null && !force) return schemaReadyCache;
    try{
      const {error}=await client.from("roleta_settings").select("id").limit(1);
      schemaReadyCache=!error;
      return schemaReadyCache;
    }catch{
      schemaReadyCache=false;
      return false;
    }
  }

  async function getUser(){
    if(!client) return null;
    const {data}=await client.auth.getUser();
    return data?.user || null;
  }

  async function isAdmin(){
    if(!client || !(await schemaReady())) return false;
    const user=await getUser();
    if(!user?.email) return false;
    const {data,error}=await client.from("roleta_admins").select("email").eq("email",user.email.toLowerCase()).maybeSingle();
    return !error && Boolean(data);
  }

  async function sendMagicLink(email){
    if(!client) throw new Error("Banco online indisponível.");
    const {error}=await client.auth.signInWithOtp({
      email,
      options:{emailRedirectTo:`${location.origin}${location.pathname}`}
    });
    if(error) throw error;
  }

  async function signOut(){if(client) await client.auth.signOut();}

  async function loadConfig(){
    if(!client || !(await schemaReady())) return null;
    const [{data:settings,error:e1},{data:prizes,error:e2}]=await Promise.all([
      client.from("roleta_settings").select("*").eq("id",cfg.campaignId || "main").maybeSingle(),
      client.from("roleta_prizes").select("*").order("sort_order",{ascending:true})
    ]);
    if(e1 || e2) return null;
    return {
      version:8,
      screen:settings?.screen || {},
      prizes:(prizes || []).map(mapPrize)
    };
  }

  async function saveConfig(config){
    if(!client || !(await schemaReady())) throw new Error("Banco online ainda não está pronto.");
    if(!(await isAdmin())) throw new Error("Seu e-mail ainda não está liberado como administrador.");

    const {error:settingsError}=await client.from("roleta_settings").upsert({
      id:cfg.campaignId || "main",
      screen:config.screen || {},
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(settingsError) throw settingsError;

    const rows=(config.prizes || []).map(prizeRow);
    if(rows.length){
      const {error}=await client.from("roleta_prizes").upsert(rows,{onConflict:"id"});
      if(error) throw error;
    }

    const {data:existing,error:existingError}=await client.from("roleta_prizes").select("id");
    if(existingError) throw existingError;
    const keep=new Set(rows.map(r=>r.id));
    for(const row of existing || []){
      if(!keep.has(row.id)){
        const {error}=await client.from("roleta_prizes").delete().eq("id",row.id);
        if(error) throw error;
      }
    }
  }

  async function importCoupons(prizeId,codes){
    if(!client || !(await schemaReady())) throw new Error("Banco online ainda não está pronto.");
    if(!(await isAdmin())) throw new Error("Seu e-mail ainda não está liberado como administrador.");
    const clean=[...new Set((codes||[]).map(x=>String(x).trim()).filter(Boolean))];
    for(let i=0;i<clean.length;i+=400){
      const rows=clean.slice(i,i+400).map(code=>({prize_id:prizeId,code,status:"available"}));
      const {error}=await client.from("roleta_coupons").upsert(rows,{onConflict:"code",ignoreDuplicates:true});
      if(error) throw error;
    }
    return clean.length;
  }

  async function couponStats(prizeIds=[]){
    if(!client || !(await schemaReady())) return {};
    const out={};
    for(const id of prizeIds){
      const [t,a,u]=await Promise.all([
        client.from("roleta_coupons").select("*",{count:"exact",head:true}).eq("prize_id",id),
        client.from("roleta_coupons").select("*",{count:"exact",head:true}).eq("prize_id",id).eq("status","available"),
        client.from("roleta_coupons").select("*",{count:"exact",head:true}).eq("prize_id",id).neq("status","available")
      ]);
      out[id]={total:t.count||0,remaining:a.count||0,used:u.count||0};
    }
    return out;
  }

  async function history(limit=200){
    if(!client || !(await schemaReady()) || !(await isAdmin())) return [];
    const {data,error}=await client.from("roleta_spin_history").select("*").order("created_at",{ascending:false}).limit(limit);
    if(error) throw error;
    return data || [];
  }

  async function spin({retry=false,deviceId}={}){
    if(!client || !(await schemaReady())) return null;
    const {data,error}=await client.functions.invoke("roleta-spin",{body:{retry:Boolean(retry),deviceId:String(deviceId||"")}});
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    return data;
  }

  window.SafariBackend={client,schemaReady,getUser,isAdmin,sendMagicLink,signOut,loadConfig,saveConfig,importCoupons,couponStats,history,spin};
})();
