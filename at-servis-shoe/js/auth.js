/* ══════════════════════════════════════════════════════════
   AT SERVIS SHOE — Billing System
   auth.js — Login/logout, session token handling, brute-force
   lockout, role checks (admin vs sales), top/bottom navigation
   page switching, theme toggle, and app initialization (init()
   is called once by the bootstrap IIFE in script.js).
   Depends on: utils.js (sbClient, sbSessionToken) for Supabase Auth.
   init() calls load(), renderCart(), renderFilters(), etc.
   defined in products.js / cart.js — loaded after this file
   only matters for execution timing, not declaration, since
   all functions are hoisted).
   ══════════════════════════════════════════════════════════ */

// ── AUTH ──
// Real Supabase Auth accounts. Username typed in the login box maps to a
// fixed email (Supabase Auth requires email-style identifiers) plus role
// metadata. This mapping is NOT a secret — the real gate is Supabase Auth's
// password check, not this table. Passwords live only in Supabase now.
const USER_ACCOUNTS={
  admin1:{email:'admin1@atservis.local',role:'sales',displayName:'Sales Staff',roleLabel:'Salesman'},
  admin2:{email:'admin2@atservis.local',role:'admin',displayName:'Administrator',roleLabel:'Admin'}
};
let currentUser=null;

// ── Brute force protection ──
let loginAttempts=0;
let loginLockedUntil=0;

async function doLogin(){
  const now=Date.now();
  if(now<loginLockedUntil){
    const secs=Math.ceil((loginLockedUntil-now)/1000);
    document.getElementById('loginError').textContent='Too many attempts. Try again in '+secs+'s';
    document.getElementById('loginError').style.display='block';
    return;
  }
  const u=(document.getElementById('loginUser').value||'').trim().toLowerCase();
  const p=(document.getElementById('loginPass').value||'');
  const err=document.getElementById('loginError');
  const acc=USER_ACCOUNTS[u];
  if(!acc){
    loginAttempts++;
    err.textContent='❌ Invalid username or password ('+loginAttempts+'/5 attempts)';
    err.style.display='block';
    document.getElementById('loginPass').value='';
    return;
  }
  // Real check happens against Supabase Auth, not a local table
  const{data,error}=await sbClient.auth.signInWithPassword({email:acc.email,password:p});
  if(error||!data.session){
    loginAttempts++;
    if(loginAttempts>=5){
      loginLockedUntil=Date.now()+30000;
      loginAttempts=0;
      err.textContent='Too many failed attempts. Locked for 30 seconds.';
    }else{
      err.textContent='❌ Invalid username or password ('+loginAttempts+'/5 attempts)';
    }
    err.style.display='block';
    document.getElementById('loginPass').value='';
    return;
  }
  loginAttempts=0;loginLockedUntil=0;
  err.style.display='none';
  // Store the real access token — every REST call (sbGet/sbInsertOne/etc)
  // uses this so auth.uid() resolves correctly for RLS.
  sbSessionToken=data.session.access_token;
  sessionStorage.setItem('sc_sb_session',JSON.stringify(data.session));
  currentUser={username:u,role:acc.role,displayName:acc.displayName,roleLabel:acc.roleLabel};
  applyUserSession();
}

async function doLogout(){
  currentUser=null;
  sbSessionToken=null;
  sessionStorage.removeItem('sc_sb_session');
  try{await sbClient.auth.signOut();}catch(e){}
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
  document.getElementById('loginError').style.display='none';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-billing').classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-billing').classList.add('active');
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('bn-billing').classList.add('active');
  document.getElementById('loginScreen').classList.add('show');
  document.getElementById('mainHeader').classList.remove('show');
}

function isAdmin(){return currentUser&&currentUser.role==='admin';}

