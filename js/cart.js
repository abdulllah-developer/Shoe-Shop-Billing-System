/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   cart.js — Mobile cart drawer toggle, cart item management
   (add/change qty/remove), totals & discount calculation,
   payment method selection, cash tendered/change calculation,
   and bill generation, confirmation (stock deduction + save),
   receipt rendering, and thermal printing.
   ══════════════════════════════════════════════════════════ */

// ── CART TOGGLE (mobile) ──
function toggleCart(){
  cartOpen=!cartOpen;
  updateCartToggle();
}
function updateCartToggle(){
  const drawer=document.getElementById('cartDrawer');
  const arrow=document.getElementById('cartArrow');
  if(cartOpen){drawer.classList.add('open');arrow.classList.add('open');}
  else{drawer.classList.remove('open');arrow.classList.remove('open');}
}
function updateCartBar(){
  const count=cart.reduce((s,i)=>s+i.qty,0);
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const disc=Math.min(discountAmt,sub);
  document.getElementById('cartCount').textContent=count;
  document.getElementById('cartTotal').textContent=rs(sub-disc);
}

// ── CART ──
function addToCart(id){
  openSizePicker(id);
}
function changeQty(cartKey,delta){
  const idx=cart.findIndex(i=>i.cartKey===cartKey);if(idx===-1)return;
  const item=cart[idx];
  if(delta>0){
    // Re-read live stock so maxStock stays accurate
    const prod=PRODUCTS.find(p=>p.id===item.id);
    const sizeObj=item.selectedSize&&prod&&prod.sizes?prod.sizes.find(s=>s.size===item.selectedSize):null;
    const liveMax=sizeObj?sizeObj.stock:(prod?prod.stock:item.maxStock);
    if(item.qty>=liveMax){showToast('Only '+liveMax+' pairs'+(item.selectedSize?' of size '+item.selectedSize:'')+' in stock');return;}
    item.maxStock=liveMax; // keep maxStock in sync
  }
  item.qty+=delta;if(item.qty<=0)cart.splice(idx,1);renderCart();renderProducts();
}
function renderCart(){
  const el=document.getElementById('cartItems');
  if(!cart.length){
    el.innerHTML='<div class="cart-empty-state">No items yet. Tap a product to add.</div>';
    updateTotals();updateCartBar();return;
  }
  el.innerHTML=cart.map(item=>{
    // Re-read live stock for accurate cap display
    const prod=PRODUCTS.find(p=>p.id===item.id);
    const sizeObj=item.selectedSize&&prod&&prod.sizes?prod.sizes.find(s=>s.size===item.selectedSize):null;
    const liveMax=sizeObj?sizeObj.stock:(prod?prod.stock:item.maxStock);
    const atMax=item.qty>=liveMax;
    const plusDisabled=atMax?'disabled title="Max stock reached"':'';
    const plusStyle=atMax?'opacity:0.35;cursor:not-allowed;':'';
    return '<div class="cart-item"><div class="ci-emoji">'+item.emoji+'</div><div class="ci-info"><div class="ci-name">'+item.name+(item.selectedSize?' <span style="font-family:\'DM Mono\',monospace;font-size:9px;background:rgba(76,95,213,0.15);color:var(--gold);padding:1px 5px;border-radius:0;">Sz '+item.selectedSize+'</span>':'')+'</div><div class="ci-price">'+rs(item.price)+' each'+(liveMax>0?' · <span style="font-family:\'DM Mono\',monospace;font-size:9px;color:'+(atMax?'var(--rust)':'var(--muted)')+';">'+item.qty+'/'+liveMax+'</span>':'')+'</div></div><div class="ci-qty"><button class="ci-btn rm" onclick="changeQty(\''+item.cartKey+'\',-1)">−</button><span class="ci-n">'+item.qty+'</span><button class="ci-btn" onclick="changeQty(\''+item.cartKey+'\',1)" '+plusDisabled+' style="'+plusStyle+'">+</button></div><div class="ci-total">'+rs(item.price*item.qty)+'</div><button onclick="removeFromCart(\''+item.cartKey+'\')" style="margin-left:6px;background:rgba(214,69,93,0.12);border:1px solid rgba(214,69,93,0.3);color:var(--rust);width:22px;height:22px;border-radius:0;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.15s;" title="Remove item">✕</button></div>';
  }).join('');
  updateTotals();updateCartBar();
}
function removeFromCart(cartKey){
  cart=cart.filter(i=>i.cartKey!==cartKey);
  renderCart();renderProducts();
}

