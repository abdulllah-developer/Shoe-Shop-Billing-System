/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   utils.js — Default product data, formatting helpers,
   Supabase configuration and REST helpers, the write-ahead
   queue (offline-safe writes), local storage load/cache
   helpers, and the toast notification helper.
   Load this file FIRST — every other script depends on the
   globals (PRODUCTS, SALES, RETURNS, EXPENSES, cart, etc.)
   and helper functions defined here.
   ══════════════════════════════════════════════════════════ */

// ── DATA ──
const DEFAULT_PRODUCTS=[
  {id:1,name:"Air Runner Pro",brand:"NikeX",price:8500,cost:4200,stock:14,emoji:"👟",cat:"Running",sizes:[{size:"39",stock:2},{size:"40",stock:3},{size:"41",stock:4},{size:"42",stock:3},{size:"43",stock:2}]},
  {id:2,name:"Classic Oxford",brand:"BrogueHouse",price:12500,cost:6000,stock:6,emoji:"👞",cat:"Formal",sizes:[{size:"40",stock:2},{size:"41",stock:2},{size:"42",stock:1},{size:"43",stock:1}]},
  {id:3,name:"Canvas Low-Top",brand:"UrbanStep",price:4200,cost:2000,stock:22,emoji:"👟",cat:"Casual",sizes:[{size:"39",stock:4},{size:"40",stock:4},{size:"41",stock:5},{size:"42",stock:5},{size:"43",stock:4}]},
  {id:4,name:"Mountain Trek",brand:"TrailKing",price:9800,cost:4800,stock:9,emoji:"🥾",cat:"Outdoor",sizes:[{size:"40",stock:2},{size:"41",stock:3},{size:"42",stock:2},{size:"43",stock:2}]},
  {id:5,name:"Velvet Heel",brand:"LuxeWalk",price:14500,cost:7200,stock:4,emoji:"👠",cat:"Formal",sizes:[{size:"36",stock:1},{size:"37",stock:1},{size:"38",stock:1},{size:"39",stock:1}]},
  {id:6,name:"Sport Slide",brand:"QuickStep",price:2600,cost:1200,stock:30,emoji:"🩴",cat:"Casual",sizes:[{size:"39",stock:6},{size:"40",stock:6},{size:"41",stock:6},{size:"42",stock:6},{size:"43",stock:6}]},
  {id:7,name:"Derby Classic",brand:"BrogueHouse",price:10500,cost:5200,stock:8,emoji:"👞",cat:"Formal",sizes:[{size:"40",stock:2},{size:"41",stock:2},{size:"42",stock:2},{size:"43",stock:2}]},
  {id:8,name:"Urban Sneaker",brand:"UrbanStep",price:5900,cost:2800,stock:17,emoji:"👟",cat:"Casual",sizes:[{size:"39",stock:3},{size:"40",stock:4},{size:"41",stock:4},{size:"42",stock:3},{size:"43",stock:3}]},
  {id:9,name:"Trail Blazer",brand:"TrailKing",price:8800,cost:4300,stock:5,emoji:"🥾",cat:"Outdoor",sizes:[{size:"41",stock:2},{size:"42",stock:2},{size:"43",stock:1}]},
  {id:10,name:"Ballet Flat",brand:"LuxeWalk",price:6500,cost:3200,stock:11,emoji:"🩰",cat:"Formal",sizes:[{size:"36",stock:3},{size:"37",stock:3},{size:"38",stock:3},{size:"39",stock:2}]},
  {id:11,name:"Slip-On Loafer",brand:"UrbanStep",price:4900,cost:2300,stock:19,emoji:"👞",cat:"Casual",sizes:[{size:"39",stock:4},{size:"40",stock:4},{size:"41",stock:4},{size:"42",stock:4},{size:"43",stock:3}]},
  {id:12,name:"Speed Trainer",brand:"NikeX",price:7200,cost:3500,stock:0,emoji:"👟",cat:"Running",sizes:[{size:"40",stock:0},{size:"41",stock:0},{size:"42",stock:0}]},
];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const rs=v=>`₨ ${Math.round(v).toLocaleString('en-PK')}`;

let PRODUCTS=[],SALES=[],RETURNS=[],EXPENSES=[];
let cart=[],discountAmt=0,payMethod="cash",billCount=1000,activeFilter="All";
let editingId=null,selectedEmoji="👟";
let returnType='customer',returnHistoryFilter='all';
let crItems=[],dfItems=[];
let cartOpen=false;

// ── SUPABASE CONFIG ──
const SUPA_URL=['https://ifojvhicm','oezgijvldrk','.supabase.co'].join('');
const _k=['sb_publishable_','xX4HD6LW6KdFjvys','_POhEw_iTSyL0E4'];
const SUPA_KEY=_k.join('');
// Real Supabase Auth client — used for sign in/out. RLS policies check
// auth.uid(), so requests must be authenticated for products/sales/returns/
// expenses to be visible.
const sbClient=window.supabase.createClient(SUPA_URL,SUPA_KEY);

