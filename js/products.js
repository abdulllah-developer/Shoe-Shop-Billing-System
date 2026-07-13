/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   products.js — Product catalogue rendering & search/filter,
   the Admin (Products) page cards/table, the Add/Edit product
   modal (including emoji + size-row logic), the size picker
   used during billing, and bulk product import from CSV/XLSX.
   ══════════════════════════════════════════════════════════ */

// ── CATALOGUE ──
function renderFilters(){
  const cats=["All",...new Set(PRODUCTS.map(p=>p.cat))];
  document.getElementById('filterTabs').innerHTML=cats.map(c=>`<button class="cat-filter ${c===activeFilter?'active':''}" onclick="setFilter('${c}')">${c}</button>`).join('');
}
function setFilter(cat){activeFilter=cat;renderFilters();filterProducts();}
function filterProducts(){
  const q=document.getElementById('searchInput').value.toLowerCase();
  renderProducts(PRODUCTS.filter(p=>(activeFilter==="All"||p.cat===activeFilter)&&(p.name.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q))));
}
function renderProducts(list){
  if(list===undefined)list=PRODUCTS;
  document.getElementById('product-count').textContent=PRODUCTS.length+' items';
  const g=document.getElementById('productGrid');
  if(!list.length){g.innerHTML=`<div class="empty-state" style="grid-column:1/-1">No products found.</div>`;return;}
  g.innerHTML=list.map(p=>{
    // Subtract cart quantities from displayed stock so it updates instantly when items are added to cart
    const cartItem=cart.filter(i=>i.id===p.id);
    const cartQty=cartItem.reduce((s,i)=>s+i.qty,0);
    const dispStock=Math.max(0,p.stock-cartQty);
    const availSizes=p.sizes?p.sizes.map(s=>{
      const inCart=cart.find(i=>i.id===p.id&&i.selectedSize===s.size);
      const remStock=Math.max(0,s.stock-(inCart?inCart.qty:0));
      return remStock>0?s.size:null;
    }).filter(Boolean):[];
    const sizeBadges=availSizes.length>0?'<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">'+availSizes.slice(0,6).map(s=>'<span style="font-family:\'DM Mono\',monospace;font-size:8px;background:var(--gold-light);color:var(--amber);padding:1px 4px;border-radius:0;">'+s+'</span>').join('')+(availSizes.length>6?'<span style="font-size:8px;color:var(--muted);">+more</span>':'')+'</div>':'';
    const oos=dispStock===0;
    return '<div class="product-card '+(oos?'oos':'')+'" onclick="addToCart('+p.id+')">'+(oos?'':'<div class="p-add">+</div>')+'<span class="p-emoji">'+p.emoji+'</span><div class="p-name">'+p.name+'</div><div class="p-brand">'+p.brand+'</div><div class="p-price">'+rs(p.price)+'</div>'+sizeBadges+'<div class="p-stock '+(dispStock<=5?'low':'')+'">'+( oos?'Out of Stock':dispStock<=5?'Only '+dispStock+' left':dispStock+' pairs')+'</div></div>';
  }).join('');
}