function applyDiscount(){
  const v=parseFloat(document.getElementById('discountInput').value)||0;
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  discountAmt=Math.max(0,Math.min(v,sub));updateTotals();updateCartBar();
  showToast(discountAmt>0?`Discount of ${rs(discountAmt)} applied`:"Discount removed");
}
function updateTotals(){
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const disc=Math.min(discountAmt,sub);
  const grand=sub-disc;
  document.getElementById('subtotalDisplay').textContent=rs(sub);
  document.getElementById('grandDisplay').textContent=rs(grand);
  const dr=document.getElementById('discountRow');
  if(disc>0){dr.style.display='flex';document.getElementById('discountDisplay').textContent=`− ${rs(disc)}`;}
  else dr.style.display='none';
  calcChange();
}
function selectPayment(method){
  payMethod=method;
  document.querySelectorAll('.pay-btn').forEach(b=>b.classList.toggle('active',b.dataset.method===method));
  document.getElementById('cashTender').classList.toggle('show',method==='cash');
  if(method!=='cash')document.getElementById('changeDisplay').classList.remove('show');
}
function calcChange(){
  if(payMethod!=='cash')return;
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const grand=sub-Math.min(discountAmt,sub);
  const tendered=parseFloat(document.getElementById('tenderAmount').value)||0;
  const el=document.getElementById('changeDisplay');
  if(tendered>=grand&&grand>0){el.textContent=`Change: ${rs(tendered-grand)}`;el.classList.add('show');}
  else el.classList.remove('show');
}
function getGrand(){const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);return sub-Math.min(discountAmt,sub);}

// ── GENERATE BILL (preview only — saves on Print) ──
let pendingBill=null;

function generateBill(){
  if(!cart.length){showToast("Add items first");return;}
  const name=document.getElementById('custName').value.trim()||"Walk-in Customer";
  const phone=document.getElementById('custPhone').value.trim();
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const disc=Math.min(discountAmt,sub);
  const grand=sub-disc;
  const totalCost=cart.reduce((s,i)=>s+(i.cost||0)*i.qty,0);
  const profit=grand-totalCost;
  const now=new Date();
  pendingBill={billNo:billCount,date:now.toISOString(),customer:name,phone,
    items:cart.map(i=>({id:i.id,name:i.name,brand:i.brand,emoji:i.emoji,price:i.price,cost:i.cost||0,qty:i.qty,size:i.selectedSize||null})),
    subtotal:sub,discountAmt:disc,total:grand,totalCost,profit,payMethod,
    cartSnapshot:JSON.parse(JSON.stringify(cart))};
  document.getElementById('r-meta').textContent=now.toLocaleDateString('en-PK')+' · '+now.toLocaleTimeString()+' · #SC-'+billCount;
  document.getElementById('r-customer').textContent=name;
  document.getElementById('r-phone').textContent=phone?'📞 '+phone:'';
  document.getElementById('r-items').innerHTML=cart.map(i=>'<div class="r-item-row"><div class="r-item-l"><span class="r-item-q">'+i.qty+'×</span><span>'+i.emoji+' '+i.name+(i.selectedSize?' (Size '+i.selectedSize+')':'')+'</span></div><span style="font-family:\'DM Mono\',monospace;font-size:11px;">'+rs(i.price*i.qty)+'</span></div>').join('');
  document.getElementById('r-sub').textContent=rs(sub);
  const rdr=document.getElementById('r-disc-row');
  if(disc>0){rdr.style.display='flex';document.getElementById('r-disc').textContent='− '+rs(disc);}
  else rdr.style.display='none';
  document.getElementById('r-grand').textContent=rs(grand);
  const pLabel={'cash':'Cash','easypaisa':'EasyPaisa','jazzcash':'JazzCash'}[payMethod]||payMethod;
  document.getElementById('r-payment').textContent='Payment: '+pLabel;
  const tendered=parseFloat(document.getElementById('tenderAmount').value)||0;
  document.getElementById('r-change').textContent=(payMethod==='cash'&&tendered>0)?'Received: '+rs(tendered)+' · Change: '+rs(Math.max(0,tendered-grand)):'';
  document.getElementById('receiptModal').classList.add('show');
}

