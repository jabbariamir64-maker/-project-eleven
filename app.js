/* PROJECT ELEVEN Phase 1 - client-side playable MVP.
   Game state is saved locally. This is not yet a server-authoritative online game. */
(function () {
  "use strict";
  const $ = (s, root) => (root || document).querySelector(s);
  const $$ = (s, root) => Array.from((root || document).querySelectorAll(s));
  const STORAGE_KEY = "project-eleven-save-v1";
  const POSITIONS = ["دروازه‌بان","مدافع","مدافع","مدافع","مدافع","هافبک","هافبک","هافبک","هافبک","مهاجم","مهاجم"];
  const FIRST = ["آرمان","سامان","امیرعلی","بردیا","پارسا","محمد","علی","نیما","رادین","آریا","طاها","اشکان","سینا","کیان","مهدی","عرفان","شایان","یاسین","ماهان","ایلیا","کسری","پویا","فرهاد","رامین","بهنام","پیمان","آبتین","نوید","اشکان","سروش","میلاد","یونس"];
  const LAST = ["نوری","محمدی","رضایی","کاظمی","جعفری","کریمی","حیدری","صادقی","موسوی","اکبری","رحیمی","یزدانی","نجفی","مرادی","قاسمی","صالحی","احمدی","رستمی","حسینی","پورمحمدی","نصیری","اسدی","عباسی","زارعی"];
  const CLUBS = ["آذرخش ارومیه","پارس تهران","ستاره شیراز","دریای انزلی","شاهین تبریز","سپهر اصفهان","کویر یزد","البرز کرج"];
  const CRESTS = ["🟢","🔵","⭐","🌊","🦅","⚪","🟠","🟣"];
  const FORMATIONS = {"4-3-3":[[50,9],[18,26],[39,22],[61,22],[82,26],[30,48],[50,43],[70,48],[20,73],[50,81],[80,73]],"4-4-2":[[50,9],[18,26],[39,22],[61,22],[82,26],[18,48],[39,45],[61,45],[82,48],[36,76],[64,76]],"4-2-3-1":[[50,9],[18,26],[39,22],[61,22],[82,26],[39,42],[61,42],[22,62],[50,56],[78,62],[50,80]],"3-5-2":[[50,9],[28,23],[50,21],[72,23],[12,47],[32,43],[50,48],[68,43],[88,47],[36,77],[64,77]]};
  const fmt = n => Math.round(Number(n)||0).toLocaleString("fa-IR");
  const money = n => fmt(n) + " سکه";
  const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function makePlayer(id, clubId, index, youth) {
    const pos = youth ? ["دروازه‌بان","مدافع","هافبک","مهاجم"][rand(0,3)] : POSITIONS[index % POSITIONS.length];
    const age = youth ? rand(17,20) : rand(19,32);
    const overall = youth ? rand(49,66) : rand(55,79);
    return {id, name:FIRST[rand(0,FIRST.length-1)]+" "+LAST[rand(0,LAST.length-1)],clubId,position:pos,age,overall,pace:clamp(overall+rand(-12,12),35,95),shoot:clamp(overall+rand(-12,12),35,95),pass:clamp(overall+rand(-12,12),35,95),defend:clamp(overall+rand(-12,12),35,95),fitness:rand(82,100),morale:rand(65,92),form:rand(0,5),goals:0,assists:0,apps:0,wage:Math.round(overall*10+age*8),value:Math.round(overall*overall*18),contract:rand(1,4),injury:0,number:index+1,history:[]};
  }
  function freshState() {
    let nextId=1;
    const clubs=CLUBS.map((name,i)=>({id:i,name,crest:CRESTS[i],budget:i===0?18000:rand(12000,25000),fans:rand(2500,9000),stadium:1,capacity:15,manager:i===0?"شما":"مربی "+["الف","ب","ج","د","هـ","و","ز"][i-1],reputation:rand(48,73),isUser:i===0,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0}));
    const players=[];
    clubs.forEach(c=>{for(let i=0;i<15;i++) players.push(makePlayer(nextId++,c.id,i,false));});
    const fixtures=[];
    // 8-team double round robin: 7 rounds per half, 56 total fixtures.
    const ids=clubs.map(c=>c.id); const base=ids.slice();
    for(let round=0;round<7;round++){
      for(let i=0;i<4;i++){
        const a=base[i], b=base[7-i];
        fixtures.push({id:fixtures.length+1,round:round+1,home:a,away:b,played:false,homeGoals:null,awayGoals:null,events:[]});
      }
      const last=base.pop(); base.splice(1,0,last);
    }
    const firstHalf=fixtures.slice();
    firstHalf.forEach(f=>fixtures.push({id:fixtures.length+1,round:f.round+7,home:f.away,away:f.home,played:false,homeGoals:null,awayGoals:null,events:[]}));
    return {version:1,clubId:0,season:1,week:1,nextId,clubs,players,fixtures,formation:"4-3-3",tactics:{style:"متعادل",pressing:55,tempo:55},logs:["به PROJECT ELEVEN خوش آمدید. اولین فصل شما آماده شروع است."],history:[],predictions:{},lastMatch:null,market:[],achievements:[],createdAt:Date.now()};
  }
  function validateState(s) {
    if(!s||!Array.isArray(s.clubs)||!Array.isArray(s.players)||!Array.isArray(s.fixtures)||!s.clubs.length) throw new Error("ذخیره بازی معتبر نیست");
    if(!s.clubs.some(c=>c.id===s.clubId)) s.clubId=s.clubs[0].id;
    s.clubs.forEach(c=>{c.capacity=Number(c.capacity)||15;c.budget=Number(c.budget)||0;});
    return s;
  }
  function loadState() {
    try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) return validateState(JSON.parse(raw)); } catch(e){ console.warn("Save load failed",e); }
    return freshState();
  }
  let state=loadState(), currentView="dashboard";
  const userClub=()=>state.clubs.find(c=>c.id===state.clubId);
  const clubById=id=>state.clubs.find(c=>c.id===id);
  const squad=(id)=>state.players.filter(p=>p.clubId===id);
  const userSquad=()=>squad(state.clubId);
  const playerById=id=>state.players.find(p=>p.id===Number(id));
  function save(showToast) {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); if(showToast) toast("بازی با موفقیت ذخیره شد"); } catch(e){toast("ذخیره انجام نشد؛ فضای مرورگر را بررسی کنید");}
    updateShell();
  }
  function toast(message) { const el=document.createElement("div");el.className="toast";el.textContent=message;$("#toast-region").appendChild(el);setTimeout(()=>el.remove(),3300); }
  function addLog(message){state.logs.unshift({text:message,week:state.week,season:state.season});state.logs=state.logs.slice(0,40);}
  function changeView(view) {currentView=view; $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); render(); const side=$(".sidebar");if(side)side.classList.remove("open");}
  const titles={dashboard:"داشبورد باشگاه",squad:"ترکیب تیم",market:"بازار نقل‌وانتقالات",tactics:"تاکتیک و تمرین",fixtures:"مسابقات و جدول",finance:"اقتصاد باشگاه",history:"آمار و افتخارات"};
  function updateShell() {
    const c=userClub(); if(!c)return;
    $("#sidebar-club").innerHTML="<strong>"+escapeHtml(c.crest+" "+c.name)+"</strong><span>سرمربی: "+escapeHtml(c.manager)+"</span><div class='mini-rating'><span>قدرت تیم</span><b>"+fmt(teamRating(c.id))+"</b></div>";
    $("#top-eyebrow").textContent="فصل "+fmt(state.season)+" · هفته "+fmt(state.week);
    $("#top-season").textContent="فصل "+fmt(state.season);
    $("#page-title").textContent=titles[currentView]||"PROJECT ELEVEN";
  }
  function teamRating(id){const s=squad(id);return s.length?Math.round(s.reduce((a,p)=>a+p.overall,0)/s.length):0;}
  function statCard(label,value,foot,cls){return "<div class='stat-card'><div class='stat-label'>"+label+"</div><div class='stat-value "+(cls||"")+"'>"+value+"</div><div class='stat-foot'>"+foot+"</div></div>";}
  function panel(title,body,meta){return "<section class='panel'><div class='panel-head'><h3>"+title+"</h3>"+(meta?"<small>"+meta+"</small>":"")+"</div>"+body+"</section>";}
  function button(label,action,cls,attrs){return "<button class='btn "+(cls||"btn-secondary")+"' data-action='"+action+"' "+(attrs||"")+">"+label+"</button>";}
  function render(){updateShell();const root=$("#app-view");if(currentView==="dashboard")root.innerHTML=dashboardView();else if(currentView==="squad")root.innerHTML=squadView();else if(currentView==="market")root.innerHTML=marketView();else if(currentView==="tactics")root.innerHTML=tacticsView();else if(currentView==="fixtures")root.innerHTML=fixturesView();else if(currentView==="finance")root.innerHTML=financeView();else if(currentView==="history")root.innerHTML=historyView();else root.innerHTML=dashboardView();}
  function nextFixture(){return state.fixtures.find(f=>!f.played&& (f.home===state.clubId||f.away===state.clubId));}
  function fixtureMarkup(f){const h=clubById(f.home),a=clubById(f.away);return "<div class='fixture-card "+(f.played?"played":(f.id===nextFixture()?.id?"next":""))+"'><div class='fixture-side'><span class='avatar'>"+h.crest+"</span><span>"+escapeHtml(h.name)+"</span></div><div class='fixture-score'>"+(f.played?fmt(f.homeGoals)+" - "+fmt(f.awayGoals):"VS")+"<small>"+(f.played?"پایان مسابقه":"هفته "+fmt(f.round))+"</small></div><div class='fixture-side'><span>"+escapeHtml(a.name)+"</span><span class='avatar'>"+a.crest+"</span></div></div>";}
  function dashboardView(){
    const c=userClub(),s=userSquad(),next=nextFixture(),played=state.fixtures.filter(f=>f.played&&(f.home===c.id||f.away===c.id)).length;
    const wages=s.reduce((a,p)=>a+p.wage,0);
    let match="<div class='notice'>همه مسابقات این فصل انجام شده‌اند. فصل را از صفحه مسابقات جلو ببرید.</div>"; if(next) match="<div class='match-feature'><div class='team-name'><div class='team-crest'>"+clubById(next.home).crest+"</div>"+escapeHtml(clubById(next.home).name)+"</div><div class='score-box'><strong>VS</strong><small>هفته "+fmt(next.round)+"</small></div><div class='team-name'><div class='team-crest'>"+clubById(next.away).crest+"</div>"+escapeHtml(clubById(next.away).name)+"</div></div><div style='margin-top:13px'>"+button("شبیه‌سازی مسابقه","play-match","btn-primary")+" <span class='muted' style='font-size:10px;margin-right:8px'>مسابقه بعدی فصل</span></div>";
    const logs=state.logs.slice(0,5).map(l=>"<div class='list-row'><div class='row-main'><span class='avatar'>✦</span><div><strong>"+escapeHtml(typeof l==="string"?l:l.text)+"</strong><small>"+(typeof l==="string"?"خبر باشگاه":"فصل "+fmt(state.season)+" · هفته "+fmt(l.week))+"</small></div></div></div>").join("")||"<div class='empty-state'>هنوز خبری ثبت نشده است.</div>";
    return "<section class='hero'><div class='hero-content'><div class='hero-kicker'>✦ به دنیای فوتبال خوش آمدی</div><h2>باشگاهت را به اوج برسان</h2><p>تیم را مدیریت کن، استعداد پیدا کن، قرارداد ببند و با تصمیم‌های هوشمندانه قهرمان لیگ شو. هر تصمیم تو روی آینده باشگاه اثر می‌گذارد.</p>"+button("رفتن به ترکیب تیم","go-squad","btn-primary")+" "+button("بازار بازیکنان","go-market","btn-secondary")+"</div><div class='hero-badge'>"+c.crest+"</div></section>"+
    "<div class='stats-grid'>"+statCard("بودجه باشگاه",money(c.budget),"موجودی قابل‌استفاده",c.budget<3000?"negative":"")+" "+statCard("قدرت تیم",fmt(teamRating(c.id))+"/100","میانگین امتیاز بازیکنان","positive")+" "+statCard("رتبه لیگ",fmt(leagueTable().findIndex(x=>x.id===c.id)+1),"از ۸ باشگاه","")+" "+statCard("بازیکنان ثبت‌شده",fmt(s.length)+" / "+fmt(c.capacity),"ظرفیت فهرست","")+"</div>"+
    "<div class='grid-2'>"+panel("مسابقه بعدی",match,"هفته "+fmt(state.week))+panel("وضعیت تیم","<div class='list'><div class='list-row'><span>تعداد بازیکنان</span><b>"+fmt(s.length)+" / "+fmt(c.capacity)+"</b></div><div class='list-row'><span>میانگین آمادگی</span><b>"+fmt(s.length?Math.round(s.reduce((a,p)=>a+p.fitness,0)/s.length):0)+"٪</b></div><div class='list-row'><span>دستمزد هفتگی</span><b>"+money(wages)+"</b></div><div class='list-row'><span>مسابقات انجام‌شده</span><b>"+fmt(played)+" / 14</b></div><div class='list-row'><span>هواداران</span><b>"+fmt(c.fans)+"</b></div></div>","گزارش مدیریتی")+"</div>"+
    "<div class='grid-2'>"+panel("آخرین اخبار باشگاه", "<div class='list'>"+logs+"</div>", "رویدادهای اخیر")+panel("جدول لیگ",tableMarkup(leagueTable().slice(0,5)),"۵ تیم برتر")+"</div>";
  }
  function playerCard(p){return "<article class='player-card'><div class='player-top'><div class='player-face'>"+(p.position==="دروازه‌بان"?"🧤":p.position==="مهاجم"?"⚽":p.position==="هافبک"?"🎯":"🛡️")+"</div><div class='player-name'><strong>"+escapeHtml(p.name)+"</strong><small>"+escapeHtml(p.position)+" · "+fmt(p.age)+" سال · شماره "+fmt(p.number)+"</small></div><div class='rating'>"+fmt(p.overall)+"<small>قدرت</small></div></div><div class='player-attrs'><div class='attr'><strong>"+fmt(p.pace)+"</strong><small>سرعت</small></div><div class='attr'><strong>"+fmt(p.pass)+"</strong><small>پاس</small></div><div class='attr'><strong>"+fmt(p.shoot)+"</strong><small>شوت</small></div></div><div class='metric-line'><span>آمادگی جسمانی</span><b>"+fmt(p.fitness)+"٪</b></div><div class='progress'><span style='width:"+p.fitness+"%'></span></div><div class='player-footer'><small>ارزش: "+money(p.value)+"</small><button class='btn btn-secondary btn-small' data-action='player-details' data-id='"+p.id+"'>جزئیات</button></div></article>";}
  function squadView(){
    const s=userSquad(),c=userClub();
    return "<div class='toolbar'><h2>فهرست بازیکنان <span class='pill'>"+fmt(s.length)+" / "+fmt(c.capacity)+"</span></h2><div class='toolbar-controls'><input id='player-search' class='field' placeholder='جست‌وجوی بازیکن...' /><select id='position-filter' class='select'><option value='all'>همه پست‌ها</option><option>دروازه‌بان</option><option>مدافع</option><option>هافبک</option><option>مهاجم</option></select><select id='player-sort' class='select'><option value='overall'>قدرت: بیشترین</option><option value='age'>سن: کمترین</option><option value='value'>ارزش: بیشترین</option></select></div></div><div class='notice' style='margin-bottom:15px'>قانون فهرست: حداکثر "+fmt(c.capacity)+" بازیکن. فروش بازیکن پول وارد باشگاه می‌کند؛ آزاد کردن بازیکن رایگان است و هیچ درآمد انتقالی ندارد.</div><div id='player-grid' class='player-grid'>"+s.sort((a,b)=>b.overall-a.overall).map(playerCard).join("")+"</div>";
  }
  function marketView(){
    const c=userClub(),free=state.players.filter(p=>p.clubId!==c.id);
    const list=free.slice().sort((a,b)=>b.overall-a.overall).map(p=>"<div class='list-row'><div class='row-main'><span class='avatar'>"+(p.position==="مهاجم"?"⚽":"♙")+"</span><div><strong>"+escapeHtml(p.name)+"</strong><small>"+escapeHtml(p.clubId===-1?"بازیکن آزاد":clubById(p.clubId).name)+" · "+escapeHtml(p.position)+" · سن "+fmt(p.age)+"</small></div></div><div style='text-align:left'><b style='display:block;font-size:12px'>"+money(p.value)+"</b><small class='muted'>قدرت "+fmt(p.overall)+"</small><div style='margin-top:7px'>"+button(p.clubId===-1?"جذب":"خرید",p.clubId===-1?"sign-free":"buy-player","btn-primary btn-small","data-id='"+p.id+"'")+"</div></div></div>").join("");
    return "<div class='toolbar'><h2>بازار نقل‌وانتقالات</h2><div class='toolbar-controls'><input id='market-search' class='field' placeholder='نام بازیکن...' /><select id='market-position' class='select'><option value='all'>همه پست‌ها</option><option>دروازه‌بان</option><option>مدافع</option><option>هافبک</option><option>مهاجم</option></select></div></div><div class='stats-grid'>"+statCard("بودجه",money(c.budget),"بودجه فعلی","positive")+statCard("جای خالی",fmt(Math.max(0,c.capacity-squad(c.id).length)),"ظرفیت فهرست","")+statCard("بازیکنان قابل‌خرید",fmt(free.length),"از سایر باشگاه‌ها","")+statCard("پنجره نقل‌وانتقالات","باز","نسخه آزمایشی","positive")+"</div><div class='grid-2'><div>"+panel("بازیکنان در دسترس","<div id='market-list' class='list'>"+list+"</div>","برای خرید بودجه و جای خالی لازم است")+"</div><div>"+panel("قوانین بازار","<div class='list'><div class='list-row'><span>حداکثر فهرست</span><b>"+fmt(c.capacity)+" بازیکن</b></div><div class='list-row'><span>خرید بازیکن</span><b>کسر از بودجه</b></div><div class='list-row'><span>فروش بازیکن</span><b class='positive'>افزایش بودجه</b></div><div class='list-row'><span>آزادسازی بازیکن</span><b>۰ درآمد انتقالی</b></div></div><p class='muted' style='font-size:11px;line-height:2'>در این نسخه، نقل‌وانتقالات بین باشگاه‌های بازی انجام می‌شود. مذاکره کامل قرارداد و بازار آنلاین در مراحل بعدی توسعه می‌آیند.</p>","مدیریت منصفانه")+"</div></div>";
  }
  function tacticsView(){
    const s=userSquad(),formation=FORMATIONS[state.formation]||FORMATIONS["4-3-3"],selected=s.slice().sort((a,b)=>b.overall-a.overall).slice(0,11);
    const pitch=formation.map((xy,i)=>{const p=selected[i];return "<div class='formation-player' style='left:"+xy[0]+"%;top:"+xy[1]+"%'><div class='shirt'>"+(p?fmt(p.overall):"—")+"</div><small>"+escapeHtml(p?p.name.split(" ")[0]:"خالی")+"</small></div>";}).join("");
    return "<div class='toolbar'><h2>تاکتیک و تمرین</h2><div class='toolbar-controls'><select id='formation-select' class='select'>"+Object.keys(FORMATIONS).map(f=>"<option "+(f===state.formation?"selected":"")+">"+f+"</option>").join("")+"</select><select id='style-select' class='select'>"+["متعادل","هجومی","دفاعی","پرس شدید"].map(f=>"<option "+(state.tactics.style===f?"selected":"")+">"+f+"</option>").join("")+"</select></div></div><div class='grid-2'><div>"+panel("چیدمان زمین","<div class='pitch'><div class='pitch-box top'></div><div class='pitch-box bottom'></div>"+pitch+"</div><p class='muted' style='font-size:10px;line-height:1.9'>ترکیب نمایشی بر اساس ۱۱ بازیکن برتر ساخته شده است؛ انتخاب دقیق بازیکنان و تعویض‌ها در فاز بعدی اضافه می‌شود.</p>","آرایش "+state.formation)+"</div><div>"+panel("برنامه تمرینی","<div class='notice'>تمرین آمادگی جسمانی باعث افزایش آمادگی بازیکنان می‌شود. تمرین فنی می‌تواند به رشد مهارت کمک کند؛ تمرین سنگین، خستگی بیشتری ایجاد می‌کند.</div><div class='list section-gap'><div class='list-row'><div><strong>تمرین آمادگی</strong><small>افزایش آمادگی · بدون هزینه</small></div>"+button("شروع","train-fitness","btn-primary btn-small")+"</div><div class='list-row'><div><strong>تمرین فنی</strong><small>شانس رشد مهارت · خستگی متوسط</small></div>"+button("شروع","train-technical","btn-primary btn-small")+"</div><div class='list-row'><div><strong>ریکاوری</strong><small>بازگرداندن انرژی تیم</small></div>"+button("ریکاوری","recover","btn-secondary btn-small")+"</div></div>","تمرین هفتگی")+panel("دستور تیم","<div class='metric-line'><span>شدت پرس</span><b id='press-value'>"+fmt(state.tactics.pressing)+"٪</b></div><input id='press-slider' type='range' min='20' max='90' value='"+state.tactics.pressing+"' style='width:100%;accent-color:var(--green)'><div class='metric-line'><span>سرعت بازی</span><b id='tempo-value'>"+fmt(state.tactics.tempo)+"٪</b></div><input id='tempo-slider' type='range' min='20' max='90' value='"+state.tactics.tempo+"' style='width:100%;accent-color:var(--green)'><p class='muted' style='font-size:10px;line-height:1.8'>پرس و سرعت بالاتر می‌تواند بر شبیه‌سازی مسابقه اثر بگذارد و خستگی را بیشتر کند.</p>","تصمیم‌های تاکتیکی")+"</div></div>";
  }
  function leagueTable(){
    return state.clubs.map(c=>({...c,gd:c.gf-c.ga,played:state.fixtures.filter(f=>f.played&&(f.home===c.id||f.away===c.id)).length})).sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
  }
  function tableMarkup(rows){return "<div class='table-wrap'><table><thead><tr><th>#</th><th>باشگاه</th><th>بازی</th><th>برد</th><th>مساوی</th><th>باخت</th><th>تفاضل</th><th>امتیاز</th></tr></thead><tbody>"+rows.map((c,i)=>"<tr class='"+(c.id===state.clubId?"user-row":"")+"'><td><span class='rank'>"+fmt(i+1)+"</span></td><td><span class='table-team'><span class='team-dot' style='background:"+(c.id===state.clubId?"var(--green)":"var(--blue)")+"'></span>"+escapeHtml(c.name)+"</span></td><td>"+fmt(c.played)+"</td><td>"+fmt(c.wins)+"</td><td>"+fmt(c.draws)+"</td><td>"+fmt(c.losses)+"</td><td>"+(c.gf-c.ga>0?"+":"")+fmt(c.gf-c.ga)+"</td><td><b>"+fmt(c.points)+"</b></td></tr>").join("")+"</tbody></table></div>";}
  function fixturesView(){
    const userFixtures=state.fixtures.filter(f=>f.home===state.clubId||f.away===state.clubId).sort((a,b)=>a.round-b.round);
    const upcoming=userFixtures.filter(f=>!f.played),played=userFixtures.filter(f=>f.played);
    return "<div class='toolbar'><h2>مسابقات و جدول لیگ</h2><div class='toolbar-controls'>"+button("شبیه‌سازی هفته جاری","play-week","btn-primary")+" "+button("پایان فصل / فصل بعد","next-season","btn-secondary")+"</div></div><div class='stats-grid'>"+statCard("بازی‌های انجام‌شده",fmt(played.length)+" / 14","لیگ رفت‌وبرگشت","")+statCard("امتیاز لیگ",fmt(userClub().points),"۳ برد = ۹ امتیاز","positive")+statCard("گل زده",fmt(userClub().gf),"در مسابقات لیگ","")+statCard("تفاضل گل",(userClub().gf-userClub().ga>0?"+":"")+fmt(userClub().gf-userClub().ga),"گل زده منهای خورده","")+"</div><div class='grid-2'><div>"+panel("جدول رده‌بندی",tableMarkup(leagueTable()),"برد ۳ · مساوی ۱ · باخت ۰")+"</div><div>"+panel("مسابقات باشگاه","<div>"+(upcoming.slice(0,4).map(fixtureMarkup).join("")||"<div class='empty-state'>بازی باقی نمانده است.</div>")+"</div><div class='section-gap'><h3 style='font-size:13px;margin-bottom:12px'>نتایج اخیر</h3>"+(played.slice(-3).reverse().map(fixtureMarkup).join("")||"<div class='empty-state'>هنوز مسابقه‌ای انجام نشده.</div>")+"</div>","۱۴ بازی برای هر تیم")+"</div></div><div class='notice'>ساختار لیگ: ۸ تیم، ۱۴ مسابقه برای هر تیم، ۵۶ مسابقه در کل. در این نسخه مسابقات با اقدام کاربر پردازش می‌شوند؛ زمان‌بندی خودکار هنگام آفلاین‌بودن و مسابقات سروری در فاز آنلاین پیاده‌سازی می‌شوند.</div>";
  }
  function financeView(){
    const c=userClub(),s=userSquad(),wages=s.reduce((a,p)=>a+p.wage,0);
    return "<div class='toolbar'><h2>اقتصاد باشگاه</h2><div class='toolbar-controls'>"+button("ارتقای ورزشگاه","upgrade-stadium","btn-primary")+" "+button("گزارش دستمزد","wage-report","btn-secondary")+"</div></div><div class='stats-grid'>"+statCard("بودجه فعلی",money(c.budget),"قابل استفاده","positive")+statCard("دستمزد هفتگی",money(wages),"مجموع قرارداد بازیکنان","")+statCard("درآمد هواداری",money(c.fans*2),"درآمد فرضی هر هفته","")+statCard("ورزشگاه", "سطح "+fmt(c.stadium), "ظرفیت پایه "+fmt(10000*c.stadium),"")+"</div><div class='grid-2'><div>"+panel("نمای کلی مالی","<div class='finance-bar'><div class='finance-box'><small>هزینه تقریبی دستمزد</small><strong>"+money(wages)+"</strong><small>در هر هفته</small></div><div class='finance-box'><small>درآمد پایه هواداری</small><strong>"+money(c.fans*2)+"</strong><small>در هر هفته</small></div></div><div class='section-gap notice warning'>اقتصاد این نسخه ساده‌سازی شده است. قبل از پایان فصل، بودجه را برای خرید بازیکنان و ارتقای ورزشگاه مدیریت کن.</div>","مدیریت هزینه‌ها")+"</div><div>"+panel("ارتقای ورزشگاه","<div class='row-main'><span class='avatar'>🏟️</span><div><strong>ورزشگاه سطح "+fmt(c.stadium)+"</strong><small>هزینه ارتقا: "+money(c.stadium*5000)+"</small></div></div><p class='muted' style='font-size:11px;line-height:1.9'>هر ارتقا ظرفیت و درآمد احتمالی هواداری را افزایش می‌دهد. ارتقا بلافاصله از بودجه کم می‌کند.</p>"+button("ارتقا به سطح بعد","upgrade-stadium","btn-primary")+"<div class='section-gap'><div class='metric-line'><span>سطح ورزشگاه</span><b>"+fmt(c.stadium)+" / 5</b></div><div class='progress'><span style='width:"+(c.stadium/5*100)+"%'></span></div></div>","ساخت زیرساخت")+"</div></div>";
  }
  function historyView(){
    const c=userClub(),s=userSquad(),matches=state.fixtures.filter(f=>f.played&&(f.home===c.id||f.away===c.id)),goals=s.reduce((a,p)=>a+p.goals,0),top=[...s].sort((a,b)=>b.goals-a.goals).slice(0,5);
    return "<div class='toolbar'><h2>آمار و افتخارات</h2><span class='pill'>فصل "+fmt(state.season)+"</span></div><div class='history-grid'><div class='history-tile'><small>مسابقات</small><strong>"+fmt(matches.length)+"</strong><small>از ۱۴ بازی</small></div><div class='history-tile'><small>گل‌های بازیکنان</small><strong>"+fmt(goals)+"</strong><small>آمار ثبت‌شده بازیکنان</small></div><div class='history-tile'><small>امتیاز لیگ</small><strong>"+fmt(c.points)+"</strong><small>فصل جاری</small></div><div class='history-tile'><small>هواداران</small><strong>"+fmt(c.fans)+"</strong><small>پایگاه هواداری</small></div><div class='history-tile'><small>قهرمانی‌ها</small><strong>"+fmt(state.history.filter(h=>h.champion===c.id).length)+"</strong><small>ثبت‌شده در تاریخچه</small></div><div class='history-tile'><small>فصل جاری</small><strong>"+fmt(state.season)+"</strong><small>فصل‌های آغازشده</small></div></div><div class='grid-2 section-gap'>"+panel("بهترین گلزنان","<div class='list'>"+top.map((p,i)=>"<div class='list-row'><div class='row-main'><span class='rank'>"+fmt(i+1)+"</span><div><strong>"+escapeHtml(p.name)+"</strong><small>"+escapeHtml(p.position)+"</small></div></div><b>"+fmt(p.goals)+" گل</b></div>").join("")+"</div>","آمار فصل")+panel("دستاوردها","<div class='list'><div class='list-row'><span>اولین مسابقه</span><b class='"+(matches.length?"positive":"")+"'>"+(matches.length?"ثبت شد":"قفل")+"</b></div><div class='list-row'><span>فهرست کامل</span><b class='"+(s.length===c.capacity?"positive":"")+"'>"+fmt(s.length)+" / "+fmt(c.capacity)+"</b></div><div class='list-row'><span>قدرت تیم بالای ۷۰</span><b class='"+(teamRating(c.id)>=70?"positive":"")+"'>"+(teamRating(c.id)>=70?"باز شده":"در دسترس نیست")+"</b></div><div class='list-row'><span>قهرمانی لیگ</span><b>"+fmt(state.history.filter(h=>h.champion===c.id).length)+"</b></div></div>","افتخارات باشگاه")+"</div>";
  }
  function simulateFixture(f,forceAI){
    if(!f||f.played)return false;
    const home=clubById(f.home),away=clubById(f.away);
    const hr=teamRating(home.id), ar=teamRating(away.id);
    const homeBoost=home.id===state.clubId?0.06:0.12;
    const awayBoost=away.id===state.clubId?0.04:0;
    const tactical=home.id===state.clubId?(state.tactics.tempo-50)/1000:0;
    const hg=clamp(Math.round(rand(0,3)+(hr-ar)/27+homeBoost*2+tactical),0,6);
    const ag=clamp(Math.round(rand(0,3)+(ar-hr)/30-awayBoost),0,6);
    f.homeGoals=hg;f.awayGoals=ag;f.played=true;f.events=[];
    const goalEvents=[];
    for(let i=0;i<hg;i++){const minute=rand(3,90);goalEvents.push({minute,text:"گل "+home.name+" در دقیقه "+minute});}
    for(let i=0;i<ag;i++){const minute=rand(3,90);goalEvents.push({minute,text:"گل "+away.name+" در دقیقه "+minute});}
    f.events=goalEvents.sort((a,b)=>a.minute-b.minute);
    home.played++;away.played++;home.gf+=hg;home.ga+=ag;away.gf+=ag;away.ga+=hg;
    if(hg>ag){home.wins++;home.points+=3;away.losses++;}else if(ag>hg){away.wins++;away.points+=3;home.losses++;}else{home.draws++;away.draws++;home.points++;away.points++;}
    // Basic player stats for the user's side; each goal is assigned to a plausible attacker.
    [[home,hg],[away,ag]].forEach(pair=>{const club=pair[0],goals=pair[1],players=squad(club.id);players.forEach(p=>{p.fitness=clamp(p.fitness-rand(3,8),20,100);p.apps++;p.form=clamp(p.form+(goals>0?1:0),0,10);});for(let i=0;i<goals;i++){const attackers=players.filter(p=>p.position==="مهاجم"||p.position==="هافبک");const scorer=attackers[rand(0,Math.max(0,attackers.length-1))]||players[0];if(scorer){scorer.goals++;scorer.morale=clamp(scorer.morale+2,0,100);}}});
    const resultText=home.name+" "+hg+" - "+ag+" "+away.name;
    state.lastMatch={fixtureId:f.id,home:f.home,away:f.away,homeGoals:hg,awayGoals:ag,events:f.events.slice()};
    addLog("نتیجه: "+resultText);
    if(!forceAI && (home.id===state.clubId||away.id===state.clubId))toast("پایان مسابقه: "+hg+" - "+ag);
    return true;
  }
  function simulateRound(round){
    const fs=state.fixtures.filter(f=>f.round===round&&!f.played);
    if(!fs.length){toast("برای این هفته مسابقه پردازش‌نشده‌ای وجود ندارد");return;}
    fs.forEach(f=>simulateFixture(f,true));
    state.week=Math.min(14,round+1);
    save(false);render();toast("مسابقات هفته "+fmt(round)+" پردازش شد");
  }
  function playNext(){
    const f=nextFixture();if(!f){toast("بازی باقی نمانده؛ از صفحه مسابقات فصل بعد را شروع کن");return;}
    // Simulate all unplayed fixtures in this round so league standings stay coherent.
    const round=f.round;state.fixtures.filter(x=>x.round===round&&!x.played).forEach(x=>simulateFixture(x,true));
    state.week=Math.min(14,round+1);save(false);render();openMatchResult(f.id);
  }
  function openMatchResult(id){
    const f=state.fixtures.find(x=>x.id===Number(id));if(!f)return;
    const events=f.events.map(e=>"<div class='list-row'><span>⚽ "+escapeHtml(e.text)+"</span><small class='muted'>دقیقه "+fmt(e.minute)+"</small></div>").join("")||"<div class='empty-state'>گل ثبت نشد؛ بازی بدون گل به پایان رسید.</div>";
    modal("گزارش مسابقه","<div class='match-feature'><div class='team-name'><div class='team-crest'>"+clubById(f.home).crest+"</div>"+escapeHtml(clubById(f.home).name)+"</div><div class='score-box'><strong>"+fmt(f.homeGoals)+" - "+fmt(f.awayGoals)+"</strong><small>نتیجه نهایی</small></div><div class='team-name'><div class='team-crest'>"+clubById(f.away).crest+"</div>"+escapeHtml(clubById(f.away).name)+"</div></div><div class='section-gap list'>"+events+"</div><p>نتیجه در جدول لیگ و آمار باشگاه ثبت شد.</p>",[{label:"ادامه",action:"close-modal",cls:"btn-primary"},{label:"دیدن جدول",action:"modal-fixtures",cls:"btn-secondary"}]);
  }
  function modal(title,body,actions){
    $("#modal-root").innerHTML="<div class='modal-backdrop' data-action='backdrop-close'><div class='modal' role='dialog' aria-modal='true'><h3>"+title+"</h3>"+body+"<div class='modal-actions'>"+actions.map(a=>button(a.label,a.action,a.cls||"btn-secondary",a.attrs||"")).join("")+"</div></div></div>";
  }
  function closeModal(){$("#modal-root").innerHTML="";}
  function confirmAction(title,body,yesAction,yesLabel){modal(title,"<p>"+body+"</p>",[{label:"انصراف",action:"close-modal"},{label:yesLabel||"تأیید",action:yesAction,cls:"btn-primary"}]);}
  function buyPlayer(id){
    const p=playerById(id),c=userClub();if(!p||p.clubId===c.id)return;
    if(p.clubId===-1){signFree(id);return;}
    if(squad(c.id).length>=c.capacity){toast("فهرست کامل است؛ اول یک بازیکن بفروش یا آزاد کن");return;}
    if(c.budget<p.value){toast("بودجه برای خرید این بازیکن کافی نیست");return;}
    const old=clubById(p.clubId);if(squad(old.id).length<=11){toast("این باشگاه برای حفظ حداقل ۱۱ بازیکن نمی‌تواند او را بفروشد");return;}
    const price=p.value;c.budget-=price;old.budget+=price;p.clubId=c.id;p.history.push({from:old.name,to:c.name,season:state.season});p.contract=2;addLog("خرید "+p.name+" از "+old.name+" با مبلغ "+money(price));save(false);render();toast("بازیکن با موفقیت خریداری شد");
  }
  function sellPlayer(id){
    const p=playerById(id),c=userClub();if(!p||p.clubId!==c.id)return;
    if(squad(c.id).length<=11){toast("حداقل ۱۱ بازیکن باید در فهرست باقی بمانند");return;}
    const offers=state.clubs.filter(x=>x.id!==c.id&&squad(x.id).length<x.capacity);
    if(!offers.length){toast("هیچ باشگاه دیگری ظرفیت خالی ندارد");return;}
    const target=offers.sort((a,b)=>a.budget-b.budget).pop();const fee=Math.round(p.value*rand(85,115)/100);
    confirmAction("فروش بازیکن","بازیکن "+escapeHtml(p.name)+" به "+escapeHtml(target.name)+" فروخته می‌شود. مبلغ انتقال "+money(fee)+" است. ادامه می‌دهی؟","confirm-sell-"+p.id,"تأیید فروش");
    state.pendingSell={playerId:p.id,targetId:target.id,fee};
  }
  function releasePlayer(id){
    const p=playerById(id),c=userClub();if(!p||p.clubId!==c.id)return;
    if(squad(c.id).length<=11){toast("حداقل ۱۱ بازیکن باید در فهرست باقی بمانند");return;}
    confirmAction("آزادسازی بازیکن","بازیکن "+escapeHtml(p.name)+" آزاد می‌شود. باشگاه هیچ درآمد انتقالی دریافت نمی‌کند و هزینه آزادسازی نیز در این نسخه صفر است.","confirm-release-"+p.id,"آزاد کردن بازیکن");
  }
  function processRelease(id){const p=playerById(id),c=userClub();if(!p||p.clubId!==c.id)return;p.clubId=-1;p.history.push({from:c.name,to:"بازیکن آزاد",season:state.season});addLog("بازیکن "+p.name+" آزاد شد؛ درآمد انتقالی: صفر");save(false);closeModal();render();toast("بازیکن آزاد شد؛ هیچ پولی دریافت نشد");}
  function processSell(id){const pend=state.pendingSell,p=playerById(id);if(!pend||!p||p.id!==id)return;const target=clubById(pend.targetId),c=userClub();if(squad(c.id).length<=11||squad(target.id).length>=target.capacity){toast("شرایط انتقال تغییر کرده؛ دوباره بررسی کن");closeModal();return;}p.clubId=target.id;c.budget+=pend.fee;target.budget-=pend.fee;p.history.push({from:c.name,to:target.name,season:state.season});addLog("فروش "+p.name+" به "+target.name+"؛ درآمد "+money(pend.fee));state.pendingSell=null;save(false);closeModal();render();toast("فروش انجام شد؛ "+money(pend.fee)+" دریافت شد");}
  function train(type){
    const s=userSquad();if(!s.length)return;
    if(type==="fitness"){s.forEach(p=>{p.fitness=clamp(p.fitness+rand(5,10),0,100);p.form=clamp(p.form+1,0,10);});addLog("تمرین آمادگی برگزار شد");toast("آمادگی بازیکنان افزایش یافت");}
    else{s.forEach(p=>{p.fitness=clamp(p.fitness-rand(2,5),0,100);if(Math.random()<.24&&p.overall<95){p.overall++;p.pass=clamp(p.pass+1,0,99);}});addLog("تمرین فنی تیم انجام شد");toast("تمرین فنی تمام شد؛ برخی بازیکنان پیشرفت کردند");}
    save(false);render();
  }
  function recover(){userSquad().forEach(p=>{p.fitness=clamp(p.fitness+rand(12,22),0,100);p.injury=Math.max(0,p.injury-1);});addLog("جلسه ریکاوری تیم انجام شد");save(false);render();toast("آمادگی تیم بازیابی شد");}
  function upgradeStadium(){const c=userClub(),cost=c.stadium*5000;if(c.stadium>=5){toast("ورزشگاه به حداکثر سطح رسیده است");return;}if(c.budget<cost){toast("بودجه کافی نیست؛ هزینه ارتقا "+money(cost)+" است");return;}c.budget-=cost;c.stadium++;c.fans+=rand(250,700);addLog("ورزشگاه به سطح "+c.stadium+" ارتقا یافت");save(false);render();toast("ورزشگاه ارتقا یافت");}
  function nextSeason(){
    if(state.fixtures.some(f=>!f.played)){confirmAction("فصل هنوز تمام نشده","بعضی مسابقات هنوز انجام نشده‌اند. اگر فصل جدید را شروع کنی، مسابقات باقی‌مانده این فصل نادیده گرفته می‌شوند. ادامه می‌دهی؟","confirm-next-season","شروع فصل جدید");return;}
    finishSeason();
  }
  function finishSeason(){
    const table=leagueTable(),champion=table[0];state.history.push({season:state.season,champion:champion.id,table:table.map(c=>({id:c.id,points:c.points,gf:c.gf,ga:c.ga}))});
    addLog("فصل "+state.season+" تمام شد؛ قهرمان: "+champion.name);
    state.season++;state.week=1;
    state.clubs.forEach(c=>{c.played=0;c.wins=0;c.draws=0;c.losses=0;c.gf=0;c.ga=0;c.points=0;c.budget+=c.fans*2;});
    state.players.forEach(p=>{p.apps=0;p.goals=0;p.assists=0;p.fitness=clamp(p.fitness+25,0,100);p.age++;p.contract=Math.max(0,p.contract-1);if(p.age>34)p.overall=clamp(p.overall-1,35,99);else if(p.age<25&&p.overall<90&&Math.random()<.35)p.overall++;p.value=Math.round(p.overall*p.overall*18);});
    state.fixtures=[];const ids=state.clubs.map(c=>c.id),base=ids.slice();
    for(let round=0;round<7;round++){for(let i=0;i<4;i++)state.fixtures.push({id:state.fixtures.length+1,round:round+1,home:base[i],away:base[7-i],played:false,homeGoals:null,awayGoals:null,events:[]});const last=base.pop();base.splice(1,0,last);}
    const first=state.fixtures.slice();first.forEach(f=>state.fixtures.push({id:state.fixtures.length+1,round:f.round+7,home:f.away,away:f.home,played:false,homeGoals:null,awayGoals:null,events:[]}));
    state.nextId=Math.max(...state.players.map(p=>p.id))+1;
    // Renew expired contracts in this MVP so players do not disappear from the roster.
    state.players.forEach(p=>{if(p.contract===0)p.contract=1;});
    save(false);closeModal();changeView("dashboard");toast("فصل جدید آغاز شد؛ قهرمان فصل قبل "+champion.name+" بود");
  }
  function playerDetails(id){
    const p=playerById(id);if(!p)return;
    const isMine=p.clubId===state.clubId;
    const body="<div class='player-top'><div class='player-face'>⚽</div><div class='player-name'><strong>"+escapeHtml(p.name)+"</strong><small>"+escapeHtml(p.position)+" · "+fmt(p.age)+" سال</small></div><div class='rating'>"+fmt(p.overall)+"</div></div><div class='stats-grid section-gap'>"+statCard("ارزش",money(p.value),"ارزش تخمینی","")+statCard("دستمزد",money(p.wage),"هفتگی","")+statCard("گل",fmt(p.goals),"فصل جاری","")+statCard("بازی",fmt(p.apps),"فصل جاری","")+"</div><div class='list'><div class='list-row'><span>آمادگی جسمانی</span><b>"+fmt(p.fitness)+"٪</b></div><div class='list-row'><span>روحیه</span><b>"+fmt(p.morale)+"٪</b></div><div class='list-row'><span>قرارداد</span><b>"+fmt(p.contract)+" فصل</b></div><div class='list-row'><span>باشگاه</span><b>"+escapeHtml(p.clubId===-1?"بازیکن آزاد":clubById(p.clubId).name)+"</b></div></div>";
    const actions=[{label:"بستن",action:"close-modal"}];
    if(isMine){actions.push({label:"فروش بازیکن",action:"sell-player",cls:"btn-primary",attrs:"data-id='"+p.id+"'"},{label:"آزادسازی (۰ درآمد)",action:"release-player",cls:"btn-danger",attrs:"data-id='"+p.id+"'"});}
    else if(p.clubId!==-1)actions.push({label:"خرید بازیکن",action:"buy-player",cls:"btn-primary",attrs:"data-id='"+p.id+"'"});
    else actions.push({label:"خرید بازیکن آزاد",action:"sign-free",cls:"btn-primary",attrs:"data-id='"+p.id+"'"});
    modal("پرونده بازیکن",body,actions);
  }
  function signFree(id){const p=playerById(id),c=userClub();if(!p||p.clubId!==-1)return;if(squad(c.id).length>=c.capacity){toast("فهرست کامل است");return;}const fee=Math.round(p.value*.25);if(c.budget<fee){toast("برای پاداش امضا "+money(fee)+" بودجه لازم است");return;}c.budget-=fee;p.clubId=c.id;p.contract=2;p.history.push({from:"بازیکن آزاد",to:c.name,season:state.season});addLog("جذب بازیکن آزاد "+p.name+" با پاداش امضا "+money(fee));save(false);closeModal();render();toast("بازیکن آزاد جذب شد");}
  function filterPlayers(){
    const q=($("#player-search")?.value||"").trim().toLowerCase(),pos=$("#position-filter")?.value||"all",sort=$("#player-sort")?.value||"overall";
    const arr=userSquad().filter(p=>(!q||p.name.toLowerCase().includes(q))&&(pos==="all"||p.position===pos));
    arr.sort((a,b)=>sort==="age"?a.age-b.age:sort==="value"?b.value-a.value:b.overall-a.overall);
    const grid=$("#player-grid");if(grid)grid.innerHTML=arr.map(playerCard).join("")||"<div class='empty-state'>بازیکنی با این مشخصات پیدا نشد.</div>";
  }
  function filterMarket(){
    const q=($("#market-search")?.value||"").trim().toLowerCase(),pos=$("#market-position")?.value||"all";
    const arr=state.players.filter(p=>p.clubId!==state.clubId&&(p.clubId===-1||squad(p.clubId).length>11)&&(!q||p.name.toLowerCase().includes(q))&&(pos==="all"||p.position===pos)).sort((a,b)=>b.overall-a.overall);
    const list=$("#market-list");if(list)list.innerHTML=arr.map(p=>"<div class='list-row'><div class='row-main'><span class='avatar'>⚽</span><div><strong>"+escapeHtml(p.name)+"</strong><small>"+escapeHtml(p.clubId===-1?"بازیکن آزاد":clubById(p.clubId).name)+" · "+escapeHtml(p.position)+" · سن "+fmt(p.age)+"</small></div></div><div style='text-align:left'><b style='display:block;font-size:12px'>"+money(p.value)+"</b><small class='muted'>قدرت "+fmt(p.overall)+"</small><div style='margin-top:7px'>"+button(p.clubId===-1?"جذب":"خرید",p.clubId===-1?"sign-free":"buy-player","btn-primary btn-small","data-id='"+p.id+"'")+"</div></div></div>").join("")||"<div class='empty-state'>بازیکنی با این فیلتر پیدا نشد.</div>";
  }
  function handleAction(action,el){
    if(action==="close-modal"){closeModal();return;}
    if(action==="backdrop-close"&&el.classList.contains("modal-backdrop")){closeModal();return;}
    if(action==="go-squad"){changeView("squad");return;}if(action==="go-market"){changeView("market");return;}
    if(action==="play-match"){playNext();return;}
    if(action==="play-week"){const f=nextFixture();if(!f){toast("بازی باقی نمانده");return;}simulateRound(f.round);return;}
    if(action==="next-season"){nextSeason();return;}if(action==="confirm-next-season"){finishSeason();return;}
    if(action==="train-fitness"){train("fitness");return;}if(action==="train-technical"){train("technical");return;}if(action==="recover"){recover();return;}
    if(action==="upgrade-stadium"){upgradeStadium();return;}
    if(action==="wage-report"){modal("گزارش دستمزد","<p>مجموع دستمزد هفتگی تیم: <b>"+money(userSquad().reduce((a,p)=>a+p.wage,0))+"</b></p><p>بودجه فعلی: <b>"+money(userClub().budget)+"</b></p>",[{label:"متوجه شدم",action:"close-modal",cls:"btn-primary"}]);return;}
    if(action==="player-details"){playerDetails(el.dataset.id);return;}
    if(action==="buy-player"){buyPlayer(Number(el.dataset.id));return;}
    if(action==="sign-free"){signFree(Number(el.dataset.id));return;}
    if(action==="sell-player"){sellPlayer(Number(el.dataset.id));return;}
    if(action==="release-player"){releasePlayer(Number(el.dataset.id));return;}
    if(action==="modal-fixtures"){closeModal();changeView("fixtures");return;}
    if(action.startsWith("sell-")){processSell(Number(action.slice(5)));return;}
    if(action.startsWith("release-")){processRelease(Number(action.slice(8)));return;}
    if(action.startsWith("confirm-sell-")){processSell(Number(action.slice(13)));return;}
    if(action.startsWith("confirm-release-")){processRelease(Number(action.slice(16)));return;}
  }
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-view]");if(nav){changeView(nav.dataset.view);return;}
    const el=e.target.closest("[data-action]");if(el){e.preventDefault();handleAction(el.dataset.action,el);return;}
  });
  document.addEventListener("input",e=>{
    if(["player-search","position-filter","player-sort"].includes(e.target.id))filterPlayers();
    if(["market-search","market-position"].includes(e.target.id))filterMarket();
    if(e.target.id==="press-slider"){state.tactics.pressing=Number(e.target.value);$("#press-value").textContent=fmt(state.tactics.pressing)+"٪";save(false);}
    if(e.target.id==="tempo-slider"){state.tactics.tempo=Number(e.target.value);$("#tempo-value").textContent=fmt(state.tactics.tempo)+"٪";save(false);}
  });
  document.addEventListener("change",e=>{
    if(e.target.id==="formation-select"){state.formation=e.target.value;save(false);render();}
    if(e.target.id==="style-select"){state.tactics.style=e.target.value;save(false);toast("سبک بازی به‌روزرسانی شد");}
  });
  $("#save-btn").addEventListener("click",()=>save(true));
  $("#mobile-menu").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
  $("#reset-btn").addEventListener("click",()=>confirmAction("شروع بازی جدید","ذخیره فعلی پاک می‌شود و یک باشگاه تازه ساخته خواهد شد. این کار قابل بازگشت نیست.","confirm-reset","شروع از ابتدا"));
  // Reset action is handled separately to keep accidental clicks from erasing a save.
  const originalHandle=handleAction;
  handleAction=function(action,el){
    if(action==="confirm-reset"){localStorage.removeItem(STORAGE_KEY);state=freshState();save(false);closeModal();changeView("dashboard");toast("بازی جدید شروع شد");return;}
    return originalHandle(action,el);
  };
  // Handle legacy-save migration carefully; keep the user's existing save if its shape is usable.
  if(!state.fixtures||state.fixtures.length!==56){state=freshState();save(false);}
  render();
})();