// ── ADMIN ──
function renderAdminCards(){
  const total=PRODUCTS.reduce((s,p)=>s+p.stock,0);
  const outOf=PRODUCTS.filter(p=>p.stock===0).length;
  const low=PRODUCTS.filter(p=>p.stock>0&&p.stock<=5).length;
  const val=PRODUCTS.reduce((s,p)=>s+(p.cost||0)*p.stock,0);
  document.getElementById('adminCards').innerHTML=`
    <div class="kpi"><div class="kpi-label">Total Products</div><div class="kpi-val">${PRODUCTS.length}</div></div>
    <div class="kpi"><div class="kpi-label">Units in Stock</div><div class="kpi-val green">${total}</div></div>
    <div class="kpi"><div class="kpi-label">Low Stock (≤5)</div><div class="kpi-val ${low>0?'red':''}">${low}</div></div>
    <div class="kpi"><div class="kpi-label">Out of Stock</div><div class="kpi-val ${outOf>0?'red':''}">${outOf}</div></div>
    <div class="kpi"><div class="kpi-label">Stock Value (Cost)</div><div class="kpi-val gold">${rs(val)}</div></div>`;
}
function renderAdminTable(){
  const sq=(document.getElementById('adminSearch')?.value||'').toLowerCase().trim();
  let list=PRODUCTS;
  if(sq)list=list.filter(p=>(p.name+p.brand+p.cat).toLowerCase().includes(sq));
  document.getElementById('productTableBody').innerHTML=list.map(p=>{
    const sizes=p.sizes?p.sizes.map(s=>'<span style="font-family:\'DM Mono\',monospace;font-size:9px;background:'+(s.stock===0?'var(--border)':'var(--gold-light)')+';color:'+(s.stock===0?'var(--muted)':'var(--amber)')+';padding:2px 5px;border-radius:0;display:inline-block;margin:1px;">'+s.size+':'+(s.stock===0?'✗':s.stock)+'</span>').join(''):'<span style="color:var(--muted);font-size:10px;">No sizes</span>';
    const actBtns=isAdmin()?'<div class="act-btns"><button class="btn-ed" onclick="openEditModal('+p.id+')">✏️ Edit</button><button class="btn-dl" onclick="deleteProduct('+p.id+')">🗑 Delete</button></div>':'<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--muted);">View only</span>';
    return '<tr><td class="td-em">'+p.emoji+'</td><td class="td-name">'+p.name+'</td><td>'+p.brand+'</td><td><span class="badge">'+p.cat+'</span></td><td class="td-mono">'+rs(p.price)+'</td><td class="td-mono" style="color:var(--muted);">'+( p.cost?rs(p.cost):'—')+'</td><td style="max-width:180px;">'+sizes+'</td><td class="td-stk '+(p.stock<=5?'low':'')+'">'+(  p.stock===0?'OUT':p.stock)+'</td><td>'+actBtns+'</td></tr>';
  }).join('');
}

// ── PRODUCT MODAL ──
let modalSizes=[];
function renderEmojiPreview(){const el=document.getElementById('emojiAutoPreview');if(el)el.textContent=selectedEmoji;}
function setEmoji(e){selectedEmoji=e;renderEmojiPreview();}
const CAT_EMOJI_RULES=[
  {kw:['chapal','slipper','flip flop','flip-flop','flipflop','slide','thong','chappal'],emoji:'🩴'},
  {kw:['heel','stiletto','pump','court'],emoji:'👠'},
  {kw:['sandal'],emoji:'👡'},
  {kw:['knee boot','long boot','winter boot','gumboot','gum boot','wellington'],emoji:'👢'},
  {kw:['boot','hiking','hike','trek','mountain','military','combat'],emoji:'🥾'},
  {kw:['ballet','loafer','moccasin','flat','pump shoe'],emoji:'🩰'},
  {kw:['formal','oxford','derby','dress','office','lace up','lace-up','brogue'],emoji:'👞'},
  {kw:['sneaker','running','run','sport','jogger','trainer','casual','canvas','school','walking'],emoji:'👟'},
];
function guessEmojiForCategory(cat){
  const c=(cat||'').toLowerCase().trim();
  if(!c)return null;
  for(const r of CAT_EMOJI_RULES){if(r.kw.some(k=>c.includes(k)))return r.emoji;}
  return null;
}
function autoEmojiFromCategory(){
  const cat=document.getElementById('f-cat').value;
  const guess=guessEmojiForCategory(cat);
  if(guess)setEmoji(guess);
}
function pickCategory(cat){
  document.getElementById('f-cat').value=cat;
  autoEmojiFromCategory();
}
function updateCatDatalist(){const cats=[...new Set(PRODUCTS.map(p=>p.cat))];document.getElementById('catList').innerHTML=cats.map(c=>`<option value="${c}">`).join('');}

