/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   sales.js — Sales dashboard (KPI cards, monthly revenue/profit
   chart, top products, transactions table, article breakdown),
   customer & defective returns workflow, expense tracking,
   the bills history grid (reprint/delete), and the monthly/
   yearly printable records report.
   ══════════════════════════════════════════════════════════ */

// ── SALES ──
function renderSalesPage(){renderKpiCards();renderMonthlyChart();renderTopProducts();populateYearFilter();renderSalesTable();renderArticleTable();}
function renderKpiCards(){
  const now=new Date();
  const totalRev=SALES.reduce((s,x)=>s+x.total,0);
  const totalProfit=SALES.reduce((s,x)=>s+x.profit,0);
  const totalUnits=SALES.reduce((s,x)=>s+x.items.reduce((a,i)=>a+i.qty,0),0);
  const td=SALES.filter(x=>{const d=new Date(x.date);return d.getDate()===now.getDate()&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const tm=SALES.filter(x=>{const d=new Date(x.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const ty=SALES.filter(x=>new Date(x.date).getFullYear()===now.getFullYear());
  const todayRev=td.reduce((s,x)=>s+x.total,0);
  const todayProfit=td.reduce((s,x)=>s+x.profit,0);
  const todayBills=td.length;
  // Expenses
  const todayExp=EXPENSES.filter(e=>new Date(e.date).toDateString()===now.toDateString()).reduce((s,e)=>s+e.amount,0);
  const monthExp=EXPENSES.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+e.amount,0);
  const totalExp=EXPENSES.reduce((s,e)=>s+e.amount,0);
  const trueNetProfit=totalRev-SALES.reduce((s,x)=>s+x.totalCost,0)-totalExp;
  // Optional custom date range (from the date-range picker on the Sales page)
  const fromEl=document.getElementById('kpiRangeFrom'),toEl=document.getElementById('kpiRangeTo');
  let rangeCardHtml='';
  if(fromEl&&toEl&&fromEl.value&&toEl.value){
    const from=new Date(fromEl.value+'T00:00:00'),to=new Date(toEl.value+'T23:59:59');
    const inRange=SALES.filter(x=>{const d=new Date(x.date);return d>=from&&d<=to;});
    const rangeRev=inRange.reduce((s,x)=>s+x.total,0);
    const rangeProfit=inRange.reduce((s,x)=>s+x.profit,0);
    rangeCardHtml=`
    <div class="kpi s-full">
      <div class="kpi-label">📅 ${fromEl.value} to ${toEl.value}</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:4px;">
        <div><div class="kpi-val gold">${rs(rangeRev)}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);">Revenue</div></div>
        <div><div class="kpi-val ${rangeProfit>=0?'green':'red'}">${rs(rangeProfit)}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);">Profit</div></div>
        <div><div class="kpi-val">${inRange.length}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);">Bills</div></div>
      </div>
    </div>`;
  }
  document.getElementById('salesKpiCards').innerHTML=rangeCardHtml+`
    <div class="kpi"><div class="kpi-label">📅 Today's Revenue</div><div class="kpi-val gold">${rs(todayRev)}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:4px;">${todayBills} bill${todayBills!==1?'s':''} today</div></div>
    <div class="kpi"><div class="kpi-label">📅 Today's Profit</div><div class="kpi-val ${todayProfit>=0?'green':'red'}">${rs(todayProfit)}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:4px;">${now.toLocaleDateString('en-PK',{weekday:'short',day:'numeric',month:'short'})}</div></div>
    <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-val gold">${rs(totalRev)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Profit</div><div class="kpi-val ${totalProfit>=0?'green':'red'}">${rs(totalProfit)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Bills</div><div class="kpi-val">${SALES.length}</div></div>
    <div class="kpi"><div class="kpi-label">Units Sold</div><div class="kpi-val">${totalUnits}</div></div>
    <div class="kpi"><div class="kpi-label">This Month Revenue</div><div class="kpi-val gold">${rs(tm.reduce((s,x)=>s+x.total,0))}</div></div>
    <div class="kpi"><div class="kpi-label">This Month Profit</div><div class="kpi-val ${tm.reduce((s,x)=>s+x.profit,0)>=0?'green':'red'}">${rs(tm.reduce((s,x)=>s+x.profit,0))}</div></div>
    <div class="kpi"><div class="kpi-label">This Year Revenue</div><div class="kpi-val gold">${rs(ty.reduce((s,x)=>s+x.total,0))}</div></div>
    <div class="kpi"><div class="kpi-label">This Year Profit</div><div class="kpi-val ${ty.reduce((s,x)=>s+x.profit,0)>=0?'green':'red'}">${rs(ty.reduce((s,x)=>s+x.profit,0))}</div></div>`;
}
function renderMonthlyChart(){
  const year=new Date().getFullYear();
  const data=Array.from({length:12},(_,m)=>{
    const ms=SALES.filter(x=>{const d=new Date(x.date);return d.getFullYear()===year&&d.getMonth()===m;});
    return{rev:ms.reduce((s,x)=>s+x.total,0),profit:ms.reduce((s,x)=>s+x.profit,0)};
  });
  const maxRev=Math.max(...data.map(d=>d.rev),1);
  document.getElementById('monthlyChart').innerHTML=
    `<div class="chart-label">REVENUE 🟡 & PROFIT 🟢 — ${year}</div>`+
    data.map((d,m)=>`<div class="bar-row">
      <div class="bar-month">${MONTHS[m]}</div>
      <div class="bar-tracks">
        <div class="bar-bg"><div class="bar-fg rev" style="width:${(d.rev/maxRev*100).toFixed(1)}%"></div></div>
        <div class="bar-bg"><div class="bar-fg prf" style="width:${Math.max(0,(d.profit/maxRev*100)).toFixed(1)}%"></div></div>
      </div>
      <div class="bar-nums"><span style="color:var(--amber);">${rs(d.rev)}</span><br><span style="color:var(--green);">${rs(d.profit)}</span></div>
    </div>`).join('');
}
function renderTopProducts(){
  const map={};
  SALES.forEach(s=>s.items.forEach(i=>{
    if(!map[i.id])map[i.id]={name:i.name,emoji:i.emoji,qty:0,rev:0,profit:0};
    map[i.id].qty+=i.qty;map[i.id].rev+=i.price*i.qty;map[i.id].profit+=(i.price-i.cost)*i.qty;
  }));
  const sorted=Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,8);
  const maxQty=Math.max(...sorted.map(x=>x.qty),1);
  const el=document.getElementById('topProducts');
  if(!sorted.length){el.innerHTML=`<div class="empty-state">No sales yet.</div>`;return;}
  el.innerHTML=sorted.map(p=>`<div class="bar-row">
    <div style="font-size:16px;width:24px;flex-shrink:0;">${p.emoji}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
      <div class="bar-bg" style="margin-top:3px;"><div class="bar-fg rev" style="width:${(p.qty/maxQty*100).toFixed(1)}%"></div></div>
    </div>
    <div class="bar-nums"><span style="color:var(--amber);">${p.qty} sold</span><br><span style="color:var(--green);">${rs(p.profit)}</span></div>
  </div>`).join('');
}
function populateYearFilter(){
  const years=[...new Set(SALES.map(x=>new Date(x.date).getFullYear()))].sort((a,b)=>b-a);
  const cur=new Date().getFullYear();if(!years.includes(cur))years.unshift(cur);
  document.getElementById('filterYear').innerHTML=`<option value="all">All Years</option>`+years.map(y=>`<option value="${y}">${y}</option>`).join('');
}
function renderSalesTable(){
  const yv=document.getElementById('filterYear').value,mv=document.getElementById('filterMonth').value,pv=document.getElementById('filterPayment').value;
  const sq=(document.getElementById('salesSearch')?.value||'').toLowerCase().trim();
  let f=SALES.filter(x=>{
    const d=new Date(x.date);
    if(yv!=='all'&&d.getFullYear()!==parseInt(yv))return false;
    if(mv!=='all'&&d.getMonth()!==parseInt(mv))return false;
    if(pv!=='all'&&x.payMethod!==pv)return false;
    if(sq){
      const hay=(x.customer||'')+(x.phone||'')+'SC-'+x.billNo+(x.items||[]).map(i=>i.name+i.brand).join('');
      if(!hay.toLowerCase().includes(sq))return false;
    }
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tb=document.getElementById('salesTableBody');
  if(!f.length){tb.innerHTML=`<tr><td colspan="8" class="empty-state">No transactions found.</td></tr>`;return;}
  const pPills={'cash':'pill-cash','easypaisa':'pill-ep','jazzcash':'pill-jc','bank':'pill-bank'};
  const pNames={'cash':'CASH','easypaisa':'EASYPAISA','jazzcash':'JAZZCASH','bank':'BANK'};
  tb.innerHTML=f.map(s=>{
    const d=new Date(s.date);
    return `<tr>
      <td class="td-mono" style="font-size:10px;">#SC-${s.billNo}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;">${d.toLocaleDateString('en-PK')}<br><span style="color:var(--muted);">${d.toLocaleTimeString()}</span></td>
      <td><b style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;">${s.customer}</b>${s.phone?'<br><span style="font-size:10px;color:var(--muted);">'+s.phone+'</span>':''}</td>
      <td style="font-size:12px;">${s.items.map(i=>`${i.emoji}${i.qty}×`).join(' ')}</td>
      <td class="td-mono">${rs(s.total)}</td>
      <td class="td-mono" style="color:var(--muted);">${rs(s.totalCost)}</td>
      <td class="${s.profit>=0?'p-pos':'p-neg'}">${rs(s.profit)}</td>
      <td><span class="pill ${pPills[s.payMethod]||'pill-cash'}">${pNames[s.payMethod]||s.payMethod.toUpperCase()}</span></td>
    </tr>`;
  }).join('');
}
function renderArticleTable(){
  const map={};
  SALES.forEach(s=>s.items.forEach(i=>{
    if(!map[i.id])map[i.id]={name:i.name,emoji:i.emoji,brand:i.brand,qty:0,rev:0,cost:0};
    map[i.id].qty+=i.qty;map[i.id].rev+=i.price*i.qty;map[i.id].cost+=i.cost*i.qty;
  }));
  const rows=Object.values(map).sort((a,b)=>b.rev-a.rev);
  const tb=document.getElementById('articleTableBody');
  if(!rows.length){tb.innerHTML=`<tr><td colspan="8" class="empty-state">No sales recorded.</td></tr>`;return;}
  tb.innerHTML=rows.map(r=>{
    const profit=r.rev-r.cost;
    const margin=r.rev>0?((profit/r.rev)*100).toFixed(1):0;
    return `<tr>
      <td class="td-em">${r.emoji}</td>
      <td class="td-name">${r.name}</td>
      <td>${r.brand}</td>
      <td class="td-mono">${r.qty}</td>
      <td class="td-mono">${rs(r.rev)}</td>
      <td class="td-mono" style="color:var(--muted);">${rs(r.cost)}</td>
      <td class="${profit>=0?'p-pos':'p-neg'}">${rs(profit)}</td>
      <td><span class="badge ${profit>=0?'green':'red'}">${margin}%</span></td>
    </tr>`;
  }).join('');
}


// ── RETURNS ──
function renderReturnsPage(){
  populateReturnProductSelects();renderReturnKpiCards();renderReturnHistory();setReturnType(returnType);
  document.getElementById('df-date').value=new Date().toISOString().split('T')[0];
}
function setReturnType(type){
  returnType=type;
  document.getElementById('form-customer').style.display=type==='customer'?'block':'none';
  document.getElementById('form-defective').style.display=type==='defective'?'block':'none';
  document.getElementById('rtype-customer').className='rt-btn'+(type==='customer'?' act-cust':'');
  document.getElementById('rtype-defective').className='rt-btn'+(type==='defective'?' act-deft':'');
}
function populateReturnProductSelects(){
  const opts=`<option value="">Select product…</option>`+PRODUCTS.map(p=>`<option value="${p.id}">${p.emoji} ${p.name} (${p.brand}) — ${rs(p.price)}</option>`).join('');
  document.getElementById('cr-manual-product').innerHTML=opts;
  document.getElementById('df-product').innerHTML=opts.replace('Select product…','Add product…');
}
function lookupBill(){
  const raw=document.getElementById('cr-billno').value.trim().replace(/^#?SC-?/i,'');
  const num=parseInt(raw);const sale=SALES.find(s=>s.billNo===num);
  const resultEl=document.getElementById('bill-lookup-result');const blrContent=document.getElementById('blr-content');
  if(!sale){
    resultEl.style.background='#FAEAE6';resultEl.style.borderColor='var(--rust)';
    blrContent.innerHTML=`<span style="color:var(--rust);font-family:'DM Mono',monospace;font-size:11px;">Bill #SC-${num||'?'} not found.</span>`;
    resultEl.classList.add('show');crItems=[];crDiscountRatio=1;renderCrItemsList();return;
  }
  const d=new Date(sale.date);
  resultEl.style.background='var(--green-light)';resultEl.style.borderColor='var(--green)';
  blrContent.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;"><b>${sale.customer}</b> · ${d.toLocaleDateString('en-PK')} · ${rs(sale.total)}</div>`;
  resultEl.classList.add('show');
  document.getElementById('cr-customer').value=sale.customer;
  crItems=sale.items.map(i=>({...i,maxQty:i.qty,qty:0}));
  // Discount was applied at the bill level (not per item), so a returned
  // item must refund the price ACTUALLY PAID, not the full catalogue
  // price. Work out what fraction of the bill's subtotal the customer
  // really paid, and apply that same ratio to any items being returned.
  const billSubtotal=sale.subtotal||sale.items.reduce((s,i)=>s+i.price*i.qty,0);
  crDiscountRatio=billSubtotal>0?(sale.total/billSubtotal):1;
  renderCrItemsList();updateCrRefund();
}
function renderCrItemsList(){
  const el=document.getElementById('cr-items-list');
  if(!crItems.length){el.innerHTML=`<div class="empty-state" style="padding:14px;">No items loaded</div>`;return;}
  el.innerHTML=crItems.map((item,idx)=>`
    <div class="ret-item-row">
      <div class="ri-emoji">${item.emoji}</div>
      <div class="ri-info"><div class="ri-name">${item.name}</div><div class="ri-meta">${item.brand} · ${rs(item.price)} · Max: ${item.maxQty}</div></div>
      <input class="ret-qty-inp" type="number" min="0" max="${item.maxQty}" value="${item.qty}" onchange="setCrQty(${idx},this.value)" oninput="setCrQty(${idx},this.value)">
    </div>`).join('');
}
function setCrQty(idx,val){let v=parseInt(val)||0;v=Math.max(0,Math.min(v,crItems[idx].maxQty));crItems[idx].qty=v;updateCrRefund();}
function addManualReturnItem(type){
  const selId=type==='customer'?'cr-manual-product':'df-product';
  const id=parseInt(document.getElementById(selId).value);if(!id)return;
  const prod=PRODUCTS.find(p=>p.id===id);if(!prod)return;
  document.getElementById(selId).value='';
  if(type==='customer'){
    if(crItems.find(i=>i.id===id)){showToast('Already in list');return;}
    // manualNoDiscount: this item wasn't part of a looked-up bill, so it
    // should always refund at full catalogue price, even if a bill with
    // a discount was looked up earlier in this same return session.
    crItems.push({...prod,maxQty:99,qty:1,manualNoDiscount:true});renderCrItemsList();updateCrRefund();
  }else{
    if(dfItems.find(i=>i.id===id)){showToast('Already in list');return;}
    dfItems.push({...prod,qty:1});renderDfItemsList();updateDfSummary();
  }
}
function updateCrRefund(){
  const active=crItems.filter(i=>i.qty>0);
  const refund=active.reduce((s,i)=>s+i.price*i.qty*(i.manualNoDiscount?1:crDiscountRatio),0);
  document.getElementById('cr-item-count').textContent=active.length;
  document.getElementById('cr-total-refund').textContent=rs(refund);
}
function submitCustomerReturn(){
  const active=crItems.filter(i=>i.qty>0);
  if(!active.length){showToast('Add at least one item');return;}
  const customer=document.getElementById('cr-customer').value.trim()||'Walk-in Customer';
  const reason=document.getElementById('cr-reason').value;
  if(!reason){showToast('Select a reason for return');return;}
  // Refund the price actually paid (after the original bill's discount),
  // not the full catalogue price — see lookupBill() for how the ratio
  // is derived from the linked bill. Manually-added items (no bill
  // reference) always refund at full catalogue price.
  const refund=active.reduce((s,i)=>s+i.price*i.qty*(i.manualNoDiscount?1:crDiscountRatio),0);
  const rec={rid:nextRetId(),type:'customer',date:new Date().toISOString(),customer,reason,
    notes:document.getElementById('cr-notes').value.trim(),billNo:document.getElementById('cr-billno').value.trim(),
    items:active.map(i=>({id:i.id,name:i.name,brand:i.brand,emoji:i.emoji,price:i.price,cost:i.cost||0,qty:i.qty})),refund,loss:0};
  // Restore stock in memory + push to DB individually
  active.forEach(item=>{const p=PRODUCTS.find(x=>x.id===item.id);if(p){p.stock+=item.qty;if(dbOnline&&p._sid)sbUpdateOne('products',p._sid,p);}});
  cacheProducts();
  if(dbOnline){sbInsertOne('returns',rec).then(saved=>{if(saved)rec._sid=saved._sid;});}
  RETURNS.push(rec);cacheReturns();
  crItems=[];crDiscountRatio=1;['cr-customer','cr-billno','cr-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cr-reason').value='';document.getElementById('bill-lookup-result').classList.remove('show');
  renderCrItemsList();updateCrRefund();renderReturnKpiCards();renderReturnHistory();renderProducts();
  showToast(`✓ Return processed — ${rs(refund)} refund`);
}
function renderDfItemsList(){
  const el=document.getElementById('df-items-list');
  if(!dfItems.length){el.innerHTML=`<div class="empty-state" style="padding:14px;">Add items above</div>`;return;}
  el.innerHTML=dfItems.map((item,idx)=>`
    <div class="ret-item-row">
      <div class="ri-emoji">${item.emoji}</div>
      <div class="ri-info"><div class="ri-name">${item.name}</div><div class="ri-meta">${item.brand} · Cost: ${rs(item.cost||0)} · Stock: ${item.stock}</div></div>
      <input class="ret-qty-inp" type="number" min="1" max="${item.stock}" value="${item.qty}" onchange="setDfQty(${idx},this.value)" oninput="setDfQty(${idx},this.value)">
      <button onclick="removeDfItem(${idx})" style="background:none;border:none;color:var(--rust);cursor:pointer;font-size:16px;padding:0 4px;">✕</button>
    </div>`).join('');
}
function setDfQty(idx,val){let v=parseInt(val)||1;v=Math.max(1,Math.min(v,dfItems[idx].stock||999));dfItems[idx].qty=v;updateDfSummary();}
function removeDfItem(idx){dfItems.splice(idx,1);renderDfItemsList();updateDfSummary();}
function updateDfSummary(){
  const units=dfItems.reduce((s,i)=>s+i.qty,0);
  const loss=dfItems.reduce((s,i)=>s+(i.cost||0)*i.qty,0);
  document.getElementById('df-item-count').textContent=dfItems.length;
  document.getElementById('df-unit-count').textContent=units;
  document.getElementById('df-total-loss').textContent=rs(loss);
}
function submitDefectiveReturn(){
  if(!dfItems.length){showToast('Add at least one item');return;}
  const company=document.getElementById('df-company').value.trim();
  const defect=document.getElementById('df-defect').value;
  if(!company){showToast('Enter supplier name');return;}
  if(!defect){showToast('Select defect type');return;}
  const loss=dfItems.reduce((s,i)=>s+(i.cost||0)*i.qty,0);
  const rec={rid:nextRetId(),type:'defective',date:new Date(document.getElementById('df-date').value||new Date().toISOString().split('T')[0]).toISOString(),
    company,defect,ref:document.getElementById('df-ref').value.trim(),notes:document.getElementById('df-notes').value.trim(),
    items:dfItems.map(i=>({id:i.id,name:i.name,brand:i.brand,emoji:i.emoji,price:i.price,cost:i.cost||0,qty:i.qty})),refund:0,loss};
  dfItems.forEach(item=>{const p=PRODUCTS.find(x=>x.id===item.id);if(p){p.stock=Math.max(0,p.stock-item.qty);if(dbOnline&&p._sid)sbUpdateOne('products',p._sid,p);}});
  cacheProducts();
  if(dbOnline){sbInsertOne('returns',rec).then(saved=>{if(saved)rec._sid=saved._sid;});}
  RETURNS.push(rec);cacheReturns();
  dfItems=[];['df-company','df-ref','df-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('df-defect').value='';document.getElementById('df-date').value=new Date().toISOString().split('T')[0];
  renderDfItemsList();updateDfSummary();renderReturnKpiCards();renderReturnHistory();renderProducts();
  showToast(`✓ Defective return submitted`);
}
function setReturnHistoryTab(filter,btn){
  returnHistoryFilter=filter;document.querySelectorAll('.ht').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderReturnHistory();
}
function renderReturnKpiCards(){
  const cr=RETURNS.filter(r=>r.type==='customer');const df=RETURNS.filter(r=>r.type==='defective');
  const totalRefund=cr.reduce((s,r)=>s+r.refund,0);const totalLoss=df.reduce((s,r)=>s+r.loss,0);
  const crU=cr.reduce((s,r)=>s+r.items.reduce((a,i)=>a+i.qty,0),0);
  const dfU=df.reduce((s,r)=>s+r.items.reduce((a,i)=>a+i.qty,0),0);
  document.getElementById('returnKpiCards').innerHTML=`
    <div class="rk"><div class="rk-lbl">Customer Returns</div><div class="rk-val red">${cr.length}</div></div>
    <div class="rk"><div class="rk-lbl">Units Returned</div><div class="rk-val red">${crU}</div></div>
    <div class="rk"><div class="rk-lbl">Total Refunds</div><div class="rk-val red">${rs(totalRefund)}</div></div>
    <div class="rk"><div class="rk-lbl">Defective Returns</div><div class="rk-val amb">${df.length}</div></div>
    <div class="rk"><div class="rk-lbl">Defective Units</div><div class="rk-val amb">${dfU}</div></div>
    <div class="rk"><div class="rk-lbl">Total Loss</div><div class="rk-val amb">${rs(totalLoss)}</div></div>`;
}
function renderReturnHistory(){
  const sq=(document.getElementById('returnsSearch')?.value||'').toLowerCase().trim();
  let list=returnHistoryFilter==='all'?RETURNS:RETURNS.filter(r=>r.type===returnHistoryFilter);
  if(sq)list=list.filter(r=>{
    const hay=(r.customer||'')+(r.company||'')+(r.reason||'')+(r.defect||'')+'RET-'+r.rid+(r.items||[]).map(i=>i.name).join('');
    return hay.toLowerCase().includes(sq);
  });
  list=[...list].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tb=document.getElementById('returnHistoryBody');
  if(!list.length){tb.innerHTML=`<tr><td colspan="8" class="empty-state">No returns recorded yet.</td></tr>`;return;}
  tb.innerHTML=list.map(r=>{
    const d=new Date(r.date);const isC=r.type==='customer';
    return `<tr>
      <td class="td-mono" style="font-size:10px;">#RET-${r.rid}</td>
      <td style="font-family:'DM Mono',monospace;font-size:10px;">${d.toLocaleDateString('en-PK')}<br><span style="color:var(--muted);">${d.toLocaleTimeString()}</span></td>
      <td>${isC?`<span class="pill pill-cr">CUSTOMER</span>`:`<span class="pill pill-df">DEFECTIVE</span>`}</td>
      <td><b style="font-size:13px;">${isC?(r.customer||'—'):(r.company||'—')}</b>${r.billNo?`<br><span style="font-family:'DM Mono',monospace;font-size:9px;background:rgba(76,95,213,0.15);color:var(--gold);padding:1px 5px;border-radius:0;">Bill #SC-${r.billNo}</span>`:'<br><span style="font-size:9px;color:var(--muted);">No bill linked</span>'}</td>
      <td style="font-size:12px;">${r.items.map(i=>`${i.emoji}${i.qty}×`).join(' ')}</td>
      <td style="font-size:10px;color:var(--muted);">${isC?(r.reason||'—'):(r.defect||'—')}</td>
      <td>${isC?`<span style="color:var(--rust);font-family:'DM Mono',monospace;">${rs(r.refund)}</span>`:`<span style="color:var(--amber);font-family:'DM Mono',monospace;">${rs(r.loss)}</span>`}</td>
      <td><button class="btn-dl" onclick="deleteReturn(${r.rid})">🗑</button></td>
    </tr>`;
  }).join('');
}
function deleteReturn(rid){
  const r=RETURNS.find(x=>x.rid===rid);if(!r)return;
  if(!confirm('Delete this return record?'))return;
  RETURNS=RETURNS.filter(x=>x.rid!==rid);
  cacheReturns();
  if(dbOnline&&r._sid)sbDeleteOne('returns',r._sid);
  renderReturnKpiCards();renderReturnHistory();showToast('Return deleted');
}

// ── EXPENSES ──
const EXP_CAT_COLORS={
  'Rent':'#E6528A','Salary':'#5B8AF0','Electricity':'#F5A623',
  'Water & Gas':'#4ECDC4','Stock Purchase':'#9B59B6','Transport':'#2ECC71',
  'Marketing':'#E67E22','Repair & Maintenance':'#E74C3C',
  'Internet & Phone':'#1ABC9C','Tax & Government':'#8E44AD','Miscellaneous':'#7F8C8D'
};
const EXP_CAT_EMOJIS={
  'Rent':'🏠','Salary':'👷','Electricity':'💡','Water & Gas':'💧',
  'Stock Purchase':'📦','Transport':'🚗','Marketing':'📢',
  'Repair & Maintenance':'🔧','Internet & Phone':'📱',
  'Tax & Government':'🏛️','Miscellaneous':'📋'
};
let expEditId=null;

function renderExpensesPage(){
  document.getElementById('exp-date').value=new Date().toISOString().split('T')[0];
  renderExpenseKpis();renderExpenseTable();renderExpenseCategoryBreakdown();
}

async function addExpense(){
  const title=document.getElementById('exp-title').value.trim();
  const cat=document.getElementById('exp-cat').value;
  const amount=parseFloat(document.getElementById('exp-amount').value);
  const date=document.getElementById('exp-date').value;
  const notes=document.getElementById('exp-notes').value.trim();
  if(!title){showToast('Enter expense title');return;}
  if(!cat){showToast('Select a category');return;}
  if(!amount||amount<=0){showToast('Enter a valid amount');return;}
  if(!date){showToast('Select a date');return;}
  const nextExpId=EXPENSES.length?Math.max(...EXPENSES.map(e=>e.eid||0))+1:1;
  const exp={eid:nextExpId,title,cat,amount,date,notes,createdAt:new Date().toISOString()};
  if(dbOnline){
    showSyncStatus('saving');
    const saved=await sbInsertOne('expenses',exp);
    if(saved){exp._sid=saved._sid;}
    showSyncStatus('online');
  }
  EXPENSES.push(exp);
  cacheExpenses();
  ['exp-title','exp-amount','exp-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('exp-cat').value='';
  document.getElementById('exp-date').value=new Date().toISOString().split('T')[0];
  renderExpenseKpis();renderExpenseTable();renderExpenseCategoryBreakdown();
  // Also refresh sales KPIs if on sales page
  showToast(`✓ Expense of ${rs(amount)} added`);
}

function renderExpenseKpis(){
  const now=new Date();
  const totalExp=EXPENSES.reduce((s,e)=>s+e.amount,0);
  const todayExp=EXPENSES.filter(e=>{const d=new Date(e.date);return d.toDateString()===now.toDateString();}).reduce((s,e)=>s+e.amount,0);
  const monthExp=EXPENSES.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,e)=>s+e.amount,0);
  const yearExp=EXPENSES.filter(e=>new Date(e.date).getFullYear()===now.getFullYear()).reduce((s,e)=>s+e.amount,0);
  // Net profit = total sales profit - total expenses
  const totalSalesProfit=SALES.reduce((s,x)=>s+x.profit,0);
  const netProfit=totalSalesProfit-totalExp;
  const monthSalesProfit=SALES.filter(x=>{const d=new Date(x.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,x)=>s+x.profit,0);
  const monthNetProfit=monthSalesProfit-monthExp;
  document.getElementById('expKpiCards').innerHTML=`
    <div class="kpi" style="border-top:3px solid var(--rust);"><div class="kpi-label">📅 Today's Expenses</div><div class="kpi-val red">${rs(todayExp)}</div></div>
    <div class="kpi" style="border-top:3px solid #E67E22;"><div class="kpi-label">📆 This Month Expenses</div><div class="kpi-val" style="color:#E67E22;">${rs(monthExp)}</div></div>
    <div class="kpi" style="border-top:3px solid var(--green);"><div class="kpi-label">📆 Month Net Profit</div><div class="kpi-val ${monthNetProfit>=0?'green':'red'}">${rs(monthNetProfit)}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:3px;">After expenses</div></div>
    <div class="kpi"><div class="kpi-label">This Year Expenses</div><div class="kpi-val red">${rs(yearExp)}</div></div>
    <div class="kpi"><div class="kpi-label">Total All Expenses</div><div class="kpi-val red">${rs(totalExp)}</div></div>
    <div class="kpi" style="border-top:3px solid var(--green);"><div class="kpi-label">True Net Profit</div><div class="kpi-val ${netProfit>=0?'green':'red'}">${rs(netProfit)}</div><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:3px;">Revenue − Cost − Expenses</div></div>`;
}

function renderExpenseTable(){
  const catFilter=document.getElementById('expFilterCat').value;
  const monFilter=document.getElementById('expFilterMonth').value;
  const sq=(document.getElementById('expSearch')?.value||'').toLowerCase().trim();
  let filtered=EXPENSES.filter(e=>{
    if(catFilter!=='all'&&e.cat!==catFilter)return false;
    if(monFilter!=='all'&&new Date(e.date).getMonth()!==parseInt(monFilter))return false;
    if(sq&&!(e.title+' '+(e.notes||'')).toLowerCase().includes(sq))return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tb=document.getElementById('expenseTableBody');
  if(!filtered.length){tb.innerHTML=`<tr><td colspan="6" class="empty-state">No expenses recorded yet.</td></tr>`;return;}
  tb.innerHTML=filtered.map(e=>{
    const d=new Date(e.date);
    const emoji=EXP_CAT_EMOJIS[e.cat]||'📋';
    const color=EXP_CAT_COLORS[e.cat]||'#888';
    return `<tr>
      <td style="font-family:'DM Mono',monospace;font-size:10px;white-space:nowrap;">${d.toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</td>
      <td><b style="font-size:13px;">${e.title}</b></td>
      <td><span class="exp-cat-badge" style="background:${color}18;color:${color};">${emoji} ${e.cat}</span></td>
      <td style="font-family:'DM Mono',monospace;color:var(--rust);font-weight:600;">${rs(e.amount)}</td>
      <td style="font-size:11px;color:var(--muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.notes||'—'}</td>
      <td><button class="btn-dl" onclick="deleteExpense(${e.eid})">🗑</button></td>
    </tr>`;
  }).join('');
}

function renderExpenseCategoryBreakdown(){
  const map={};
  EXPENSES.forEach(e=>{if(!map[e.cat])map[e.cat]=0;map[e.cat]+=e.amount;});
  const sorted=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const maxVal=sorted.length?sorted[0][1]:1;
  const el=document.getElementById('expCategoryBreakdown');
  if(!sorted.length){el.innerHTML=`<div class="empty-state">No expenses yet.</div>`;return;}
  el.innerHTML=sorted.map(([cat,total])=>{
    const emoji=EXP_CAT_EMOJIS[cat]||'📋';
    const color=EXP_CAT_COLORS[cat]||'#888';
    return `<div class="exp-bar-row">
      <div class="exp-bar-label">${emoji} ${cat}</div>
      <div class="exp-bar-wrap"><div class="exp-bar-fill" style="width:${(total/maxVal*100).toFixed(1)}%;background:${color};"></div></div>
      <div class="exp-bar-val" style="color:${color};">${rs(total)}</div>
    </div>`;
  }).join('');
}

function deleteExpense(eid){
  const e=EXPENSES.find(x=>x.eid===eid);if(!e)return;
  if(!confirm(`Delete expense "${e.title}"?`))return;
  EXPENSES=EXPENSES.filter(x=>x.eid!==eid);
  cacheExpenses();
  if(dbOnline&&e._sid)sbDeleteOne('expenses',e._sid);
  renderExpenseKpis();renderExpenseTable();renderExpenseCategoryBreakdown();
  showToast('Expense deleted');
}

// ── BILLS GRID ──
function renderBillsGrid(){
  const q=(document.getElementById('billsSearch')?.value||'').toLowerCase();
  const pf=document.getElementById('billsFilterPay')?.value||'all';
  let filtered=[...SALES].filter(s=>{
    if(pf!=='all'&&s.payMethod!==pf)return false;
    if(q&&!s.customer.toLowerCase().includes(q)&&!('sc-'+s.billNo).includes(q)&&!String(s.billNo).includes(q))return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const totalAmt=filtered.reduce((s,x)=>s+x.total,0);
  const totalProfit=filtered.reduce((s,x)=>s+x.profit,0);
  document.getElementById('billsCount').textContent=filtered.length+' bills  ·  '+rs(totalAmt)+'  ·  profit '+rs(totalProfit);
  const grid=document.getElementById('billsGrid');
  if(!filtered.length){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1;padding:60px;">No bills found.</div>';return;}
  const pName={'cash':'💵 Cash','easypaisa':'📲 EasyPaisa','jazzcash':'🎵 JazzCash','bank':'🏦 Bank'};
  const pColor={'cash':'var(--amber)','easypaisa':'var(--green)','jazzcash':'var(--rust)','bank':'var(--blue)'};
  grid.innerHTML=filtered.map(s=>{
    const d=new Date(s.date);
    const isToday=d.toDateString()===new Date().toDateString();
    const dateStr=isToday?'Today · '+d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});
    const itemLines=s.items.map(i=>'<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);"><span>'+i.emoji+' '+i.name+(i.size?' <span style="font-size:9px;background:var(--gold-light);color:var(--amber);padding:1px 4px;border-radius:0;margin-left:3px;">Sz '+i.size+'</span>':'')+'<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--muted);margin-left:4px;">×'+i.qty+'</span></span><span style="font-family:\'DM Mono\',monospace;color:var(--amber);flex-shrink:0;">'+rs(i.price*i.qty)+'</span></div>').join('');
    const pc=pColor[s.payMethod]||'var(--amber)';
    return '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:0;overflow:hidden;box-shadow:var(--shadow-sm);">'
      +'<div style="background:var(--ink);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">'
        +'<span style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--gold);font-weight:600;">#SC-'+s.billNo+'</span>'
        +'<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:rgba(255,255,255,0.35);">'+dateStr+'</span>'
      +'</div>'
      +'<div style="padding:12px 14px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">'
          +'<div><div style="font-family:\'Cormorant Garamond\',serif;font-size:17px;font-weight:700;">'+s.customer+'</div>'
          +(s.phone?'<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin-top:2px;">📞 '+s.phone+'</div>':'')+'</div>'
          +'<div style="text-align:right;flex-shrink:0;margin-left:12px;">'
            +'<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;font-weight:700;color:var(--amber);">'+rs(s.total)+'</div>'
            +'<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:'+pc+';margin-top:1px;">'+( pName[s.payMethod]||s.payMethod)+'</div>'
          +'</div>'
        +'</div>'
        +'<div style="background:var(--bg);border-radius:0;padding:6px 8px;margin-bottom:8px;">'+itemLines+'</div>'
        +'<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);">'
          +s.items.reduce((n,i)=>n+i.qty,0)+' pairs &nbsp;·&nbsp; profit: <b style="color:'+(s.profit>=0?'var(--green)':'var(--rust)')+';">'+rs(s.profit)+'</b>'
        +'</div>'
      +'</div>'
      +'<div style="display:flex;border-top:1px solid var(--border);">'
        +'<button onclick="reprintBill('+s.billNo+')" style="flex:1;padding:11px;background:var(--ink);color:var(--gold);border:none;font-family:\'DM Mono\',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;">🖨️ REPRINT</button>'
        +(isAdmin()?'<div style="width:1px;background:rgba(255,255,255,0.08);"></div>':'')
        +(isAdmin()?'<button onclick="deleteBill('+s.billNo+')" style="flex:1;padding:11px;background:var(--ink);color:var(--rust);border:none;font-family:\'DM Mono\',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;">🗑 DELETE</button>':'')
      +'</div>'
    +'</div>';
  }).join('');
}

async function deleteBill(billNo){if(!isAdmin()){showToast('Access denied');return;}
  const s=SALES.find(x=>x.billNo===billNo);
  if(!s)return;
  if(!confirm('Delete Bill #SC-'+billNo+' for '+s.customer+'?\n\nThis will remove it from the database and cannot be undone.'))return;
  SALES=SALES.filter(x=>x.billNo!==billNo);
  cacheSales();
  if(dbOnline&&s._sid)await sbDeleteOne('sales',s._sid);
  renderBillsGrid();
  showToast('Bill #SC-'+billNo+' deleted');
}

function reprintBill(billNo){
  const s=SALES.find(x=>x.billNo===billNo);
  if(!s)return;
  const d=new Date(s.date);
  const itemsHTML=s.items.map(i=>'<div class="r-item-row"><div class="r-item-l"><span class="r-item-q">'+i.qty+'×</span><span>'+i.emoji+' '+i.name+(i.size?' (Size '+i.size+')':'')+'</span></div><span>'+rs(i.price*i.qty)+'</span></div>').join('');
  const pLabel={'cash':'Cash','easypaisa':'EasyPaisa','jazzcash':'JazzCash'}[s.payMethod]||s.payMethod;
  const printCSS=`@page{size:80mm auto;margin:0;}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}html,body{height:auto!important;overflow:visible!important;}body{font-family:'Courier New',Courier,monospace;background:var(--card);color:#000;font-size:12px;font-weight:700;width:80mm;-webkit-font-smoothing:antialiased;}.cut-line{text-align:center;font-size:11px;letter-spacing:1px;padding:6px 0 2px;color:#000;font-weight:700;}.cut-line-end{text-align:center;font-size:11px;letter-spacing:1px;padding:6px 0 14px;color:#000;font-weight:700;}.head{background:var(--card);color:#000;padding:14px 14px 12px;text-align:center;border-bottom:3px solid #000;}.logo{font-size:22px;font-weight:700;letter-spacing:4px;}.tag{font-size:12px;color:#000;margin-top:6px;line-height:2;font-weight:700;letter-spacing:0.5px;}.body{padding:10px 14px;}.div{border-top:2px dashed #000;margin:8px 0;}.lbl{font-size:10px;color:#000;font-weight:700;}.cust{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}.r-item-row{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:5px;font-weight:700;}.r-item-l{display:flex;gap:4px;flex:1;}.r-item-q{color:#000;min-width:18px;font-weight:700;}.tot{display:flex;justify-content:space-between;font-size:11.5px;color:#000;margin-bottom:3px;font-weight:700;}.grand{display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:700;margin:9px 0 8px;padding:9px 10px;background:#000;color:#fff;letter-spacing:0.5px;}.pay{font-size:10.5px;color:#000;font-weight:700;text-align:center;border:2px solid #000;padding:5px 0;margin-top:2px;letter-spacing:2px;text-transform:uppercase;}.info{border:2px dashed #000;padding:8px 9px;margin-top:10px;}.info-ttl{font-size:9.5px;color:#000;letter-spacing:3px;text-transform:uppercase;text-align:center;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:6px;font-weight:700;}.info-row{display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:5px;font-weight:700;}.info-row b{color:#000;}.foot{text-align:center;border-top:2px dashed #000;padding:10px 12px 6px;font-size:10.5px;color:#000;line-height:1.9;font-weight:700;margin-top:6px;}.des{text-align:center;font-size:9px;color:#000;padding:4px 12px 4px;font-weight:700;}`;
  const body=`<div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - - - - -</div><div class="head"><div class="logo">AT SERVIS SHOE</div><div class="tag">📍 Main Bazzar Shahkot<br>📞 0300-4340173</div></div><div class="body"><div class="lbl">${d.toLocaleDateString('en-PK')} · ${d.toLocaleTimeString()} · #SC-${s.billNo}</div><div class="cust">${s.customer}</div>${s.phone?'<div class="lbl">📞 '+s.phone+'</div>':''}<div class="div"></div>${itemsHTML}<div class="div"></div><div class="tot"><span>Subtotal</span><span>${rs(s.subtotal)}</span></div>${s.discountAmt>0?'<div class="tot"><span>Discount</span><span>− '+rs(s.discountAmt)+'</span></div>':''}<div class="grand"><span>Total</span><span>${rs(s.total)}</span></div><div class="pay">Payment: ${pLabel}</div><div class="info"><div class="info-ttl">Payment Accounts</div><div class="info-row"><b>🎵 JazzCash</b><span style="text-align:right;display:flex;flex-direction:column;">Zahid Majeed<br>0300-4340173</span></div><div class="info-row"><b>📲 EasyPaisa</b><span style="text-align:right;display:flex;flex-direction:column;">Zahid Majeed<br>0300-4340173</span></div></div></div><div class="foot">Thank you for shopping with us!<br>Exchange within 7 days with receipt.<br>اے ٹی سروس شو — آپ کا اعتماد، ہماری ترجیح</div><div class="des" style="font-size:11px;font-weight:700;text-align:center;color:#000;margin-top:6px;border-top:1px dashed #000;padding-top:6px;line-height:1.7;">Developed by AB Dev<br>Support: 0329-4806508</div><div class="cut-line-end">- - - - - - - - - - - - - - - - - - - - - - - - -</div>`;
  const win=window.open('','_blank','width=380,height=1400');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reprint #SC-'+s.billNo+'</title><style>'+printCSS+'</style></head><body>'+body+'</body></html>');
  win.document.close();
  win.onload=function(){
    win.focus();
    setTimeout(function(){win.print();},300);
  };
  win.onafterprint=function(){try{win.close();}catch(e){}};
  setTimeout(function(){try{win.close();}catch(e){}},10000);
}

// ── PRINT RECORDS ──
let recordMode='monthly';

function setRecordMode(mode){
  recordMode=mode;
  document.getElementById('recMode-monthly').style.cssText=mode==='monthly'
    ?'flex:1;padding:10px;border-radius:0;border:1.5px solid var(--gold);background:var(--gold-light);color:var(--amber);font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;font-weight:600;'
    :'flex:1;padding:10px;border-radius:0;border:1.5px solid var(--border);background:var(--card);color:var(--muted);font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;';
  document.getElementById('recMode-yearly').style.cssText=mode==='yearly'
    ?'flex:1;padding:10px;border-radius:0;border:1.5px solid var(--gold);background:var(--gold-light);color:var(--amber);font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;font-weight:600;'
    :'flex:1;padding:10px;border-radius:0;border:1.5px solid var(--border);background:var(--card);color:var(--muted);font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;';
  document.getElementById('recMonth').style.display=mode==='monthly'?'':'none';
  renderRecordPreview();
}

function renderRecordsPage(){
  const years=[...new Set(SALES.map(x=>new Date(x.date).getFullYear()))];
  const curYear=new Date().getFullYear();
  if(!years.includes(curYear))years.push(curYear);
  years.sort((a,b)=>b-a);
  document.getElementById('recYear').innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
  document.getElementById('recMonth').value=new Date().getMonth();
  setRecordMode('monthly');
}

function getRecordData(){
  const year=parseInt(document.getElementById('recYear').value);
  const month=parseInt(document.getElementById('recMonth').value);
  let label,salesInRange,expensesInRange,returnsInRange;

  if(recordMode==='monthly'){
    const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
    label=MN[month]+' '+year;
    salesInRange=SALES.filter(s=>{const d=new Date(s.date);return d.getFullYear()===year&&d.getMonth()===month;});
    expensesInRange=EXPENSES.filter(e=>{const d=new Date(e.date);return d.getFullYear()===year&&d.getMonth()===month;});
    returnsInRange=RETURNS.filter(r=>{const d=new Date(r.date);return d.getFullYear()===year&&d.getMonth()===month;});
  }else{
    label='Year '+year;
    salesInRange=SALES.filter(s=>new Date(s.date).getFullYear()===year);
    expensesInRange=EXPENSES.filter(e=>new Date(e.date).getFullYear()===year);
    returnsInRange=RETURNS.filter(r=>new Date(r.date).getFullYear()===year);
  }

  const revenue=salesInRange.reduce((s,x)=>s+x.total,0);
  const cogs=salesInRange.reduce((s,x)=>s+x.totalCost,0);
  const grossProfit=revenue-cogs;
  const totalExpenses=expensesInRange.reduce((s,e)=>s+e.amount,0);
  const netProfit=grossProfit-totalExpenses;
  const totalUnits=salesInRange.reduce((s,x)=>s+x.items.reduce((a,i)=>a+i.qty,0),0);
  const totalBills=salesInRange.length;
  const avgBillValue=totalBills?revenue/totalBills:0;

  const custReturns=returnsInRange.filter(r=>r.type==='customer');
  const defReturns=returnsInRange.filter(r=>r.type==='defective');
  const totalRefunds=custReturns.reduce((s,r)=>s+r.refund,0);
  const totalLoss=defReturns.reduce((s,r)=>s+r.loss,0);

  // Payment method breakdown
  const payBreak={};
  salesInRange.forEach(s=>{payBreak[s.payMethod]=(payBreak[s.payMethod]||0)+s.total;});

  // Top products
  const prodMap={};
  salesInRange.forEach(s=>s.items.forEach(i=>{
    if(!prodMap[i.id])prodMap[i.id]={name:i.name,emoji:i.emoji,brand:i.brand,qty:0,rev:0,profit:0};
    prodMap[i.id].qty+=i.qty;prodMap[i.id].rev+=i.price*i.qty;prodMap[i.id].profit+=(i.price-i.cost)*i.qty;
  }));
  const topProducts=Object.values(prodMap).sort((a,b)=>b.qty-a.qty).slice(0,10);

  // Expense category breakdown
  const expCatMap={};
  expensesInRange.forEach(e=>{expCatMap[e.cat]=(expCatMap[e.cat]||0)+e.amount;});

  // Best day (for monthly) / Best month (for yearly)
  let bestPeriod=null;
  if(recordMode==='monthly'){
    const dayMap={};
    salesInRange.forEach(s=>{const d=new Date(s.date).getDate();dayMap[d]=(dayMap[d]||0)+s.total;});
    const sorted=Object.entries(dayMap).sort((a,b)=>b[1]-a[1]);
    if(sorted.length)bestPeriod={label:'Day '+sorted[0][0],value:sorted[0][1]};
  }else{
    const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monMap={};
    salesInRange.forEach(s=>{const m=new Date(s.date).getMonth();monMap[m]=(monMap[m]||0)+s.total;});
    const sorted=Object.entries(monMap).sort((a,b)=>b[1]-a[1]);
    if(sorted.length)bestPeriod={label:MN[sorted[0][0]],value:sorted[0][1]};
  }

  return{label,revenue,cogs,grossProfit,totalExpenses,netProfit,totalUnits,totalBills,avgBillValue,
    totalRefunds,totalLoss,custReturnsCount:custReturns.length,defReturnsCount:defReturns.length,
    payBreak,topProducts,expCatMap,bestPeriod,salesInRange,expensesInRange};
}

function renderRecordPreview(){
  const d=getRecordData();
  const margin=d.revenue>0?((d.netProfit/d.revenue)*100).toFixed(1):0;
  const payLabels={'cash':'💵 Cash','easypaisa':'📲 EasyPaisa','jazzcash':'🎵 JazzCash','bank':'🏦 Bank'};

  let html='<div style="background:var(--card);border:1.5px solid var(--border);border-radius:0;padding:24px;box-shadow:var(--shadow-sm);">';

  // Header
  html+='<div style="text-align:center;padding-bottom:18px;margin-bottom:20px;border-bottom:2px solid var(--gold);">';
  html+='<div style="font-family:\'Cormorant Garamond\',serif;font-size:28px;font-weight:700;">AT SERVIS SHOE</div>';
  html+='<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted);letter-spacing:2px;margin-top:4px;">BUSINESS REPORT — '+d.label.toUpperCase()+'</div>';
  html+='</div>';

  // KPI Grid
  html+='<div class="kpi-grid" style="margin-bottom:24px;">';
  html+='<div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-val gold">'+rs(d.revenue)+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Cost of Goods</div><div class="kpi-val">'+rs(d.cogs)+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Gross Profit</div><div class="kpi-val '+(d.grossProfit>=0?'green':'red')+'">'+rs(d.grossProfit)+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Total Expenses</div><div class="kpi-val red">'+rs(d.totalExpenses)+'</div></div>';
  html+='<div class="kpi" style="border-top:3px solid var(--green);"><div class="kpi-label">Net Profit</div><div class="kpi-val '+(d.netProfit>=0?'green':'red')+'">'+rs(d.netProfit)+'</div><div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--muted);margin-top:3px;">'+margin+'% margin</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Total Bills</div><div class="kpi-val">'+d.totalBills+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Pairs Sold</div><div class="kpi-val">'+d.totalUnits+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Avg Bill Value</div><div class="kpi-val gold">'+rs(d.avgBillValue)+'</div></div>';
  html+='</div>';

  // Best period
  if(d.bestPeriod){
    html+='<div style="background:var(--gold-light);border:1px solid #e8d5a8;border-radius:0;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">';
    html+='<span style="font-size:20px;">🏆</span><div><div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--amber);letter-spacing:1px;">BEST PERFORMING '+(recordMode==='monthly'?'DAY':'MONTH')+'</div>';
    html+='<div style="font-family:\'Cormorant Garamond\',serif;font-size:16px;font-weight:700;">'+d.bestPeriod.label+' — '+rs(d.bestPeriod.value)+'</div></div></div>';
  }

  // Two column: Payment breakdown + Expense breakdown
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">';

  html+='<div><div class="sec-ttl">Payment Method Breakdown</div>';
  if(Object.keys(d.payBreak).length){
    const maxPay=Math.max(...Object.values(d.payBreak));
    html+=Object.entries(d.payBreak).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
      '<div class="bar-row"><div style="width:110px;font-size:11px;flex-shrink:0;">'+( payLabels[k]||k)+'</div><div class="bar-wrap" style="flex:1;"><div class="bar-fill" style="width:'+(v/maxPay*100).toFixed(1)+'%"></div></div><div style="font-family:\'DM Mono\',monospace;font-size:10px;width:80px;text-align:right;">'+rs(v)+'</div></div>'
    ).join('');
  }else html+='<div class="empty-state">No sales in this period.</div>';
  html+='</div>';

  html+='<div><div class="sec-ttl">Expense Breakdown</div>';
  if(Object.keys(d.expCatMap).length){
    const maxExp=Math.max(...Object.values(d.expCatMap));
    html+=Object.entries(d.expCatMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>
      '<div class="bar-row"><div style="width:110px;font-size:11px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+k+'</div><div class="bar-wrap" style="flex:1;"><div class="bar-fill" style="width:'+(v/maxExp*100).toFixed(1)+'%;background:var(--rust);"></div></div><div style="font-family:\'DM Mono\',monospace;font-size:10px;width:80px;text-align:right;color:var(--rust);">'+rs(v)+'</div></div>'
    ).join('');
  }else html+='<div class="empty-state">No expenses in this period.</div>';
  html+='</div>';

  html+='</div>';

  // Top products table
  html+='<div class="sec-ttl">Top Selling Articles</div>';
  if(d.topProducts.length){
    html+='<div class="tbl-wrap" style="margin-bottom:20px;"><table class="data-tbl"><thead><tr><th></th><th>ARTICLE</th><th>BRAND</th><th>QTY</th><th>REVENUE</th><th>PROFIT</th></tr></thead><tbody>';
    html+=d.topProducts.map(p=>'<tr><td class="td-em">'+p.emoji+'</td><td class="td-name">'+p.name+'</td><td>'+p.brand+'</td><td class="td-mono">'+p.qty+'</td><td class="td-mono">'+rs(p.rev)+'</td><td class="'+(p.profit>=0?'p-pos':'p-neg')+'">'+rs(p.profit)+'</td></tr>').join('');
    html+='</tbody></table></div>';
  }else html+='<div class="empty-state" style="margin-bottom:20px;">No products sold in this period.</div>';

  // Sales detail table (per-sale: date, shoe name, payment method, price)
  html+='<div class="sec-ttl">Sales Detail</div>';
  if(d.salesInRange.length){
    const sdPayLabels={'cash':'Cash','easypaisa':'EasyPaisa','jazzcash':'JazzCash'};
    const sdSorted=[...d.salesInRange].sort((a,b)=>new Date(b.date)-new Date(a.date));
    html+='<div class="tbl-wrap" style="margin-bottom:20px;"><table class="data-tbl"><thead><tr><th>DATE</th><th>SHOE NAME</th><th>PAYMENT METHOD</th><th>PRICE</th></tr></thead><tbody>';
    html+=sdSorted.map(s=>{
      const sdDate=new Date(s.date).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'});
      const sdNames=s.items.map(i=>i.name).join(', ');
      const sdPay=sdPayLabels[s.payMethod]||s.payMethod;
      return '<tr><td class="td-mono">'+sdDate+'</td><td class="td-name">'+sdNames+'</td><td>'+sdPay+'</td><td class="td-mono">'+rs(s.total)+'</td></tr>';
    }).join('');
    html+='</tbody></table></div>';
  }else html+='<div class="empty-state" style="margin-bottom:20px;">No sales in this period.</div>';

  // Returns summary
  html+='<div class="sec-ttl">Returns &amp; Defects Summary</div>';
  html+='<div class="kpi-grid">';
  html+='<div class="kpi"><div class="kpi-label">Customer Returns</div><div class="kpi-val red">'+d.custReturnsCount+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Refunds Paid</div><div class="kpi-val red">'+rs(d.totalRefunds)+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Defective Returns</div><div class="kpi-val" style="color:var(--amber);">'+d.defReturnsCount+'</div></div>';
  html+='<div class="kpi"><div class="kpi-label">Loss from Defects</div><div class="kpi-val" style="color:var(--amber);">'+rs(d.totalLoss)+'</div></div>';
  html+='</div>';

  html+='</div>';
  document.getElementById('recordPreview').innerHTML=html;
}

function printRecordReport(){
  const d=getRecordData();
  const margin=d.revenue>0?((d.netProfit/d.revenue)*100).toFixed(1):0;
  const payLabels={'cash':'Cash','easypaisa':'EasyPaisa','jazzcash':'JazzCash','bank':'Bank Transfer'};
  const now=new Date();

  let body='<div style="font-family:Arial,sans-serif;padding:30px;max-width:800px;margin:0 auto;color:var(--ink);">';
  body+='<div style="text-align:center;border-bottom:3px solid #FCDB32;padding-bottom:16px;margin-bottom:24px;">';
  body+='<div style="font-size:28px;font-weight:bold;letter-spacing:4px;">AT SERVIS SHOE</div>';
  body+='<div style="font-size:11px;color:#888;letter-spacing:2px;margin-top:4px;">Main Bazzar Shahkot</div>';
  body+='<div style="font-size:16px;font-weight:600;margin-top:14px;color:#FCDB32;">BUSINESS REPORT — '+d.label.toUpperCase()+'</div>';
  body+='<div style="font-size:10px;color:#aaa;margin-top:4px;">Generated on '+now.toLocaleDateString('en-PK')+' at '+now.toLocaleTimeString()+'</div>';
  body+='</div>';

  function kpiBox(label,val,color){return '<div style="border:1px solid #ddd;border-radius:0;padding:12px 14px;"><div style="font-size:9px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">'+label+'</div><div style="font-size:20px;font-weight:bold;color:'+(color||'#141D38')+';">'+val+'</div></div>';}

  body+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">';
  body+=kpiBox('Total Revenue',rs(d.revenue),'#9A6F00');
  body+=kpiBox('Cost of Goods',rs(d.cogs));
  body+=kpiBox('Gross Profit',rs(d.grossProfit),d.grossProfit>=0?'#1FA97A':'#D6455D');
  body+=kpiBox('Total Expenses',rs(d.totalExpenses),'#D6455D');
  body+=kpiBox('Net Profit',rs(d.netProfit)+' ('+margin+'%)',d.netProfit>=0?'#1FA97A':'#D6455D');
  body+=kpiBox('Total Bills',d.totalBills);
  body+=kpiBox('Pairs Sold',d.totalUnits);
  body+=kpiBox('Avg Bill Value',rs(d.avgBillValue),'#9A6F00');
  body+='</div>';

  if(d.bestPeriod){
    body+='<div style="background:#FFF8E7;border:1px solid #e8d5a8;border-radius:0;padding:12px 16px;margin-bottom:20px;">';
    body+='<b>🏆 Best Performing '+(recordMode==='monthly'?'Day':'Month')+':</b> '+d.bestPeriod.label+' — '+rs(d.bestPeriod.value);
    body+='</div>';
  }

  body+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px;">';
  body+='<div><h3 style="font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px;">Payment Method Breakdown</h3><table style="width:100%;font-size:11px;margin-top:8px;">';
  body+=Object.entries(d.payBreak).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<tr><td style="padding:4px 0;">'+( payLabels[k]||k)+'</td><td style="text-align:right;font-family:monospace;">'+rs(v)+'</td></tr>').join('');
  body+='</table></div>';
  body+='<div><h3 style="font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px;">Expense Breakdown</h3><table style="width:100%;font-size:11px;margin-top:8px;">';
  body+=Object.entries(d.expCatMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<tr><td style="padding:4px 0;">'+k+'</td><td style="text-align:right;font-family:monospace;color:#D6455D;">'+rs(v)+'</td></tr>').join('');
  body+='</table></div>';
  body+='</div>';

  body+='<h3 style="font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px;">Top Selling Articles</h3>';
  body+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;margin-bottom:20px;">';
  body+='<thead><tr style="background:#0D1428;color:#fff;"><th style="padding:8px;text-align:left;">Article</th><th style="padding:8px;text-align:left;">Brand</th><th style="padding:8px;text-align:right;">Qty</th><th style="padding:8px;text-align:right;">Revenue</th><th style="padding:8px;text-align:right;">Profit</th></tr></thead><tbody>';
  body+=d.topProducts.map(p=>'<tr style="border-bottom:1px solid #eee;"><td style="padding:6px 8px;">'+p.emoji+' '+p.name+'</td><td style="padding:6px 8px;">'+p.brand+'</td><td style="padding:6px 8px;text-align:right;">'+p.qty+'</td><td style="padding:6px 8px;text-align:right;font-family:monospace;">'+rs(p.rev)+'</td><td style="padding:6px 8px;text-align:right;font-family:monospace;color:'+(p.profit>=0?'#1FA97A':'#D6455D')+';">'+rs(p.profit)+'</td></tr>').join('');
  body+='</tbody></table>';

  body+='<h3 style="font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px;">Sales Detail</h3>';
  body+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;margin-bottom:20px;">';
  body+='<thead><tr style="background:#0D1428;color:#fff;"><th style="padding:8px;text-align:left;">Date</th><th style="padding:8px;text-align:left;">Shoe Name</th><th style="padding:8px;text-align:left;">Payment Method</th><th style="padding:8px;text-align:right;">Price</th></tr></thead><tbody>';
  const sdPayLabelsPrint={'cash':'Cash','easypaisa':'EasyPaisa','jazzcash':'JazzCash'};
  body+=[...d.salesInRange].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>{
    const sdDate=new Date(s.date).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'});
    const sdNames=s.items.map(i=>i.name).join(', ');
    const sdPay=sdPayLabelsPrint[s.payMethod]||s.payMethod;
    return '<tr style="border-bottom:1px solid #eee;"><td style="padding:6px 8px;">'+sdDate+'</td><td style="padding:6px 8px;">'+sdNames+'</td><td style="padding:6px 8px;">'+sdPay+'</td><td style="padding:6px 8px;text-align:right;font-family:monospace;">'+rs(s.total)+'</td></tr>';
  }).join('');
  body+='</tbody></table>';

  body+='<h3 style="font-size:13px;border-bottom:1px solid #ddd;padding-bottom:6px;">Returns &amp; Defects Summary</h3>';
  body+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px;margin-bottom:20px;">';
  body+=kpiBox('Customer Returns',d.custReturnsCount,'#D6455D');
  body+=kpiBox('Refunds Paid',rs(d.totalRefunds),'#D6455D');
  body+=kpiBox('Defective Returns',d.defReturnsCount,'#9A6F00');
  body+=kpiBox('Loss from Defects',rs(d.totalLoss),'#9A6F00');
  body+='</div>';

  body+='<div style="text-align:center;margin-top:30px;padding-top:14px;border-top:1px solid #ddd;font-size:9px;color:#999;"> · AT SERVIS SHOE Billing System</div>';
  body+='</div>';

  const win=window.open('','_blank','width=900,height=900');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report — '+d.label+'</title></head><body>'+body+'</body></html>');
  win.document.close();
  win.onload=function(){win.focus();win.print();};
}

