/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   script.js — Main entry point. Real-time polling sync (keeps
   all devices' Products/Sales/Returns/Expenses in sync every
   2 seconds), Excel stock export, the weekly auto-export
   check, and the app bootstrap IIFE that starts everything.
   Load this file LAST — its bootstrap IIFE calls init() and
   other functions defined in the other script files.
   ══════════════════════════════════════════════════════════ */

// ── REAL-TIME SYNC (5 seconds — only pulls rows that changed) ──
// Checks every 5 seconds. Instead of re-downloading everything, it only
// asks Supabase for rows touched since the last check — much lighter on data usage.
let rtPollInterval=null;
let rtFullRefreshInterval=null;
let lastSyncAt=new Date().toISOString();
function startRealtimeSync(){
  if(rtPollInterval)clearInterval(rtPollInterval);
  rtPollInterval=setInterval(async()=>{
    if(!dbOnline)return;
    const checkFrom=lastSyncAt;
    const checkedAt=new Date().toISOString();
    try{
      const [chProds,chSales,chReturns,chExpenses]=await Promise.all([
        sbGetChanges('products',checkFrom),sbGetChanges('sales',checkFrom),
        sbGetChanges('returns',checkFrom),sbGetChanges('expenses',checkFrom)
      ]);
      lastSyncAt=checkedAt; // only move forward once the fetch succeeded

      const ap=document.querySelector('.page.active');
      let productsChanged=false,salesChanged=false,returnsChanged=false,expensesChanged=false;

      // Merge helper: updates existing rows in place, adds new ones. Never deletes
      // (deletes are already handled instantly by sbDeleteOne's local removal).
      function mergeChanges(list,changes,keyFn){
        if(!Array.isArray(changes)||!changes.length)return false;
        let changed=false;
        changes.forEach(fresh=>{
          const idx=list.findIndex(item=>keyFn(item)===keyFn(fresh));
          if(idx>=0){list[idx]=fresh;}else{list.push(fresh);}
          changed=true;
        });
        return changed;
      }

      // ── PRODUCTS ──
      if(mergeChanges(PRODUCTS,chProds,p=>p._sid||p.id)){
        productsChanged=true;
        cacheProducts();
        renderFilters();renderProducts();
        if(ap&&ap.id==='page-admin'){renderAdminCards();renderAdminTable();}
      }

      // ── SALES ──
      if(mergeChanges(SALES,chSales,s=>s._sid||s.billNo)){
        salesChanged=true;
        if(SALES.length){billCount=Math.max(...SALES.map(s=>s.billNo||0),billCount);}
        cacheSales();
        if(ap&&ap.id==='page-sales'){renderSalesPage();}
        if(ap&&ap.id==='page-bills'){renderBillsGrid();}
        if(ap&&ap.id==='page-records'){renderRecordPreview();}
      }

      // ── RETURNS ──
      if(mergeChanges(RETURNS,chReturns,r=>r._sid||r.rid)){
        returnsChanged=true;cacheReturns();
        if(ap&&ap.id==='page-returns'){renderReturnKpiCards();renderReturnHistory();}
      }

      // ── EXPENSES ──
      if(mergeChanges(EXPENSES,chExpenses,e=>e._sid||e.eid)){
        expensesChanged=true;cacheExpenses();
        if(ap&&ap.id==='page-expenses'){renderExpensesPage();}
      }

      // ── KPI refresh if sales or expenses changed ──
      if((salesChanged||expensesChanged)&&ap&&ap.id==='page-sales'){renderKpiCards();}

    }catch(e){}
  },5000);

  // Safety net: every 5 minutes, do one FULL refresh (not just changes).
  // This catches deletions — a deleted row can't show up in "what changed",
  // so without this, a delete made on another device might not disappear
  // from this screen until the next full page reload.
  if(rtFullRefreshInterval)clearInterval(rtFullRefreshInterval);
  rtFullRefreshInterval=setInterval(async()=>{
    if(!dbOnline)return;
    try{
      const [fp,fs,fr,fe]=await Promise.all([sbGet('products'),sbGet('sales'),sbGet('returns'),sbGet('expenses')]);
      if(Array.isArray(fp)){PRODUCTS=fp;cacheProducts();renderFilters();renderProducts();}
      if(Array.isArray(fs)){SALES=fs;cacheSales();}
      if(Array.isArray(fr)){RETURNS=fr;cacheReturns();}
      if(Array.isArray(fe)){EXPENSES=fe;cacheExpenses();}
      const ap=document.querySelector('.page.active');
      if(ap&&ap.id==='page-sales'){renderSalesPage();renderKpiCards();}
      if(ap&&ap.id==='page-bills'){renderBillsGrid();}
      if(ap&&ap.id==='page-records'){renderRecordPreview();}
      if(ap&&ap.id==='page-returns'){renderReturnKpiCards();renderReturnHistory();}
      if(ap&&ap.id==='page-expenses'){renderExpensesPage();}
      if(ap&&ap.id==='page-admin'){renderAdminCards();renderAdminTable();}
    }catch(e){}
  },300000);
}