function renderSizeRows(){
  const container=document.getElementById('sizeRowsContainer');
  if(!modalSizes.length){
    container.innerHTML=`<div style="padding:16px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);">No sizes yet. Use presets or add manually.</div>`;
    document.getElementById('sizeTotalDisplay').textContent='Total stock: 0 pairs';return;
  }
  container.innerHTML=modalSizes.map((s,i)=>`
    <div style="display:grid;grid-template-columns:1fr 1fr 40px;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);align-items:center;">
      <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;">Size ${s.size}</div>
      <input type="number" min="0" value="${s.stock}" onchange="updateSizeStock(${i},this.value)" oninput="updateSizeStock(${i},this.value)"
        style="padding:5px 8px;border:1.5px solid var(--border);border-radius:0;font-family:'DM Mono',monospace;font-size:12px;outline:none;width:100%;">
      <button onclick="removeSizeRow(${i})" style="background:none;border:none;color:var(--rust);cursor:pointer;font-size:16px;padding:0;text-align:center;">✕</button>
    </div>`).join('');
  const total=modalSizes.reduce((s,r)=>s+(parseInt(r.stock)||0),0);
  document.getElementById('sizeTotalDisplay').textContent=`Total stock: ${total} pairs`;
}
function addSizeRow(){
  const inp=document.getElementById('newSizeInput');const val=inp.value.trim();
  if(!val){showToast('Enter a size first');return;}
  if(modalSizes.find(s=>s.size===val)){showToast(`Size ${val} already added`);return;}
  modalSizes.push({size:val,stock:0});inp.value='';renderSizeRows();
}
function addSizePreset(type){
  const presets={general:['6','7','8','9','10','11','36','37','38','39','40','41','42','43','44','45','46'],kids:['12','13','1','2','3','4','5','28','29','30','31','32','33','34','35'],men:['39','40','41','42','43','44','45','46'],women:['36','37','38','39','40','41']};
  (presets[type]||[]).forEach(s=>{if(!modalSizes.find(x=>x.size===s))modalSizes.push({size:s,stock:0});});renderSizeRows();
}
function updateSizeStock(idx,val){
  modalSizes[idx].stock=Math.max(0,parseInt(val)||0);
  const total=modalSizes.reduce((s,r)=>s+(parseInt(r.stock)||0),0);
  document.getElementById('sizeTotalDisplay').textContent=`Total stock: ${total} pairs`;
}
function removeSizeRow(idx){modalSizes.splice(idx,1);renderSizeRows();}

function openAddModal(){if(!isAdmin()){showToast('Access denied');return;}
  editingId=null;modalSizes=[];
  document.getElementById('modalTitle').textContent='Add New Product';
  ['f-name','f-brand','f-price','f-cost','f-cat'].forEach(id=>document.getElementById(id).value='');
  selectedEmoji='👟';renderEmojiPreview();
  addSizePreset('general');
  document.getElementById('productModal').classList.add('show');
}
function openEditModal(id){if(!isAdmin()){showToast('Access denied');return;}
  const p=PRODUCTS.find(x=>x.id===id);if(!p)return;
  editingId=id;
  document.getElementById('modalTitle').textContent='Edit Product';
  document.getElementById('f-name').value=p.name;document.getElementById('f-brand').value=p.brand;
  document.getElementById('f-price').value=p.price;document.getElementById('f-cost').value=p.cost||'';
  document.getElementById('f-cat').value=p.cat;
  selectedEmoji=p.emoji;renderEmojiPreview();
  modalSizes=p.sizes?JSON.parse(JSON.stringify(p.sizes)):[];renderSizeRows();
  document.getElementById('productModal').classList.add('show');
}
function closeModal(){document.getElementById('productModal').classList.remove('show');}