function applyUserSession(){
  document.getElementById('loginScreen').classList.remove('show');
  document.getElementById('mainHeader').classList.add('show');
  checkAutoExport();
  document.getElementById('userName').textContent=currentUser.displayName;
  document.getElementById('userRole').textContent=currentUser.roleLabel;
  const av=document.getElementById('userAvatar');
  const admin=isAdmin();
  av.textContent=admin?'A':'S';
  av.className='user-avatar '+(admin?'ua-admin':'ua-sales');
  // Top nav tabs
  document.getElementById('tab-billing').style.display='';
  document.getElementById('tab-bills').style.display='';
  document.getElementById('tab-sales').style.display='';
  document.getElementById('tab-expenses').style.display='';
  document.getElementById('tab-returns').style.display='';
  document.getElementById('tab-records').style.display=admin?'':'none';
  document.getElementById('tab-admin').style.display='';
  // Bottom nav
  const bnAdmin=document.getElementById('bn-admin');
  if(bnAdmin)bnAdmin.style.display='';
  // Admin page action buttons — hide for salesman
  const importBtn=document.getElementById('adminImportBtn');
  const addBtn=document.getElementById('adminAddBtn');
  const exportBtn=document.getElementById('adminExportBtn');
  if(importBtn)importBtn.style.display=admin?'':'none';
  if(addBtn)addBtn.style.display=admin?'':'none';
  if(exportBtn)exportBtn.style.display=admin?'':'none';
  // Re-render admin table so edit/delete buttons respect role
  renderAdminCards();renderAdminTable();
}

// ── NAV ──
const PAGE_TITLES={billing:'Billing',bills:'Bills History',sales:'Sales Dashboard',expenses:'Expenses',returns:'Returns',admin:'Products',records:'Records'};
async function switchPage(page,tab,bnKey){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  // ── FIX 17: Update browser tab title ──
  document.title=(PAGE_TITLES[page]||page)+' — AT SERVIS SHOE';
  // Highlight top tab (desktop) — tab may be null when called from bottom nav
  if(tab)tab.classList.add('active');
  else{const t=document.getElementById('tab-'+page);if(t)t.classList.add('active');}
  // Highlight bottom nav item (mobile)
  const key=bnKey||page;
  const bn=document.getElementById('bn-'+key);if(bn)bn.classList.add('active');
  if(page==='admin'){renderAdminCards();renderAdminTable();}
  if(page==='billing'){renderFilters();renderProducts();}
  if(page==='bills'){renderBillsGrid();}
  if(page==='sales'){renderSalesPage();}
  if(page==='records'){renderRecordsPage();}
  if(page==='expenses'){renderExpensesPage();}
  if(page==='returns'){renderReturnsPage();}
  if(page!=='billing'){cartOpen=false;updateCartToggle();}
}

// ── INIT ──
function applyThemeIcon(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const btn=document.getElementById('themeToggleBtn');
  if(btn)btn.textContent=isDark?'☀️':'🌙';
}
function toggleTheme(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  if(isDark){document.documentElement.removeAttribute('data-theme');localStorage.setItem('sc_theme','light');}
  else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('sc_theme','dark');}
  applyThemeIcon();
}
async function init(){
  applyThemeIcon();
  document.getElementById('date-display').textContent=new Date().toLocaleDateString('en-PK',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
  renderEmojiPreview();updateCatDatalist();renderCart();
  const savedSession=sessionStorage.getItem('sc_sb_session');
  if(savedSession){
    try{
      const session=JSON.parse(savedSession);
      // Confirm this session is still valid with Supabase before trusting it
      const{data,error}=await sbClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
      if(!error&&data.session){
        sbSessionToken=data.session.access_token;
        const email=data.session.user.email;
        const match=Object.entries(USER_ACCOUNTS).find(([,a])=>a.email===email);
        if(match){
          const[u,acc]=match;
          currentUser={username:u,role:acc.role,displayName:acc.displayName,roleLabel:acc.roleLabel};
          applyUserSession();
        }
      }else{
        sessionStorage.removeItem('sc_sb_session');
      }
    }catch(e){sessionStorage.removeItem('sc_sb_session');}
  }
  if(window.innerWidth>=900){document.getElementById('cartDrawer').classList.add('open');cartOpen=true;}
  await load();
  newBillNo();renderFilters();renderProducts();
  const ap=document.querySelector('.page.active');
  if(ap){
    if(ap.id==='page-sales')renderSalesPage();
    if(ap.id==='page-admin'){renderAdminCards();renderAdminTable();}
    if(ap.id==='page-returns')renderReturnsPage();
    if(ap.id==='page-expenses')renderExpensesPage();
  }
}
async function newBillNo(){
  // Sync billCount from Supabase to prevent duplicate bill numbers across devices
  if(dbOnline){
    const fresh=await sbGet('sales');
    if(fresh&&fresh.length){
      const maxBill=Math.max(...fresh.map(s=>s.billNo||0));
      if(maxBill>=billCount)billCount=maxBill;
    }
  }
  billCount++;saveBillCount();
  document.getElementById('billNo').textContent=`Bill #SC-${billCount}  ·  ${new Date().toLocaleTimeString()}`;
}