// ── EXPORT PRODUCTS TO EXCEL ──
function exportProductsToExcel(auto=false){
  if(!PRODUCTS.length){if(!auto)showToast('No products to export');return;}
  if(auto)showToast('📤 Auto-exporting weekly stock update…');
  else showToast('Preparing Excel file…');

  function doExport(XLSX){
    const rows=[];
    // Header row
    rows.push(['Name','Brand','Category','Price','Cost','Total Stock','Sizes (size:stock|size:stock)']);

    PRODUCTS.forEach(p=>{
      const sizesStr=p.sizes&&p.sizes.length
        ?p.sizes.map(s=>s.size+':'+s.stock).join(',')
        :'';
      rows.push([
        p.name||'',
        p.brand||'',
        p.cat||'',
        p.price||0,
        p.cost||0,
        p.stock||0,
        sizesStr
      ]);
    });

    const ws=XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols']=[
      {wch:25},{wch:15},{wch:15},{wch:10},{wch:10},{wch:12},{wch:35}
    ];

    // Style header row bold
    ['A1','B1','C1','D1','E1','F1','G1'].forEach(cell=>{
      if(ws[cell])ws[cell].s={font:{bold:true}};
    });

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Products');

    // File name with today's date
    const now=new Date();
    const dateStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    XLSX.writeFile(wb,'AT-SERVIS-SHOE-Stock-'+dateStr+'.xlsx');
    localStorage.setItem(EXPORT_KEY, Date.now().toString());
    showToast('✅ Stock exported successfully');
  }

  // Load SheetJS if not already loaded
  if(typeof XLSX!=='undefined'){
    doExport(XLSX);
  }else{
    const script=document.createElement('script');
    script.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload=()=>doExport(XLSX);
    document.head.appendChild(script);
  }
}

// ── AUTO EXPORT EVERY 7 DAYS ──
const EXPORT_KEY='sc_last_export';
const EXPORT_INTERVAL_DAYS=7;

function checkAutoExport(){
  const last=localStorage.getItem(EXPORT_KEY);
  const now=Date.now();
  const sevenDays=EXPORT_INTERVAL_DAYS*24*60*60*1000;
  // Never export on first ever open — only after 7 days have passed since last export
  if(!last){
    localStorage.setItem(EXPORT_KEY,Date.now().toString()); // set baseline, start 7 day countdown
    return;
  }
  if(now-parseInt(last)>=sevenDays){
    setTimeout(()=>{
      if(!PRODUCTS||PRODUCTS.length===0){return;}
      exportProductsToExcel(true);
    },5000);
  }
}

(async()=>{waqLoad();await init();startRealtimeSync();waqFlush();checkAutoExport();})();