async function saveProduct(){
  if(!isAdmin()){showToast('Access denied');return;}
  const name=document.getElementById('f-name').value.trim();
  const brand=document.getElementById('f-brand').value.trim();
  const price=parseFloat(document.getElementById('f-price').value);
  const cost=parseFloat(document.getElementById('f-cost').value)||0;
  const cat=document.getElementById('f-cat').value.trim();
  if(!name||!brand||isNaN(price)||!cat){showToast('Please fill all required fields');return;}
  if(!modalSizes.length){showToast('Add at least one size');return;}
  const sizes=modalSizes.map(s=>({size:s.size,stock:parseInt(s.stock)||0}));
  const totalStock=sizes.reduce((s,r)=>s+r.stock,0);
  if(editingId!==null){
    const idx=PRODUCTS.findIndex(p=>p.id===editingId);
    if(idx===-1)return;
    PRODUCTS[idx]={...PRODUCTS[idx],name,brand,price,cost,stock:totalStock,cat,emoji:selectedEmoji,sizes};
    cacheProducts();
    if(dbOnline){
      const p=PRODUCTS[idx];
      showSyncStatus('saving');
      if(p._sid){await sbUpdateOne('products',p._sid,p);}
      else{const saved=await sbInsertOne('products',p);if(saved)PRODUCTS[idx]=saved;cacheProducts();}
      showSyncStatus('online');
    }
    showToast(`${name} updated ✓`);
  }else{
    const newProd={id:nextId(),name,brand,price,cost,stock:totalStock,cat,emoji:selectedEmoji,sizes};
    if(dbOnline){
      showSyncStatus('saving');
      const saved=await sbInsertOne('products',newProd);
      if(saved){newProd._sid=saved._sid;}
      showSyncStatus('online');
    }
    PRODUCTS.push(newProd);
    cacheProducts();
    showToast(`${name} added ✓`);
  }
  updateCatDatalist();closeModal();renderAdminCards();renderAdminTable();renderFilters();renderProducts();
}
function deleteProduct(id){if(!isAdmin()){showToast('Access denied');return;}
  const p=PRODUCTS.find(x=>x.id===id);if(!p)return;
  if(!confirm(`Delete "${p.name}"?\nThis cannot be undone.`))return;
  PRODUCTS=PRODUCTS.filter(x=>x.id!==id);
  cacheProducts();
  if(dbOnline&&p._sid){sbDeleteOne('products',p._sid);}
  renderAdminCards();renderAdminTable();renderFilters();renderProducts();
  showToast(`"${p.name}" deleted`);
}

// ── SIZE PICKER (billing) ──
let sizePickerProduct=null;
function openSizePicker(id){
  const prod=PRODUCTS.find(p=>p.id===id);if(!prod)return;
  if(!prod.sizes||!prod.sizes.length){addToCartDirect(prod,null);return;}
  sizePickerProduct=prod;
  document.getElementById('sizePickerTitle').textContent=prod.emoji+' '+prod.name;
  document.getElementById('sizePickerSub').textContent=prod.brand+' · '+rs(prod.price)+' · Select size';
  document.getElementById('sizePickerGrid').innerHTML=prod.sizes.map(s=>{
    const oos=s.stock<=0;
    const clr=oos?'var(--muted)':s.stock<=3?'var(--rust)':'var(--muted)';
    return '<button onclick="pickSize(\''+s.size+'\')" '+(oos?'disabled':'')+' style="padding:10px 6px;border-radius:0;font-family:\'DM Mono\',monospace;font-size:13px;font-weight:600;border:2px solid '+(oos?'var(--border)':'var(--border)')+';background:'+(oos?'var(--bg)':'var(--card)')+';color:'+(oos?'var(--muted)':'var(--text)')+';cursor:'+(oos?'not-allowed':'pointer')+';transition:all 0.15s;text-align:center;opacity:'+(oos?'0.55':'1')+';"><div>'+s.size+'</div><div style="font-size:9px;color:'+clr+';margin-top:2px;font-weight:400;">'+(oos?'Out':s.stock+' left')+'</div></button>';
  }).join('');
  document.getElementById('sizePickerModal').classList.add('show');
}
function closeSizePicker(){document.getElementById('sizePickerModal').classList.remove('show');sizePickerProduct=null;}
function pickSize(size){if(!sizePickerProduct)return;addToCartDirect(sizePickerProduct,size);closeSizePicker();}
function addToCartDirect(prod,size){
  const key=size?prod.id+'_'+size:''+prod.id;
  const ex=cart.find(i=>i.cartKey===key);
  // Always re-read from live PRODUCTS so maxStock reflects current inventory
  const liveProd=PRODUCTS.find(p=>p.id===prod.id)||prod;
  const sizeObj=size&&liveProd.sizes?liveProd.sizes.find(s=>s.size===size):null;
  const maxStock=sizeObj?sizeObj.stock:liveProd.stock;
  if(maxStock<=0){showToast('Out of stock');return;}
  if(ex){
    if(ex.qty>=maxStock){showToast('Only '+maxStock+' pair'+(maxStock!==1?'s':'')+(size?' of size '+size:'')+' in stock');return;}
    ex.qty++;ex.maxStock=maxStock;
  }else{
    cart.push(Object.assign({},liveProd,{cartKey:key,selectedSize:size,qty:1,maxStock:maxStock}));
  }
  renderCart();renderProducts();showToast(liveProd.emoji+' '+liveProd.name+(size?' — Size '+size:'')+' added');
  if(window.innerWidth<768&&!cartOpen){cartOpen=true;updateCartToggle();}
}


