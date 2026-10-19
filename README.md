# -project-eleven
    PROJECT ELEVEN Football Manager Game
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#07111f">
<title>PROJECT ELEVEN</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#07111f;color:#f3f6ff;font-family:Arial,sans-serif;padding-bottom:85px}
header{padding:23px 18px;background:linear-gradient(135deg,#102b40,#07111f);border-bottom:1px solid #203c50}
.logo{font-size:25px;font-weight:900;letter-spacing:1px;color:#69f0b1}
.logo span{color:white}
.sub{font-size:11px;color:#91a8ba;margin-top:7px}
main{padding:15px;max-width:650px;margin:auto}
h2{font-size:17px;margin:23px 0 12px}
h3{font-size:14px;margin:0 0 9px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.card{background:#101f30;border:1px solid #20374a;border-radius:14px;padding:15px}
.label{font-size:11px;color:#91a8ba}
.value{font-size:22px;font-weight:bold;margin-top:8px}
.green{color:#69f0b1}
.gold{color:#ffd477}
.hero{padding:20px;border-radius:17px;background:linear-gradient(135deg,#174d43,#102638);border:1px solid #286957}
.hero .name{font-size:23px;font-weight:bold;margin:12px 0}
button{border:0;border-radius:10px;background:#69f0b1;color:#071a18;padding:12px 14px;font-weight:bold;font-size:13px;cursor:pointer}
button.secondary{background:#20374a;color:white}
button:disabled{opacity:.4}
.row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.list{display:flex;flex-direction:column;gap:9px}
.player{display:flex;align-items:center;gap:11px;padding:12px;background:#101f30;border:1px solid #20374a;border-radius:12px}
.avatar{width:43px;height:43px;display:grid;place-items:center;background:#1b3b4a;border-radius:12px;font-size:21px}
.info{flex:1;min-width:0}
.info strong{font-size:13px}
.info small{display:block;color:#91a8ba;margin-top:5px;font-size:11px}
.rating{font-size:19px;font-weight:bold;color:#69f0b1}
nav{position:fixed;bottom:0;left:0;right:0;background:#0b1827;border-top:1px solid #20374a;display:flex;justify-content:space-around;padding:9px 2px calc(9px + env(safe-area-inset-bottom));z-index:5}
nav button{background:transparent;color:#8da5b8;padding:7px 5px;font-size:10px;flex:1}
nav button.active{color:#69f0b1;background:#142b35}
.page{display:none}.page.active{display:block}
.notice{color:#91a8ba;font-size:11px;line-height:1.8;margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:12px}
td,th{text-align:center;padding:12px 4px;border-bottom:1px solid #20374a}
th{color:#91a8ba}
.tag{font-size:10px;padding:5px 7px;background:#1b3b4a;border-radius:6px;color:#69f0b1}
.match{background:#101f30;border:1px solid #20374a;border-radius:14px;padding:17px;text-align:center}
.score{font-size:34px;font-weight:bold;margin:16px 0}
input{background:#07111f;border:1px solid #345067;border-radius:9px;padding:11px;color:white;width:100%;margin:9px 0;font-size:14px}
</style>
</head>
<body>
<header>
 <div class="logo">PROJECT <span>ELEVEN</span></div>
 <div class="sub">FOOTBALL CLUB MANAGEMENT · SEASON 2026</div>
</header>
<main>
<section id="home" class="page active">
 <div class="hero">
  <div class="row"><span class="tag">مدیر باشگاه</span><span>⚽ فصل اول</span></div>
  <div class="name" id="clubTitle">باشگاه من</div>
  <div class="sub">وقتشه تاریخ فوتبال رو بسازی.</div>
  <br><button onclick="playMatch()">🏆 بازی بعدی</button>
  <button class="secondary" onclick="showPage('team')">ترکیب تیم</button>
 </div>
 <h2>📊 وضعیت باشگاه</h2>
 <div class="grid">
  <div class="card"><div class="label">💰 بودجه باشگاه</div><div class="value green" id="money">€25M</div></div>
  <div class="card"><div class="label">⭐ قدرت تیم</div><div class="value" id="strength">76</div></div>
  <div class="card"><div class="label">🏆 امتیاز لیگ</div><div class="value gold" id="points">0</div></div>
  <div class="card"><div class="label">🎮 مسابقات</div><div class="value" id="played">0</div></div>
 </div>
 <h2>📅 مسابقه بعدی</h2>
 <div class="match">
  <div class="sub">لیگ برتر · هفته <span id="week">1</span></div>
  <div class="row" style="margin-top:17px"><div>🔵<br><b id="shortClub">باشگاه من</b></div><div style="font-size:12px;color:#91a8ba">VS</div><div>🔴<br><b id="opponent">شیرهای تهران</b></div></div>
  <p class="notice">با پیروزی، امتیاز و پاداش دریافت کن.</p>
  <button onclick="playMatch()">شروع مسابقه</button>
 </div>
 <h2>⭐ ستاره‌های تیم</h2>
 <div class="list" id="stars"></div>
</section>

<section id="team" class="page">
 <h2>👥 ترکیب و بازیکنان</h2>
 <div class="card"><div class="label">میانگین قدرت تیم</div><div class="value green" id="teamRating">76</div><p class="notice">بازیکنانت رو بررسی کن و برای تقویت تیم برنامه بریز.</p></div>
 <div class="list" id="roster" style="margin-top:12px"></div>
</section>

<section id="league" class="page">
 <h2>🏆 جدول لیگ</h2>
 <div class="card" style="padding:5px">
 <table><thead><tr><th>#</th><th>باشگاه</th><th>بازی</th><th>امتیاز</th></tr></thead><tbody id="tableBody"></tbody></table>
 </div>
 <p class="notice">برد: ۳ امتیاز · مساوی: ۱ امتیاز · باخت: بدون امتیاز</p>
</section>

<section id="market" class="page">
 <h2>🔄 بازار نقل‌وانتقالات</h2>
 <div class="card"><div class="label">بودجه قابل‌استفاده</div><div class="value green" id="marketMoney">€25M</div><p class="notice">بازیکن بخر تا قدرت باشگاهت افزایش پیدا کنه. این بازار آزمایشی و آفلاین است.</p></div>
 <div class="list" id="marketList" style="margin-top:12px"></div>
</section>

<section id="settings" class="page">
 <h2>⚙️ تنظیمات باشگاه</h2>
 <div class="card">
  <h3>نام باشگاه</h3>
  <input id="clubInput" maxlength="24" placeholder="نام باشگاه را وارد کن">
  <button onclick="renameClub()">ثبت نام باشگاه</button>
 </div>
 <div class="card" style="margin-top:12px">
  <h3>ذخیره بازی</h3>
  <p class="notice">اطلاعات این نسخه در حافظه مرورگر همین دستگاه ذخیره می‌شود.</p>
  <button onclick="saveGame()">ذخیره بازی</button>
  <button class="secondary" onclick="resetGame()">شروع دوباره</button>
 </div>
 <p class="notice">PROJECT ELEVEN · نسخه آزمایشی 0.1<br>نسخه فعلی آنلاین چندنفره نیست.</p>
</section>
</main>
<nav>
 <button class="active" data-page="home" onclick="showPage('home')">🏠<br>خانه</button>
 <button data-page="team" onclick="showPage('team')">👥<br>تیم</button>
 <button data-page="league" onclick="showPage('league')">🏆<br>لیگ</button>
 <button data-page="market" onclick="showPage('market')">🔄<br>بازار</button>
 <button data-page="settings" onclick="showPage('settings')">⚙️<br>تنظیمات</button>
</nav>
<script>
const initialPlayers=[
{id:1,name:"آرمان رضایی",pos:"دروازه‌بان",rating:78,price:0,icon:"🧤"},
{id:2,name:"امیر محمدی",pos:"مدافع",rating:75,price:0,icon:"🛡️"},
{id:3,name:"پارسا کریمی",pos:"مدافع",rating:73,price:0,icon:"🛡️"},
{id:4,name:"سامان احمدی",pos:"مدافع",rating:76,price:0,icon:"🛡️"},
{id:5,name:"آریا مرادی",pos:"مدافع",rating:74,price:0,icon:"🛡️"},
{id:6,name:"ماهان نوری",pos:"هافبک",rating:79,price:0,icon:"⚙️"},
{id:7,name:"کیان حیدری",pos:"هافبک",rating:77,price:0,icon:"⚙️"},
{id:8,name:"پارسا موسوی",pos:"هافبک",rating:75,price:0,icon:"⚙️"},
{id:9,name:"آرین صالحی",pos:"مهاجم",rating:81,price:0,icon:"⚡"},
{id:10,name:"بردیا اکبری",pos:"مهاجم",rating:78,price:0,icon:"⚡"},
{id:11,name:"سامیار حسینی",pos:"مهاجم",rating:77,price:0,icon:"⚡"}
];
const marketPlayers=[
{id:101,name:"دانیال رستمی",pos:"مهاجم",rating:84,price:12,icon:"⚡"},
{id:102,name:"اشکان بهرامی",pos:"هافبک",rating:82,price:9,icon:"⚙️"},
{id:103,name:"مهراد زمانی",pos:"مدافع",rating:80,price:7,icon:"🛡️"},
{id:104,name:"شایان فرهادی",pos:"دروازه‌بان",rating:83,price:8,icon:"🧤"},
{id:105,name:"نوید جعفری",pos:"مهاجم",rating:79,price:5,icon:"⚡"}
];
const defaults=()=>({club:"باشگاه من",money:25,points:0,played:0,wins:0,draws:0,losses:0,players:initialPlayers.map(p=>({...p})),bought:[],opponentIndex:0,results:[]});
let state;
try{state=JSON.parse(localStorage.getItem("pe_save"))||defaults()}catch(e){state=defaults()}
const opponents=["شیرهای تهران","ستاره‌های تبریز","قهرمانان شیراز","عقابان اصفهان","پارس یونایتد","آذرخش مشهد","طلایی‌پوشان","پایتخت FC"];
function moneyText(n){return "€"+n+"M"}
function avg(){return Math.round(state.players.reduce((a,p)=>a+p.rating,0)/Math.max(1,state.players.length))}
function saveGame(){try{localStorage.setItem("pe_save",JSON.stringify(state));alert("بازی ذخیره شد ✅")}catch(e){alert("ذخیره‌سازی در این مرورگر در دسترس نیست.")}}
function showPage(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
 render()
}
function playerHTML(p,market=false){
 return `<div class="player"><div class="avatar">${p.icon}</div><div class="info"><strong>${p.name}</strong><small>${p.pos} · ${market?"ارزش €"+p.price+"M":"بازیکن باشگاه"}</small></div><div class="rating">${p.rating}</div>${market?`<button onclick="buyPlayer(${p.id})">خرید</button>`:""}</div>`
}
function render(){
 document.getElementById("clubTitle").textContent=state.club;
 document.getElementById("shortClub").textContent=state.club;
 document.getElementById("money").textContent=moneyText(state.money);
 document.getElementById("marketMoney").textContent=moneyText(state.money);
 document.getElementById("strength").textContent=avg();
 document.getElementById("teamRating").textContent=avg();
 document.getElementById("points").textContent=state.points;
 document.getElementById("played").textContent=state.played;
 document.getElementById("week").textContent=state.played+1;
 document.getElementById("opponent").textContent=opponents[state.opponentIndex%opponents.length];
 document.getElementById("stars").innerHTML=[...state.players].sort((a,b)=>b.rating-a.rating).slice(0,3).map(p=>playerHTML(p)).join("");
 document.getElementById("roster").innerHTML=state.players.map(p=>playerHTML(p)).join("");
 document.getElementById("marketList").innerHTML=marketPlayers.filter(p=>!state.bought.includes(p.id)).map(p=>playerHTML(p,true)).join("")||'<div class="card">فعلاً بازیکن جدیدی در بازار نیست.</div>';
 document.getElementById("tableBody").innerHTML=[
 {name:state.club,played:state.played,points:state.points,me:true},
 {name:"شیرهای تهران",played:4,points:9},
 {name:"ستاره‌های تبریز",played:4,points:8},
 {name:"قهرمانان شیراز",played:4,points:6},
 {name:"عقابان اصفهان",played:4,points:4},
 {name:"پارس یونایتد",played:4,points:2}
 ].sort((a,b)=>b.points-a.points).map((t,i)=>`<tr style="${t.me?"color:#69f0b1":""}"><td>${i+1}</td><td>${t.name}</td><td>${t.played}</td><td>${t.points}</td></tr>`).join("");
}
function playMatch(){
 const my=avg()+Math.random()*20-10;
 const opp=73+Math.random()*18;
 const a=Math.max(0,Math.round(my/22+Math.random()*2));
 const b=Math.max(0,Math.round(opp/23+Math.random()*2));
 state.played++;
 state.opponentIndex++;
 let message;
 if(a>b){state.wins++;state.points+=3;state.money+=2;message="پیروزی! ۲ میلیون یورو پاداش گرفتی."}
 else if(a===b){state.draws++;state.points++;state.money+=1;message="مساوی! ۱ میلیون یورو پاداش گرفتی."}
 else{state.losses++;message="این مسابقه رو باختی؛ برای بازی بعدی تیمت رو تقویت کن."}
 state.results.unshift({a,b,opponent:opponents[(state.opponentIndex-1)%opponents.length]});
 saveSilent();render();
 alert(`${state.club} ${a} - ${b} ${state.results[0].opponent}\n\n${message}`);
}
function buyPlayer(id){
 const p=marketPlayers.find(x=>x.id===id);
 if(!p||state.bought.includes(id))return;
 if(state.players.length>=18){alert("فهرست آزمایشی حداکثر ۱۸ بازیکن دارد.");return}
 if(state.money<p.price){alert("بودجه کافی نیست!");return}
 state.money-=p.price;state.players.push({...p});state.bought.push(id);saveSilent();render();alert(`${p.name} به باشگاه اضافه شد!`);
}
function renameClub(){
 const v=document.getElementById("clubInput").value.trim();
 if(!v){alert("اول نام باشگاه را وارد کن.");return}
 state.club=v;saveSilent();render();alert("نام باشگاه تغییر کرد.");
}
function saveSilent(){try{localStorage.setItem("pe_save",JSON.stringify(state))}catch(e){}}
function resetGame(){if(confirm("تمام پیشرفت این نسخه پاک شود؟")){state=defaults();saveSilent();render();alert("بازی از نو شروع شد.")}}
render();
</script>
</body>
</html>