async function confirmAndSaveBill(){
  if(!pendingBill)return;
  const bill=pendingBill;
  // ── FIX 7: Re-fetch live stock before saving to prevent 2-device oversell ──
  if(dbOnline){
    const freshProds=await sbGet('products');
    if(freshProds&&freshProds.length){
      freshProds.forEach(fp=>{const lp=PRODUCTS.find(p=>p._sid===fp._sid||p.id===fp.id);if(lp){lp.stock=fp.stock;lp.sizes=fp.sizes||lp.sizes;}});
    }
    for(const item of bill.cartSnapshot){
      const p=PRODUCTS.find(x=>x.id===item.id);if(!p)continue;
      const avail=item.selectedSize&&p.sizes?(p.sizes.find(s=>s.size===item.selectedSize)||{stock:0}).stock:p.stock;
      if(avail<item.qty){
        showToast('⚠️ '+item.name+(item.selectedSize?' (Size '+item.selectedSize+')':'')+' — only '+avail+' left. Update cart.');
        document.getElementById('receiptModal').classList.remove('show');
        renderProducts();renderCart();return;
      }
    }
  }
  // Deduct stock in memory
  bill.cartSnapshot.forEach(item=>{
    const p=PRODUCTS.find(x=>x.id===item.id);
    if(p){
      if(item.selectedSize&&p.sizes){
        const sz=p.sizes.find(s=>s.size===item.selectedSize);
        if(sz)sz.stock=Math.max(0,sz.stock-item.qty);
        p.stock=p.sizes.reduce((s,r)=>s+r.stock,0);
      }else{p.stock=Math.max(0,p.stock-item.qty);}
    }
  });
  cacheProducts();
  // Insert the new sale as a single targeted row
  if(dbOnline){
    showSyncStatus('saving');
    const saved=await sbInsertOne('sales',bill);
    if(saved){bill._sid=saved._sid;}
    // Update each affected product's stock individually
    const affected=bill.cartSnapshot.map(item=>PRODUCTS.find(x=>x.id===item.id)).filter(Boolean);
    for(const p of affected){if(p._sid)await sbUpdateOne('products',p._sid,p);}
    showSyncStatus('online');
  }
  SALES.push(bill);
  cacheSales();
  cart=[];discountAmt=0;pendingBill=null;
  ['discountInput','tenderAmount','custName','custPhone'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('changeDisplay').classList.remove('show');
  renderCart();newBillNo();renderFilters();renderProducts();
}

function closeReceipt(){
  document.getElementById('receiptModal').classList.remove('show');
  if(pendingBill){pendingBill=null;showToast('Bill cancelled — not saved');}
}

function printReceipt(){
  const content=document.getElementById('receiptContent').innerHTML;
  const billNo=pendingBill?pendingBill.billNo:billCount;
  const printCSS=`
    @page{size:80mm auto;margin:0;}
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    html,body{height:auto!important;overflow:visible!important;}
    body{font-family:'Courier New',Courier,monospace;background:#fff;color:#000;font-size:12px;font-weight:700;width:80mm;-webkit-font-smoothing:antialiased;}
    .cut-line{text-align:center;font-size:11px;letter-spacing:1px;padding:6px 0 2px;color:#000;font-weight:700;}
    .rcpt-head{background:#fff;color:#000;padding:14px 14px 12px;text-align:center;border-bottom:3px solid #000;}
    .rcpt-logo{font-size:22px;font-weight:700;letter-spacing:4px;color:#000;}
    .rcpt-logo span{color:#fff;}
    .rcpt-tagline{font-size:12px;color:#000;margin-top:6px;line-height:2;font-weight:700;letter-spacing:0.5px;}
    .rcpt-body{padding:10px 14px;}
    .r-div{border:none;border-top:2px dashed #000;margin:8px 0;}
    .r-lbl{font-size:10px;color:#000;margin-bottom:2px;font-weight:700;}
    .r-cust{font-size:14px;font-weight:700;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;}
    .r-item-row{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:5px;font-weight:700;}
    .r-item-l{display:flex;gap:4px;flex:1;}
    .r-item-q{color:#000;min-width:18px;font-weight:700;}
    .r-tot-row{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px;color:#000;font-weight:700;}
    .r-grand-row{display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:700;margin:9px 0 8px;padding:9px 10px;background:#000;color:#fff;letter-spacing:0.5px;}
    .r-pay-line{font-size:10.5px;color:#000;font-weight:700;text-align:center;border:2px solid #000;padding:5px 0;margin-top:2px;letter-spacing:2px;text-transform:uppercase;}
    .r-pay-line:empty{display:none;border:none;padding:0;margin:0;}
    .rcpt-pay-info{margin-top:10px;border:2px dashed #000;padding:8px 9px;}
    .rpi-ttl{font-size:9.5px;color:#000;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;text-align:center;border-bottom:2px solid #000;padding-bottom:5px;font-weight:700;}
    .rpi-row{display:flex;justify-content:space-between;margin-bottom:5px;gap:6px;}
    .rpi-lbl{font-size:10.5px;font-weight:700;flex-shrink:0;}
    .rpi-jc,.rpi-ep,.rpi-bk{color:#000;font-weight:700;}
    .rpi-val{font-size:10.5px;text-align:right;font-weight:700;}
    .rpi-val-blk{font-size:10.5px;text-align:right;display:flex;flex-direction:column;line-height:1.6;font-weight:700;}
    .rcpt-footer{text-align:center;padding:10px 12px 6px;border-top:2px dashed #000;font-size:10.5px;color:#000;line-height:1.9;font-weight:700;margin-top:6px;}
    .rcpt-designer{text-align:center;padding:4px 12px 4px;font-size:9px;color:#000;font-weight:700;}
    .rcpt-designer b{color:#000;font-weight:700;}
    .cut-line-end{text-align:center;font-size:11px;letter-spacing:1px;padding:6px 0 14px;color:#000;font-weight:700;}
    .rcpt-actions{display:none!important;}
  `;
  const cutTop='<div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - - - - -</div>';
  const cutBottom='<div class="cut-line-end">- - - - - - - - - - - - - - - - - - - - - - - - -</div>';
  const win=window.open('','_blank','width=380,height=1400');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt #SC-'+billNo+'</title><style>'+printCSS+'</style></head><body>'+cutTop+content+cutBottom+'</body></html>');
  win.document.close();
  win.onload=function(){
    win.focus();
    setTimeout(function(){win.print();},300);
  };
  win.onafterprint=function(){try{win.close();}catch(e){}};
  setTimeout(function(){try{win.close();}catch(e){}},10000);
  // Save bill AFTER print triggered
  confirmAndSaveBill();
  document.getElementById('receiptModal').classList.remove('show');
}

function clearAll(){
  if(!cart.length)return;
  if(!confirm("Clear all items from the cart?"))return;
  cart=[];discountAmt=0;
  ['discountInput','tenderAmount','custName','custPhone'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('changeDisplay').classList.remove('show');
  renderCart();renderProducts();newBillNo();showToast("Cart cleared");
}