// ── IMPORT MULTIPLE PRODUCTS ──
let importParsedRows=[];

function openImportModal(){if(!isAdmin()){showToast('Access denied');return;}
  importParsedRows=[];
  document.getElementById('importPreviewWrap').style.display='none';
  document.getElementById('importConfirmBtn').style.display='none';
  const wm=document.getElementById('importWarnMsg');if(wm)wm.style.display='none';
  document.getElementById('importFileInput').value='';
  document.getElementById('importPreviewBody').innerHTML='';
  document.getElementById('importModal').classList.add('show');
}
function closeImportModal(){document.getElementById('importModal').classList.remove('show');}

function handleImportFile(file){
  if(!file)return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='csv'){
    const reader=new FileReader();
    reader.onload=e=>parseImportCSV(e.target.result);
    reader.readAsText(file,'UTF-8');
  } else if(ext==='xlsx'||ext==='xls'){
    const reader=new FileReader();
    reader.onload=e=>parseImportXLSX(e.target.result);
    reader.readAsArrayBuffer(file);
  } else {
    showToast('Please upload a .xlsx, .xls, or .csv file');
  }
}

function parseImportCSV(text){
  const lines=text.trim().split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2){showToast('File is empty or has no data rows');return;}
  // skip header row
  const rows=lines.slice(1).map(line=>{
    const cols=line.split(',').map(c=>c.trim().replace(/^"|"$/g,''));
    return {name:cols[0]||'',brand:cols[1]||'',category:cols[2]||'',price:cols[3]||'',cost:cols[4]||'',sizesRaw:cols[5]||''};
  });
  previewImportRows(rows);
}

