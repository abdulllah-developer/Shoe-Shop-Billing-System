/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   script.js — Main entry point. Real-time polling sync (keeps
   all devices' Products/Sales/Returns/Expenses in sync every
   2 seconds), Excel stock export, the weekly auto-export
   check, and the app bootstrap IIFE that starts everything.
   Load this file LAST — its bootstrap IIFE calls init() and
   other functions defined in the other script files.
   ══════════════════════════════════════════════════════════ */

// ── REAL-TIME SYNC (2 seconds — all tables) ──
// Polls every 2 seconds and updates UI instantly without any page refresh
let rtPollInterval=null;
function startRealtimeSync(){
  if(rtPollInterval)clearInterval(rtPollInterval);
  rtPollInterval=setInterval(async()=>{
    if(!dbOnline)return;
    try{
      const [freshProds,freshSales,freshReturns,freshExpenses]=await Promise.all([
        sbGet('products'),sbGet('sales'),sbGet('returns'),sbGet('expenses')
      ]);

      const ap=document.querySelector('.page.active');
      let productsChanged=false,salesChanged=false,returnsChanged=false,expensesChanged=false;

      // ── PRODUCTS ──
      if(Array.isArray(freshProds)){
        freshProds.forEach(fp=>{
          const lp=PRODUCTS.find(p=>p._sid===fp._sid||p.id===fp.id);
          if(lp){
            if(lp.stock!==fp.stock||JSON.stringify(lp.sizes)!==JSON.stringify(fp.sizes)||lp.price!==fp.price||lp.name!==fp.name){
              Object.assign(lp,fp);productsChanged=true;
            }
          }else{PRODUCTS.push(fp);productsChanged=true;}
        });
        const freshIds=freshProds.map(p=>p._sid);
        const before=PRODUCTS.length;
        PRODUCTS=PRODUCTS.filter(p=>!p._sid||freshIds.includes(p._sid));
        if(PRODUCTS.length!==before)productsChanged=true;
        if(productsChanged){
          cacheProducts();
          renderFilters();renderProducts();
          if(ap&&ap.id==='page-admin'){renderAdminCards();renderAdminTable();}
        }
      }

      // ── SALES ──
      if(Array.isArray(freshSales)){
        const freshKeys=freshSales.map(s=>s._sid||s.billNo);
        const localKeys=SALES.map(s=>s._sid||s.billNo);
        if(JSON.stringify(freshKeys)!==JSON.stringify(localKeys)){
          SALES=freshSales;
          if(SALES.length){billCount=Math.max(...SALES.map(s=>s.billNo||0),billCount);}
          cacheSales();salesChanged=true;
          if(ap&&ap.id==='page-sales'){renderSalesPage();}
          if(ap&&ap.id==='page-bills'){renderBillsGrid();}
          if(ap&&ap.id==='page-records'){renderRecordPreview();}
        }
      }

      // ── RETURNS ──
      if(Array.isArray(freshReturns)){
        const freshKeys=freshReturns.map(r=>r._sid||r.rid);
        const localKeys=RETURNS.map(r=>r._sid||r.rid);
        if(JSON.stringify(freshKeys)!==JSON.stringify(localKeys)){
          RETURNS=freshReturns;cacheReturns();returnsChanged=true;
          if(ap&&ap.id==='page-returns'){renderReturnKpiCards();renderReturnHistory();}
        }
      }

      // ── EXPENSES ──
      if(Array.isArray(freshExpenses)){
        const freshKeys=freshExpenses.map(e=>e._sid||e.eid);
        const localKeys=EXPENSES.map(e=>e._sid||e.eid);
        if(JSON.stringify(freshKeys)!==JSON.stringify(localKeys)){
          EXPENSES=freshExpenses;cacheExpenses();expensesChanged=true;
          if(ap&&ap.id==='page-expenses'){renderExpensesPage();}
        }
      }

      // ── KPI refresh if sales or expenses changed ──
      if((salesChanged||expensesChanged)&&ap&&ap.id==='page-sales'){renderKpiCards();}

    }catch(e){}
  },2000);
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