// SB_HDR is used for raw REST fetches (sbGet/sbInsertOne/etc below).
// Authorization must be the LOGGED-IN USER'S access token (not just the
// anon key) so that auth.uid() resolves correctly against RLS policies.
function currentAuthHeaders(){
  const token=sbSessionToken||SUPA_KEY; // fall back to anon key if not logged in yet
  return{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+token};
}
let sbSessionToken=null; // set on login, cleared on logout — see auth.js

// ── Supabase helpers ──
// products table: columns are id, data (jsonb), sizes (jsonb), created_at
// all other tables: columns are id, data (jsonb), created_at

// ── WRITE-AHEAD QUEUE ──
// Every write goes to localStorage instantly. If Supabase fails, it is queued
// and retried automatically every 3 seconds — so no data is ever lost.
let waq=[];          // in-memory queue
let waqRetrying=false;
const WAQ_KEY='sc_waq';

function waqLoad(){try{const s=localStorage.getItem(WAQ_KEY);waq=s?JSON.parse(s):[];}catch(e){waq=[];}}
function waqSave(){try{localStorage.setItem(WAQ_KEY,JSON.stringify(waq));}catch(e){}}
function waqPush(op){waq.push({...op,qid:Date.now()+Math.random()});waqSave();waqFlush();}