function parseImportXLSX(buffer){
  // Use SheetJS loaded from CDN
  const script=document.createElement('script');
  script.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload=()=>{
    const wb=XLSX.read(buffer,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    if(data.length<2){showToast('File is empty or has no data rows');return;}
    const rows=data.slice(1).filter(r=>r.some(c=>String(c).trim())).map(r=>({
      name:String(r[0]||'').trim(),
      brand:String(r[1]||'').trim(),
      category:String(r[2]||'').trim(),
      price:String(r[3]||'').trim(),
      cost:String(r[4]||'').trim(),
      sizesRaw:String(r[5]||'').trim()
    }));
    previewImportRows(rows);
  };
  script.onerror=()=>showToast('Could not load Excel parser. Check your internet connection.');
  // Only load once
  if(window.XLSX){
    script.onload();
  } else {
    document.head.appendChild(script);
  }
}

function parseSizesFromString(raw){
  if(!raw||!raw.trim())return[];
  return raw.split(',').map(part=>{
    const[sz,st]=part.trim().split(':');
    return{size:(sz||'').trim(),stock:Math.max(0,parseInt(st)||0)};
  }).filter(s=>s.size);
}

function previewImportRows(rows){
  importParsedRows=rows.map((r,i)=>{
    const errors=[];
    if(!r.name)errors.push('Missing name');
    if(!r.brand)errors.push('Missing brand');
    if(!r.category)errors.push('Missing category');
    const price=parseFloat(r.price);
    if(!r.price||isNaN(price)||price<=0)errors.push('Invalid price');
    const cost=r.cost?parseFloat(r.cost):0;
    const sizes=parseSizesFromString(r.sizesRaw);
    const totalStock=sizes.reduce((s,x)=>s+x.stock,0);
    return{...r,price:isNaN(price)?0:price,cost:isNaN(cost)?0:cost,sizes,totalStock,errors,valid:errors.length===0,rowNum:i+2};
  });

  const validCount=importParsedRows.filter(r=>r.valid).length;
  const errorCount=importParsedRows.filter(r=>!r.valid).length;

  document.getElementById('importPreviewLabel').textContent=`${importParsedRows.length} rows found — ${validCount} valid, ${errorCount} with errors`;
  document.getElementById('importErrorCount').textContent=errorCount?`⚠️ ${errorCount} row(s) will be skipped`:'';
  document.getElementById('importPreviewWrap').style.display='block';
  document.getElementById('importConfirmBtn').style.display=validCount?'block':'none';
  document.getElementById('importWarnMsg').style.display=validCount?'block':'none';
  document.getElementById('importConfirmBtn').textContent=`✅ Import ${validCount} Product${validCount===1?'':'s'}`;

  document.getElementById('importPreviewBody').innerHTML=importParsedRows.map(r=>{
    const statusCell=r.valid
      ?'<span style="color:var(--green);font-size:10px;font-weight:700;">✓ OK</span>'
      :`<span style="color:var(--rust);font-size:10px;" title="${r.errors.join(', ')}">✗ ${r.errors.join(', ')}</span>`;
    const emoji=guessEmojiForCategory(r.category)||'👟';
    const sizePrev=r.sizes.slice(0,4).map(s=>`${s.size}:${s.stock}`).join(' ')+(r.sizes.length>4?` +${r.sizes.length-4}more`:'');
    return`<tr style="${r.valid?'':'opacity:0.5;'}">
      <td style="font-size:10px;color:var(--muted);">R${r.rowNum}</td>
      <td><b>${emoji} ${r.name||'—'}</b></td>
      <td style="font-size:11px;">${r.brand||'—'}</td>
      <td><span class="badge" style="font-size:9px;">${r.category||'—'}</span></td>
      <td class="td-mono">${r.price?rs(r.price):'—'}</td>
      <td class="td-mono" style="color:var(--muted);">${r.cost?rs(r.cost):'—'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);">${sizePrev||'no sizes'}</td>
      <td>${statusCell}</td>
    </tr>`;
  }).join('');
}

async function confirmImport(){
  if(!isAdmin()){showToast('Access denied');return;}
  const valid=importParsedRows.filter(r=>r.valid);
  if(!valid.length)return;
  const btn=document.getElementById('importConfirmBtn');
  btn.disabled=true;
  if(dbOnline)showSyncStatus('saving');

  // ── STEP 1: Delete all existing products ──
  btn.textContent='Clearing old products…';
  if(dbOnline){
    // Delete all from Supabase in one shot using not-null filter on id
    try{
      await fetch(SUPA_URL+'/rest/v1/products?id=gte.0',{method:'DELETE',headers:currentAuthHeaders()});
    }catch(e){
      // fallback: delete one by one
      for(const p of PRODUCTS){if(p._sid)await sbDeleteOne('products',p._sid);}
    }
  }
  // Clear locally
  PRODUCTS=[];
  cacheProducts();

  // ── STEP 2: Insert all new products from Excel ──
  let imported=0;
  for(const r of valid){
    const emoji=guessEmojiForCategory(r.category)||'👟';
    const newProd={
      id:Date.now()+imported,
      name:r.name,brand:r.brand,cat:r.category,
      price:r.price,cost:r.cost,
      emoji,sizes:r.sizes,
      stock:r.totalStock
    };
    if(dbOnline){
      const saved=await sbInsertOne('products',newProd);
      if(saved){newProd._sid=saved._sid;newProd.id=saved.id||newProd.id;}
    }
    PRODUCTS.push(newProd);
    imported++;
    btn.textContent=`Adding products… ${imported}/${valid.length}`;
  }

  cacheProducts();
  if(dbOnline)showSyncStatus('online');
  closeImportModal();
  renderAdminCards();renderAdminTable();renderFilters();renderProducts();updateCatDatalist();
  showToast(`✅ Replaced with ${imported} fresh product${imported===1?'':'s'}`);
}

function downloadImportTemplate(){
  const csv='name,brand,category,price,cost,sizes\nPT 2,LOCAL,Chapal,1300,650,"40:5,41:3,42:2"\n629 BLACK,LOCAL,Sneaker,2499,1500,"39:4,40:6,41:5,42:3"\nD1 BLACK,DARAM,Chapal,900,540,"40:2,41:3,42:1,43:1"';
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='AT_SERVIS_SHOE_import_template.csv';
  a.click();
}