async function waqFlush(){
  if(waqRetrying||!waq.length)return;
  waqRetrying=true;
  while(waq.length){
    const op=waq[0];
    try{
      if(op.type==='insert'){
        const body=op.table==='products'?(()=>{const{sizes,...rest}=op.item;return{data:rest,sizes:sizes||[]};})()
          :{data:op.item};
        const r=await fetch(SUPA_URL+'/rest/v1/'+op.table,{method:'POST',headers:{...currentAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)});
        if(!r.ok)throw new Error('HTTP '+r.status);
        const res=await r.json();
        const row=Array.isArray(res)?res[0]:res;
        // Patch _sid back into the live in-memory array
        if(row&&row.id){
          const arr={products:PRODUCTS,sales:SALES,returns:RETURNS,expenses:EXPENSES}[op.table];
          if(arr){const m=arr.find(x=>x.id===op.item.id||x.billNo===op.item.billNo||x.eid===op.item.eid||x.rid===op.item.rid);if(m)m._sid=row.id;}
        }
      }else if(op.type==='update'){
        const body=op.table==='products'?(()=>{const{sizes,...rest}=op.item;return{data:rest,sizes:sizes||[]};})()
          :{data:op.item};
        const r=await fetch(SUPA_URL+'/rest/v1/'+op.table+'?id=eq.'+op.sid,{method:'PATCH',headers:{...currentAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(body)});
        if(!r.ok)throw new Error('HTTP '+r.status);
      }else if(op.type==='delete'){
        const r=await fetch(SUPA_URL+'/rest/v1/'+op.table+'?id=eq.'+op.sid,{method:'DELETE',headers:currentAuthHeaders()});
        if(!r.ok)throw new Error('HTTP '+r.status);
      }
      waq.shift();waqSave(); // success — remove from queue
    }catch(e){
      console.warn('WAQ retry pending:',op.type,op.table,e.message);
      break; // stop flushing, retry later
    }
  }
  waqRetrying=false;
}

// Auto-retry every 3 seconds for any queued operations
setInterval(()=>{if(waq.length)waqFlush();},3000);

async function sbGet(table){
  try{
    const PAGE_SIZE=1000; // pull in pages so we never hit PostgREST's default row cap
    let all=[];
    let from=0;
    while(true){
      const to=from+PAGE_SIZE-1;
      const r=await fetch(SUPA_URL+'/rest/v1/'+table+'?select=*&order=id.asc',{
        headers:{...currentAuthHeaders(),'Range':from+'-'+to,'Range-Unit':'items'}
      });
      const rows=await r.json();
      if(!Array.isArray(rows))break;
      all=all.concat(rows);
      // If we got fewer rows than a full page, we've reached the end
      if(rows.length<PAGE_SIZE)break;
      from+=PAGE_SIZE;
    }
    return all.map(row=>{
      const item={...row.data,_sid:row.id};
      if(table==='products'&&row.sizes){item.sizes=row.sizes;}
      return item;
    });
  }catch(e){console.error('sbGet',table,e);return null;}
}

// Insert — saves to localStorage immediately, queues Supabase write
async function sbInsertOne(table,item){
  if(!dbOnline){waqPush({type:'insert',table,item});return null;}
  try{
    const body=table==='products'?(()=>{const{sizes,...rest}=item;return{data:rest,sizes:sizes||[]};})()
      :{data:item};
    const r=await fetch(SUPA_URL+'/rest/v1/'+table,{method:'POST',headers:{...currentAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const res=await r.json();
    const row=Array.isArray(res)?res[0]:res;
    return{...item,_sid:row.id};
  }catch(e){
    console.warn('sbInsertOne failed, queuing:',table,e.message);
    waqPush({type:'insert',table,item});
    return null;
  }
}

// Update — queues Supabase write, localStorage already updated by caller
async function sbUpdateOne(table,sid,item){
  if(!dbOnline){waqPush({type:'update',table,sid,item});return;}
  try{
    const body=table==='products'?(()=>{const{sizes,...rest}=item;return{data:rest,sizes:sizes||[]};})()
      :{data:item};
    const r=await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+sid,{method:'PATCH',headers:{...currentAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('HTTP '+r.status);
  }catch(e){
    console.warn('sbUpdateOne failed, queuing:',table,e.message);
    waqPush({type:'update',table,sid,item});
  }
}

// Delete — queues Supabase write
async function sbDeleteOne(table,sid){
  if(!dbOnline){waqPush({type:'delete',table,sid});return;}
  try{
    const r=await fetch(SUPA_URL+'/rest/v1/'+table+'?id=eq.'+sid,{method:'DELETE',headers:currentAuthHeaders()});
    if(!r.ok)throw new Error('HTTP '+r.status);
  }catch(e){
    console.warn('sbDeleteOne failed, queuing:',table,e.message);
    waqPush({type:'delete',table,sid});
  }
}

// ── STORAGE (Supabase + localStorage fallback) ──
let dbOnline=true;

async function load(){
  showSyncStatus('loading');
  try{
    const [sp,ss,sr,se]=await Promise.all([sbGet('products'),sbGet('sales'),sbGet('returns'),sbGet('expenses')]);
    if(sp===null){throw new Error('offline');}
    PRODUCTS=sp.length?sp:JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    SALES=ss||[];RETURNS=sr||[];EXPENSES=se||[];
    // Sync bill count from sales
    if(SALES.length){billCount=Math.max(...SALES.map(s=>s.billNo||0),1000);}
    const bc=localStorage.getItem('sc_billcount');if(bc&&parseInt(bc)>billCount)billCount=parseInt(bc);
    dbOnline=true;
    // Cache locally too
    localStorage.setItem('sc_products',JSON.stringify(PRODUCTS));
    localStorage.setItem('sc_sales',JSON.stringify(SALES));
    localStorage.setItem('sc_returns',JSON.stringify(RETURNS));
    localStorage.setItem('sc_expenses',JSON.stringify(EXPENSES));
    showSyncStatus('online');
  }catch(e){
    console.warn('Supabase offline, using localStorage',e);
    dbOnline=false;
    const sp=localStorage.getItem('sc_products');PRODUCTS=sp?JSON.parse(sp):JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    const ss=localStorage.getItem('sc_sales');SALES=ss?JSON.parse(ss):[];
    const sr=localStorage.getItem('sc_returns');RETURNS=sr?JSON.parse(sr):[];
    const se=localStorage.getItem('sc_expenses');EXPENSES=se?JSON.parse(se):[];
    const bc=localStorage.getItem('sc_billcount');if(bc)billCount=parseInt(bc);
    showSyncStatus('offline');
  }
}

function showSyncStatus(state){
  let el=document.getElementById('syncStatus');
  if(!el){
    el=document.createElement('div');
    el.id='syncStatus';
    el.style.cssText='position:fixed;bottom:10px;left:10px;z-index:999;font-family:DM Mono,monospace;font-size:10px;padding:4px 10px;border-radius:20px;transition:all 0.3s;pointer-events:none;';
    document.body.appendChild(el);
  }
  if(state==='loading'){el.style.background='rgba(26,22,18,0.8)';el.style.color='#C9973A';el.textContent='⏳ Syncing...';}
  else if(state==='online'){el.style.background='rgba(46,125,82,0.15)';el.style.color='#2E7D52';el.textContent='☁ Synced';setTimeout(()=>el.style.opacity='0',3000);el.style.opacity='1';}
  else if(state==='offline'){el.style.background='rgba(168,66,50,0.15)';el.style.color='#A84232';el.textContent='⚠ Offline — saving locally';el.style.opacity='1';}
  else if(state==='saving'){el.style.opacity='1';el.style.background='rgba(26,22,18,0.8)';el.style.color='#C9973A';el.textContent='💾 Saving...';}
}

// localStorage cache helpers — called after every in-memory change
function cacheProducts(){localStorage.setItem('sc_products',JSON.stringify(PRODUCTS));}
function cacheSales(){localStorage.setItem('sc_sales',JSON.stringify(SALES));}
function cacheReturns(){localStorage.setItem('sc_returns',JSON.stringify(RETURNS));}
function cacheExpenses(){localStorage.setItem('sc_expenses',JSON.stringify(EXPENSES));}
// Legacy aliases kept so any stray call doesn't crash
function saveProducts(){cacheProducts();}
function saveSales(){cacheSales();}
function saveReturns(){cacheReturns();}
function saveExpenses(){cacheExpenses();}
function saveBillCount(){localStorage.setItem('sc_billcount',billCount);}
function nextId(){return PRODUCTS.length?Math.max(...PRODUCTS.map(p=>p.id))+1:1;}
function nextRetId(){return RETURNS.length?Math.max(...RETURNS.map(r=>r.rid||0))+1:1;}


// ── TOAST ──
let toastTimer=null;
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500);
}

