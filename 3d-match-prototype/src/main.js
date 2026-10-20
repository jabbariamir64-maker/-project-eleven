(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const canvas=$("gameCanvas"), loading=$("loading"), homeScoreEl=$("homeScore"), awayScoreEl=$("awayScore"), timeEl=$("matchTime"), phaseEl=$("phaseLabel"), logEl=$("eventLog"), miniMap=$("miniMap");
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const matchParams=new URLSearchParams(window.location.search);
  // Side 0 is the left/home team; side 1 is the right/away team. Apply user tactics only to the user's club.
  const userTeam=matchParams.get("userSide")==="1"?1:0;
  if(matchParams.get("home"))$("homeTeamName").textContent=matchParams.get("home");
  if(matchParams.get("away"))$("awayTeamName").textContent=matchParams.get("away");
  const replayMode=matchParams.has("hg")&&matchParams.has("ag");
  const parseRoster=key=>{try{const value=JSON.parse(matchParams.get(key)||"[]");return Array.isArray(value)?value:[]}catch(_){return []}};
  const rosterData={home:parseRoster("homePlayers"),away:parseRoster("awayPlayers")};
  const replayTargetHome=Math.max(0,Number(matchParams.get("hg"))||0),replayTargetAway=Math.max(0,Number(matchParams.get("ag"))||0);
  const replayGoals=(matchParams.get("goals")||"").split(",").filter(Boolean).map(v=>{const q=v.split(":");return {minute:clamp(Number(q[0])||1,1,89),team:Number(q[1])===1?1:0,done:false}}).sort((a,b)=>a.minute-b.minute);
  const homeLabel=matchParams.get("home")||"آبی‌ها",awayLabel=matchParams.get("away")||"سبزها";
  let replayGoalPending=null,goalTimeline=[],resultSent=false;
  if(!window.BABYLON){loading.textContent="موتور سه‌بعدی بارگذاری نشد؛ اتصال اینترنت و دسترسی به cdn.babylonjs.com را بررسی کن.";return;}
  if(!BABYLON.Engine.isSupported()){loading.textContent="مرورگر یا دستگاه فعلی از WebGL پشتیبانی نمی‌کند؛ بازی را در مرورگر به‌روز باز کن.";return;}
  const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
  const scene=new BABYLON.Scene(engine); scene.clearColor=new BABYLON.Color4(.025,.055,.085,1);
  const camera=new BABYLON.ArcRotateCamera("broadcast-camera",-Math.PI/2,1.08,102,new BABYLON.Vector3(0,0,0),scene);
  camera.lowerRadiusLimit=68;camera.upperRadiusLimit=120;camera.lowerBetaLimit=.72;camera.upperBetaLimit=1.35;camera.wheelPrecision=45;camera.panningSensibility=0;camera.attachControl(canvas,true);
  const hemi=new BABYLON.HemisphericLight("ambient",new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.95;
  const sun=new BABYLON.DirectionalLight("stadium-light",new BABYLON.Vector3(-.35,-1,.25),scene);sun.position=new BABYLON.Vector3(0,35,-20);sun.intensity=.65;
  const mat=(name,color,emissive=null)=>{const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(color);if(emissive)m.emissiveColor=BABYLON.Color3.FromHexString(emissive);return m;};
  const safeHex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||"")?value:fallback;
  const grassA=mat("grass-a","#26784c"),grassB=mat("grass-b","#2c8553"),lineMat=mat("field-lines","#e7f5e9"),blueMat=mat("blue-kit",safeHex(matchParams.get("homeColor"),"#168cff"),"#04284c"),greenMat=mat("green-kit",safeHex(matchParams.get("awayColor"),"#28d99b"),"#063d2c"),skinMat=mat("skin","#d7a77e"),darkMat=mat("boots","#14202b"),ballMat=mat("ball-white","#f7f8f6"),goalMat=mat("goal-frame","#f4f7fa"),standMat=mat("stand","#17283b"),seatMat=mat("seat","#31455b");
  const ground=BABYLON.MeshBuilder.CreateGround("pitch",{width:105,height:68,subdivisions:2},scene);ground.material=grassA;ground.position.y=-.15;
  for(let i=0;i<10;i++){const band=BABYLON.MeshBuilder.CreateGround("stripe-"+i,{width:10.5,height:68},scene);band.position.set(-47.25+i*10.5,-.12,0);band.material=i%2?grassA:grassB;}
  function line(name,pts,color=lineMat){const mesh=BABYLON.MeshBuilder.CreateLines(name,{points:pts.map(p=>new BABYLON.Vector3(p[0],.015,p[1]))},scene);mesh.color=color.diffuseColor;return mesh;}
  function rect(x1,z1,x2,z2){line("marking",[[x1,z1],[x2,z1],[x2,z2],[x1,z2],[x1,z1]]);}
  rect(-52.5,-34,52.5,34);line("halfway",[[0,-34],[0,34]]);
  const circle=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;circle.push([9.15*Math.cos(a),9.15*Math.sin(a)]);}line("centre-circle",circle);
  const spot=BABYLON.MeshBuilder.CreateSphere("centre-spot",{diameter:.48,segments:12},scene);spot.position.set(0,.04,0);spot.scaling.y=.08;spot.material=lineMat;
  for(const sign of [-1,1]){rect(sign*41.5,-20.16,sign*52.4,20.16);rect(sign*47,-9.16,sign*52.4,9.16);const arc=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI/2;arc.push([sign*(41.5+9.15*Math.cos(a)),9.15*Math.sin(a)]);}line("penalty-arc",arc);
    const gx=sign*53.2;for(const z of [-3.66,3.66]){const post=BABYLON.MeshBuilder.CreateBox("goalpost",{width:.22,height:2.6,depth:.22},scene);post.position.set(gx,1.15,z);post.material=goalMat;}
    const bar=BABYLON.MeshBuilder.CreateBox("goalbar",{width:.22,height:.22,depth:7.32},scene);bar.position.set(gx,2.45,0);bar.material=goalMat;
    const netMat=mat("net-"+sign,"#a7c3d5");netMat.alpha=.15;const net=BABYLON.MeshBuilder.CreateBox("net-back",{width:1.7,height:2.4,depth:7.2},scene);net.position.set(sign*54,1.2,0);net.material=netMat;
  }
  for(const side of [-1,1]){const stand=BABYLON.MeshBuilder.CreateBox("stand",{width:112,height:5,depth:7},scene);stand.position.set(0,1.8,side*39);stand.material=standMat;for(let r=0;r<3;r++){const row=BABYLON.MeshBuilder.CreateBox("seat-row",{width:108,height:.16,depth:.4},scene);row.position.set(0,.4+r*.65,side*(36.5+r*1.6));row.material=seatMat;}}
  // Lightweight instanced crowd: varied seat colors, one draw-call group per material.
  const randomBetween=(a,b)=>a+Math.random()*(b-a);
  const crowdColors=["#dce8f3","#4d91c9","#e3b65b","#c85c6b","#42b58d","#7e8ba5"];
  const crowdBases=crowdColors.map((color,i)=>{const m=mat("crowd-material-"+i,color);const base=BABYLON.MeshBuilder.CreateBox("crowd-instance-base-"+i,{width:.38,height:.62,depth:.3},scene);base.material=m;base.position.set(0,-100-i,0);return base;});
  const addSpectator=(x,y,z)=>{const base=crowdBases[Math.floor(Math.random()*crowdBases.length)];const fan=base.createInstance("spectator");fan.position.set(x,y,z);fan.rotation.y=randomBetween(-.16,.16);};
  for(const side of [-1,1]){for(let x=-52;x<=52;x+=2.6){for(let row=0;row<5;row++){addSpectator(x+randomBetween(-.35,.35),1.45+row*.42,side*(36.4+row*1.35));}}}
  for(const end of [-1,1]){for(let z=-30;z<=30;z+=3.1){for(let row=0;row<3;row++){addSpectator(end*(54.4+row*1.35),1.35+row*.48,z+randomBetween(-.3,.3));}}}
  // Stadium floodlight masts and glowing lamp banks frame the pitch.
  const mastMat=mat("floodlight-mast","#65778a"),lampMat=mat("floodlight-glow","#d8efff","#b8dcff");
  for(const x of [-55,55])for(const z of [-35,35]){const mast=BABYLON.MeshBuilder.CreateCylinder("floodlight-mast",{height:13,diameter:.28,tessellation:8},scene);mast.position.set(x,6.5,z);mast.material=mastMat;const bank=BABYLON.MeshBuilder.CreateBox("floodlight-bank",{width:2.3,height:.65,depth:.45},scene);bank.position.set(x,13,z);bank.material=lampMat;}
  const players=[];
  const rand=(a,b)=>a+Math.random()*(b-a), dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function makePlayer(team,idx,x,z){
    const rosterPlayer=(team===0?rosterData.home:rosterData.away)[idx]||{};
    const root=new BABYLON.TransformNode("player-"+team+"-"+idx,scene);
    const body=BABYLON.MeshBuilder.CreateCapsule("body",{height:1.55,radius:.34,tessellation:8,subdivisions:2},scene);body.parent=root;body.position.y=.94;body.material=team===0?blueMat:greenMat;
    const head=BABYLON.MeshBuilder.CreateSphere("head",{diameter:.48,segments:10},scene);head.parent=root;head.position.y=1.92;head.material=skinMat;
    const leg=BABYLON.MeshBuilder.CreateBox("leg",{width:.19,height:.62,depth:.22},scene);leg.parent=root;leg.position.set(-.16,.31,0);leg.material=darkMat;const leg2=leg.clone("leg");leg2.parent=root;leg2.position.x=.16;
    const arm=BABYLON.MeshBuilder.CreateCapsule("arm",{height:.82,radius:.13,tessellation:7,subdivisions:1},scene);arm.parent=root;arm.position.set(-.43,1.12,0);arm.rotation.z=-.18;arm.material=team===0?blueMat:greenMat;const arm2=arm.clone("arm");arm2.parent=root;arm2.position.x=.43;arm2.rotation.z=.18;
    const shorts=BABYLON.MeshBuilder.CreateBox("shorts",{width:.52,height:.28,depth:.34},scene);shorts.parent=root;shorts.position.y=.48;shorts.material=team===0?blueMat:greenMat;
    const bootMat=mat("boot-"+team+"-"+idx,"#101722");
    for(const shin of [leg,leg2]){const boot=BABYLON.MeshBuilder.CreateBox("boot",{width:.22,height:.12,depth:.36},scene);boot.parent=shin;boot.position.set(0,-.29,.055);boot.material=bootMat;}
    const numberTexture=new BABYLON.DynamicTexture("shirt-number-texture-"+team+"-"+idx,{width:128,height:128},scene,true);numberTexture.hasAlpha=true;numberTexture.drawText(String(Number(rosterPlayer.shirtNumber)||idx+1),null,98,"bold 88px Arial","#ffffff","transparent",true);
    const numberMaterial=new BABYLON.StandardMaterial("shirt-number-material-"+team+"-"+idx,scene);numberMaterial.diffuseTexture=numberTexture;numberMaterial.opacityTexture=numberTexture;numberMaterial.useAlphaFromDiffuseTexture=true;numberMaterial.emissiveColor=new BABYLON.Color3(.8,.8,.8);numberMaterial.backFaceCulling=false;
    const shirtNumber=BABYLON.MeshBuilder.CreatePlane("shirt-number-"+team+"-"+idx,{width:.28,height:.3},scene);shirtNumber.parent=root;shirtNumber.position.set(0,1.08,-.345);shirtNumber.rotation.y=Math.PI;shirtNumber.material=numberMaterial;
    root.position.set(x,0,z);root.rotation.y=team===0?Math.PI/2:-Math.PI/2;
    // Individual ratings drive choices and ball execution; keep ratings different player to player.
    const p={team,idx,playerId:rosterPlayer.id||null,name:rosterPlayer.name||((team===0?"میزبان ":"میهمان ")+(idx+1)),code:rosterPlayer.code||"",root,leg,leg2,arm,arm2,goalkeeping:Number(rosterPlayer.goalkeeping)|| (idx===0?rand(62,96):rand(35,60)),kickTimer:0,diveTimer:0,diveSide:1,home:new BABYLON.Vector3(x,0,z),target:new BABYLON.Vector3(x,0,z),phase:rand(0,6.28),pace:Number(rosterPlayer.pace)||rand(62,94),passing:Number(rosterPlayer.passing)||rand(48,96),shooting:Number(rosterPlayer.shooting)||rand(42,96),technique:Number(rosterPlayer.technique)||rand(45,97),control:Number(rosterPlayer.control)||rand(48,95),defending:Number(rosterPlayer.defending)||rand(45,94),stamina:clamp(Number(rosterPlayer.fitness)||100,45,100)};
    players.push(p);return p;
  }
  const homeFormation=[[-45,0],[-36,-22],[-36,-8],[-36,8],[-36,22],[-20,-24],[-20,-8],[-20,8],[-20,24],[-7,-9],[-7,9]];
  const awayFormation=[[45,0],[36,-22],[36,-8],[36,8],[36,22],[20,-24],[20,-8],[20,8],[20,24],[7,-9],[7,9]];
  homeFormation.forEach((p,i)=>makePlayer(0,i,p[0],p[1]));awayFormation.forEach((p,i)=>makePlayer(1,i,p[0],p[1]));
  const ball=BABYLON.MeshBuilder.CreateSphere("match-ball",{diameter:.72,segments:20},scene);ball.position.set(-7,.4,-9);ball.material=ballMat;
  const seam=BABYLON.MeshBuilder.CreateLines("ball-seam",{points:[new BABYLON.Vector3(-.28,.05,0),new BABYLON.Vector3(0,.05,.25),new BABYLON.Vector3(.28,.05,0),new BABYLON.Vector3(0,.05,-.25),new BABYLON.Vector3(-.28,.05,0)]},scene);seam.color=BABYLON.Color3.FromHexString("#1a2632");seam.parent=ball;seam.position.y=.05;
  const radarDots=players.map(p=>{const dot=document.createElement("span");dot.className="radar-player "+(p.team===0?"radar-home":"radar-away");dot.setAttribute("aria-hidden","true");miniMap.appendChild(dot);return {p,dot};});
  const radarBall=miniMap.querySelector(".mini-ball");
  function updateRadar(){for(const item of radarDots){item.dot.style.left=((item.p.root.position.x+55)/110*100)+"%";item.dot.style.top=((item.p.root.position.z+34)/68*100)+"%";}radarBall.style.left=((ball.position.x+55)/110*100)+"%";radarBall.style.top=((ball.position.z+34)/68*100)+"%";}
  let running=false, gameSeconds=0, homeScore=0, awayScore=0, owner=players[9], lastShooter=null, ballVelocity=new BABYLON.Vector3(0,0,0), ballVelocityY=0, actionIn=100, halftime=false, secondHalfStarted=false, matchEnded=false, lastClockMinute=-1, tacticalView=false, simulationSpeed=1;
  let currentFormation="442", teamStrategy="balanced";
  const stats={shots:[0,0],onTarget:[0,0],passes:[0,0],tackles:[0,0],saves:[0,0],possession:[0,0]};
  let possessionTeam=0, possessionClock=0, keeperSaveLock=0;
  function resetStats(){for(const key of Object.keys(stats))stats[key]=[0,0];possessionTeam=0;possessionClock=0;keeperSaveLock=0;updateStatsUI();}
  function updateStatsUI(){for(let t=0;t<2;t++){const side=t===0?"home":"away";$(""+side+"Shots").textContent=stats.shots[t];$(""+side+"OnTarget").textContent=stats.onTarget[t];$(""+side+"Passes").textContent=stats.passes[t];$(""+side+"Tackles").textContent=stats.tackles[t];}const total=stats.possession[0]+stats.possession[1];const pct=total?Math.round(stats.possession[0]/total*100):50;$("homePossession").textContent=pct+"%";$("awayPossession").textContent=(100-pct)+"%";}
  function notifyParentResult(){
    if(resultSent||matchParams.get("live")!=="1"||window.parent===window||!matchParams.get("fixture"))return;
    resultSent=true;
    const total=stats.possession[0]+stats.possession[1],homePoss=total?Math.round(stats.possession[0]/total*100):50;
    window.parent.postMessage({type:"PROJECT_ELEVEN_MATCH_RESULT",fixtureId:matchParams.get("fixture"),homeId:matchParams.get("homeId"),awayId:matchParams.get("awayId"),homeGoals:homeScore,awayGoals:awayScore,goals:goalTimeline.slice(),stats:{home:{shots:stats.shots[0],onTarget:stats.onTarget[0],passes:stats.passes[0],tackles:stats.tackles[0],saves:stats.saves[0],possession:homePoss},away:{shots:stats.shots[1],onTarget:stats.onTarget[1],passes:stats.passes[1],tackles:stats.tackles[1],saves:stats.saves[1],possession:100-homePoss}}},window.location.origin);
    log("نتیجه مسابقه به لیگ PROJECT ELEVEN ارسال شد.");
  }
  function recordPossession(dt){if(owner){possessionTeam=owner.team;possessionClock+=dt;if(possessionClock>=1){const whole=Math.floor(possessionClock);stats.possession[possessionTeam]+=whole;possessionClock-=whole;updateStatsUI();}}}
  const formations={
    "442":[[-49,0],[-35,-22],[-37,-8],[-37,8],[-35,22],[-17,-22],[-19,-7],[-19,7],[-17,22],[7,-10],[7,10]],
    "433":[[-49,0],[-35,-22],[-37,-8],[-37,8],[-35,22],[-17,-17],[-20,0],[-17,17],[8,-23],[10,0],[8,23]],
    "352":[[-49,0],[-35,-18],[-38,0],[-35,18],[-17,-27],[-19,-14],[-20,0],[-19,14],[-17,27],[7,-10],[7,10]]
  };
  function applyFormation(key,announce=true){currentFormation=key;const shape=formations[key]||formations["442"],opponentShape=formations["442"];players.forEach(p=>{const pos=(p.team===userTeam?shape:opponentShape)[p.idx];const x=p.team===0?pos[0]:-pos[0];p.home.set(x,0,pos[1]);p.target.copyFrom(p.home);});if(announce)log("آرایش تیم شما تغییر کرد: "+({"442":"۴-۴-۲","433":"۴-۳-۳","352":"۳-۵-۲"}[key]||key)+".");const status=$("tacticsStatus");if(status)status.textContent="آرایش: "+({"442":"۴-۴-۲","433":"۴-۳-۳","352":"۳-۵-۲"}[key]||key)+" · سبک: "+({"balanced":"متعادل","press":"پرس از جلو","defensive":"دفاعی","attack":"هجومی"}[teamStrategy]||teamStrategy);}
  function updateStrategy(key){teamStrategy=key;const status=$("tacticsStatus");if(status)status.textContent="آرایش: "+({"442":"۴-۴-۲","433":"۴-۳-۳","352":"۳-۵-۲"}[currentFormation]||currentFormation)+" · سبک: "+({"balanced":"متعادل","press":"پرس از جلو","defensive":"دفاعی","attack":"هجومی"}[teamStrategy]||teamStrategy);log("سبک بازی تغییر کرد: "+({"balanced":"متعادل","press":"پرس از جلو","defensive":"دفاعی","attack":"هجومی"}[key]||key)+".");}

  function log(message){const li=document.createElement("li");li.textContent=message;logEl.prepend(li);while(logEl.children.length>7)logEl.removeChild(logEl.lastChild);}
  function clock(){const minute=Math.min(90,Math.floor(gameSeconds/60));return String(minute).padStart(2,"0")+":"+String(Math.floor(gameSeconds%60)).padStart(2,"0");}
  function ui(){homeScoreEl.textContent=homeScore;awayScoreEl.textContent=awayScore;timeEl.textContent=clock();phaseEl.textContent=matchEnded?"پایان مسابقه":halftime?"پایان نیمه اول":running?"مسابقه در جریان":"آماده شروع";$("startBtn").textContent=halftime?"▶ شروع نیمه دوم":matchEnded?"✓ مسابقه تمام شد":"▶ شروع مسابقه";}
  function reset(){running=false;resetStats();goalTimeline=[];resultSent=false;lastShooter=null;gameSeconds=0;homeScore=0;awayScore=0;halftime=false;secondHalfStarted=false;matchEnded=false;lastClockMinute=-1;actionIn=100;ballVelocity.set(0,0,0);ballVelocityY=0;owner=players[9];ball.position.set(owner.root.position.x,.4,owner.root.position.z);players.forEach(p=>{p.root.position.copyFrom(p.home);p.target.copyFrom(p.home);p.stamina=100;p.kickTimer=0;p.diveTimer=0;p.root.rotation.z=0;});camera.setTarget(BABYLON.Vector3.Zero());logEl.innerHTML="";log("تیم‌ها آماده‌اند؛ بازی ۹۰ دقیقه‌ای با دو نیمه یک‌دقیقه‌ای شروع می‌شود.");ui();}
  function moveBallToOwner(){if(owner){ball.position.x=owner.root.position.x+Math.sin(owner.phase)*.6;ball.position.z=owner.root.position.z+Math.cos(owner.phase)*.55;ball.position.y=.4;ballVelocityY=0;}}
  function getTeam(team){return players.filter(p=>p.team===team);}
  function nearestOpponent(p){return getTeam(1-p.team).reduce((best,q)=>dist(p.root.position,q.root.position)<dist(p.root.position,best.root.position)?q:best,getTeam(1-p.team)[0]);}
  function chooseAction(manual=null){
    if(!owner)return;
    const team=owner.team, dir=team===0?1:-1, goalX=dir*52.5, progress=owner.root.position.x*dir;
    const nearest=nearestOpponent(owner), pressure=nearest?Math.max(0,1-dist(owner.root.position,nearest.root.position)/8):0;
    const goalDistance=Math.abs(goalX-owner.root.position.x), shootingLane=Math.abs(owner.root.position.z)<15;
    const strategyShot=team===userTeam?(teamStrategy==="attack"?.12:teamStrategy==="defensive"?-.08:0):0;
    const shotChance=clamp(.04+(progress>22?.12:0)+(progress>34?.18:0)+(shootingLane?.1:0)+(owner.shooting-70)/250+strategyShot, .02,.62);
    // If a team has not attempted a shot by the final half-hour, force its first sensible central attempt.
    // This prevents a whole simulated match from ending with no shots due to unlucky pass/dribble RNG.
    const forcedFirstShot=stats.shots[team]===0&&gameSeconds>=3600&&progress>-8&&Math.abs(owner.root.position.z)<24;
    let action=manual;
    if(!action){if((goalDistance<24&&shootingLane&&Math.random()<shotChance)||forcedFirstShot)action="shot";else if(pressure>(team===userTeam&&teamStrategy==="press"?.48:.65)&&Math.random()<(team===userTeam&&teamStrategy==="attack"?.4:.56))action="pass";else if(Math.random()<.22+owner.technique/280)action="dribble";else action="pass";}
    if(action==="shot"){
      lastShooter=owner;owner.kickTimer=.48;stats.shots[team]++;const quality=owner.shooting/100, technique=owner.technique/100, power=clamp(.58+quality*.38+rand(-.12,.1),.45,1);
      const accuracy=clamp((.24+quality*.48+technique*.18)*(1-pressure*.48),.12,.9);
      const targetZ=clamp(-owner.root.position.z*(.15+accuracy*.45)+rand(-1,1)*(1.4+(1-accuracy)*8),-8,8);if(Math.abs(targetZ)<3.66)stats.onTarget[team]++;updateStatsUI();
      const duration=clamp(goalDistance/(22+power*19),.55,1.8);
      ballVelocity.set((goalX-owner.root.position.x)/duration,0,(targetZ-owner.root.position.z)/duration);ballVelocityY=2.6*duration;
      owner=null;actionIn=rand(170,260);log("شوت! قدرت و دقت شوت روی مسیر توپ اثر گذاشت.");return;
    }
    if(action==="pass"){
      owner.kickTimer=.32;stats.passes[team]++;updateStatsUI();
      const teammates=getTeam(team).filter(p=>p!==owner);
      const candidates=teammates.map(p=>({p,score:(p.root.position.x*dir-owner.root.position.x*dir)*.75-Math.abs(p.root.position.z-owner.root.position.z)*.3+rand(-4,4)})).sort((a,b)=>b.score-a.score);
      const forward=candidates.filter(c=>(c.p.root.position.x-owner.root.position.x)*dir>-2);
      const receiver=(forward.length?forward:candidates)[0].p;
      const passSkill=owner.passing/100, technique=owner.technique/100, miss=rand(-1,1)*(1.3+(1-passSkill)*7+(1-technique)*3+pressure*3);
      const tx=receiver.root.position.x+dir*rand(0,2), tz=receiver.root.position.z+miss;
      const duration=clamp(dist(owner.root.position,{x:tx,z:tz})/(13+passSkill*12),.45,1.55);
      ballVelocity.set((tx-owner.root.position.x)/duration,0,(tz-owner.root.position.z)/duration);ballVelocityY=1.7*duration;owner=null;actionIn=rand(150,230);log("پاس "+(passSkill>.78?"دقیق":"با احتمال خطا")+" به فضای هم‌تیمی.");return;
    }
    // Dribbling: technical players retain the ball better and move into open space.
    const skill=owner.technique/100, escape=nearest?{x:owner.root.position.x+(owner.root.position.x-nearest.root.position.x)*.7,z:owner.root.position.z+(owner.root.position.z-nearest.root.position.z)*.7}:{x:owner.root.position.x+dir*5,z:owner.root.position.z};
    owner.kickTimer=.22;owner.target.set(clamp(owner.root.position.x+dir*(3+skill*4),-49,49),0,clamp(escape.z+rand(-2,2),-30,30));
    if(nearest&&dist(owner.root.position,nearest.root.position)<2.1&&Math.random()>(skill*.72)){stats.tackles[nearest.team]++;updateStatsUI();owner=nearest;owner.kickTimer=.18;ballVelocity.set(0,0,0);ballVelocityY=0;ball.position.set(owner.root.position.x,.4,owner.root.position.z);actionIn=rand(55,95);log("🛡️ تکل موفق؛ مدافع مالکیت توپ را گرفت.");}
    else{ballVelocity.set(0,0,0);actionIn=rand(80,140);log(skill>.78?"دریبل موفق و حرکت رو به جلو.":"بازیکن توپ را جلو می‌برد.");}
  }
  function restartAfterGoal(){lastShooter=null;ballVelocity.set(0,0,0);ballVelocityY=0;players.forEach(p=>{p.root.position.copyFrom(p.home);p.target.copyFrom(p.home);p.root.rotation.z=0;p.diveTimer=0;p.kickTimer=0;});owner=players[(homeScore+awayScore)%2===0?9:20];ball.position.set(owner.root.position.x,.4,owner.root.position.z);actionIn=110;}
  let goalBannerTimer=null;
  function showGoalBanner(team){const banner=$("goalBanner");if(!banner)return;$("goalBannerText").textContent="GOOOAL!";$("goalBannerScore").textContent=homeLabel+" "+homeScore+" — "+awayScore+" "+awayLabel;banner.classList.add("visible");clearTimeout(goalBannerTimer);goalBannerTimer=setTimeout(()=>banner.classList.remove("visible"),2600);}
  function goal(team){if(team===0)homeScore++;else awayScore++;const scorer=lastShooter&&lastShooter.team===team?lastShooter:null;goalTimeline.push({minute:clamp(Math.floor(gameSeconds/60),1,90),team,playerId:scorer?.playerId||null,playerName:scorer?.name||""});log("⚽ گل برای "+(team===0?homeLabel:awayLabel)+"!");showGoalBanner(team);restartAfterGoal();ui();}
  function update(dt){
    if(!running)return;
    dt*=simulationSpeed;
    gameSeconds+=dt*45; // 45 match minutes pass in 60 real seconds.
    if(gameSeconds>=2700&&!halftime&&!secondHalfStarted){gameSeconds=2700;running=false;halftime=true;log("⏸ پایان نیمه اول؛ برای شروع نیمه دوم دکمه را بزن.");ui();return;}
    if(gameSeconds>=5400){gameSeconds=5400;running=false;matchEnded=true;log("🏁 پایان مسابقه.");ui();notifyParentResult();return;}
    if(replayMode){if(replayGoalPending){replayGoalPending.remaining-=dt;if(replayGoalPending.remaining<=0){const scoredTeam=replayGoalPending.team;goal(scoredTeam);log("بازپخش · گل ثبت‌شده برای "+(scoredTeam===0?homeLabel:awayLabel)+".");replayGoalPending=null;}}else{const minute=Math.floor(gameSeconds/60),ev=replayGoals.find(x=>!x.done&&x.minute<=minute);if(ev){ev.done=true;if((ev.team===0&&homeScore<replayTargetHome)||(ev.team===1&&awayScore<replayTargetAway)){const shooter=players.find(p=>p.team===ev.team&&p.idx>8)||players.find(p=>p.team===ev.team);if(shooter){shooter.root.position.x=ev.team===0?38:-38;shooter.root.position.z=0;ball.position.set(shooter.root.position.x+(ev.team===0?1:-1),.4,0);ballVelocity.set(ev.team===0?25:-25,0,0);ballVelocityY=1.1;owner=null;replayGoalPending={team:ev.team,remaining:.62};log("⚽ "+ev.minute+"′ · "+(ev.team===0?homeLabel:awayLabel)+" به سمت دروازه شوت می‌زند!");}}}}while(!replayGoalPending&&homeScore<replayTargetHome&&replayGoals.every(ev=>ev.done)){goal(0)}while(!replayGoalPending&&awayScore<replayTargetAway&&replayGoals.every(ev=>ev.done)){goal(1)}}
    recordPossession(dt);keeperSaveLock=Math.max(0,keeperSaveLock-dt);actionIn-=dt*45;
    if(replayGoalPending){owner=null;}else if(owner){moveBallToOwner();if(actionIn<=0)chooseAction();}
    else{
      ball.position.x+=ballVelocity.x*dt;ball.position.z+=ballVelocity.z*dt;ball.rotation.x+=ballVelocity.z*dt*1.8;ball.rotation.z-=ballVelocity.x*dt*1.8;ballVelocityY-=5.2*dt;ball.position.y+=ballVelocityY*dt;if(ball.position.y<.36){ball.position.y=.36;ballVelocityY=Math.abs(ballVelocityY)*.2;if(ballVelocityY<.75)ballVelocityY=0;}ballVelocity.scaleInPlace(Math.pow(.988,dt*60));
      // Goalkeeper reaction and possible save before the ball crosses the goal line.
      if(!replayMode&&keeperSaveLock<=0&&ball.position.y<2.45&&Math.abs(ball.position.z)<7.5&&Math.abs(ball.position.x)>47.2){
        const defendingTeam=ball.position.x<0?0:1,keeper=players.find(p=>p.team===defendingTeam&&p.idx===0);
        const movingTowardGoal=defendingTeam===0?ballVelocity.x<0:ballVelocity.x>0;
        if(keeper&&movingTowardGoal){
          const reach=clamp(2.1+(keeper.goalkeeping-65)*.035,1.8,3.5);
          if(Math.abs(ball.position.z-keeper.root.position.z)<reach+1.2&&Math.random()<clamp(.28+(keeper.goalkeeping-60)*.012,.2,.72)){
            stats.saves[defendingTeam]++;keeper.diveTimer=.72;keeper.diveSide=Math.sign(ball.position.z-keeper.root.position.z)||1;keeper.root.position.z=clamp(ball.position.z,-6.5,6.5);
            ballVelocity.x=defendingTeam===0?Math.abs(ballVelocity.x)*.48:-Math.abs(ballVelocity.x)*.48;
            ballVelocity.z+=(Math.random()-.5)*8;ballVelocityY=Math.max(.8,ballVelocityY+.7);keeperSaveLock=.9;
            log("🧤 مهار دروازه‌بان "+(defendingTeam===0?homeLabel:awayLabel)+"!");updateStatsUI();
          }
        }
      }
      // Nearest player can intercept a pass or collect a loose ball.
      const nearest=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);
      if(nearest&&ball.position.y<1.55&&dist(nearest.root.position,ball.position)<1.55&&ball.position.x>-53.5&&ball.position.x<53.5){owner=nearest;possessionTeam=nearest.team;ballVelocity.set(0,0,0);ballVelocityY=0;actionIn=rand(45,100);log(nearest.idx===0?"🧤 دروازه‌بان توپ را مهار کرد.":nearest.team===0?"آبی‌ها توپ را کنترل کردند.":"سبزها توپ را کنترل کردند.");}
      if(Math.abs(ball.position.x)>52.5&&!owner){if(replayMode&&replayGoalPending){ball.position.x=Math.sign(ball.position.x)*53;ballVelocity.set(0,0,0);}else if(Math.abs(ball.position.z)<3.7&&ball.position.y<2.55&&!replayMode){goal(ball.position.x>0?0:1);}else{ball.position.x=clamp(ball.position.x,-52.4,52.4);ballVelocity.x*=-.35;owner=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);if(!replayMode)log("توپ از خط انتهایی بیرون رفت؛ مالکیت عوض شد.");}}
      // Recover a dead loose ball instead of letting play stall forever after a missed pass/interception.
      if(!replayMode&&!replayGoalPending&&!owner&&ball.position.y<.58&&ballVelocity.length()<1.6){owner=nearest;possessionTeam=nearest.team;ballVelocity.set(0,0,0);ballVelocityY=0;ball.position.set(nearest.root.position.x,.4,nearest.root.position.z);actionIn=rand(45,85);log("توپ متوقف شد؛ نزدیک‌ترین بازیکن مالکیت را گرفت و بازی ادامه یافت.");}
    }
    players.forEach(p=>{
      const dir=p.team===0?1:-1, ownBall=owner===p, isAttacking=owner&&owner.team===p.team;
      if(ownBall){p.target.set(clamp(p.root.position.x+dir*3,-49,49),0,p.root.position.z);}
      else if(owner&&owner.team!==p.team){const d=dist(p.root.position,owner.root.position);if(d<24){const pressDistance=teamStrategy==="press"&&p.team===userTeam?1.0:1.2;p.target.set(owner.root.position.x-dir*pressDistance,0,owner.root.position.z+(p.idx%2?2:-2));}else{p.target.set(p.home.x+(owner.root.position.x-p.home.x)*.16,0,p.home.z+(owner.root.position.z-p.home.z)*.16);}}
      else if(isAttacking){
        const roleOffset=p.idx>8?(p.team===userTeam&&teamStrategy==="attack"?15:11):p.idx>4?5:1.5;
        const lane=p.home.z*.72+clamp((ball.position.z-p.home.z)*.16,-4,4);
        p.target.set(clamp(p.home.x+dir*roleOffset+(p.idx>8?dir*2:0),-47,47),0,clamp(lane+(p.team===userTeam&&teamStrategy==="attack"&&p.idx>8?(p.idx%2?3:-3):0),-29,29));
      }
      else if(p.idx===0){
        const ownGoalX=p.team===0?-51.5:51.5, ballInOwnHalf=p.team===0?ball.position.x<5:ball.position.x>-5;
        p.target.set(ownGoalX,0,clamp(ballInOwnHalf?ball.position.z*.72:0,-6.5,6.5));
      }
      else if(owner&&owner.team!==p.team){
        const shift=clamp((ball.position.x-p.home.x)*.18,-7,7);
        p.target.set(clamp(p.home.x+shift,-47,47),0,clamp(p.home.z+(ball.position.z-p.home.z)*.12,-29,29));
      }
      else p.target.copyFrom(p.home);
      const dx=p.target.x-p.root.position.x,dz=p.target.z-p.root.position.z,d=Math.hypot(dx,dz),pace=(p.pace/75)*(p.stamina/100);
      const fatigue=clamp(p.stamina/100,.55,1), sprinting=!!(owner&&dist(p.root.position,owner.root.position)<8);const strategyBoost=p.team===userTeam?(teamStrategy==="press"&&sprinting?1.12:teamStrategy==="attack"&&isAttacking?1.1:teamStrategy==="defensive"&&!isAttacking?1.12:1):1;const step=Math.min(d,dt*(sprinting?6.2:4.1)*pace*fatigue*strategyBoost);
      if(d>.01){p.root.position.x+=dx/d*step;p.root.position.z+=dz/d*step;p.root.rotation.y=Math.atan2(dx,dz);}
      p.kickTimer=Math.max(0,p.kickTimer-dt);p.diveTimer=Math.max(0,p.diveTimer-dt);p.phase+=dt*(sprinting?8:5+p.pace/18);p.root.position.y=Math.abs(Math.sin(p.phase))*(d>.12?.055:.018);p.root.rotation.z=p.diveTimer>0?Math.sin((p.diveTimer/.72)*Math.PI)*p.diveSide*.82:Math.sin(p.kickTimer/.48*Math.PI)*.04;
      const stride=p.kickTimer>0?-.9*Math.sin((p.kickTimer/.48)*Math.PI):d>.12?Math.sin(p.phase)*.58:Math.sin(p.phase*.45)*.035;
      p.leg.rotation.z=stride;p.leg2.rotation.z=-stride;
      p.arm.rotation.z=-.18-stride*.48;p.arm2.rotation.z=.18+stride*.48;
      if(running)p.stamina=Math.max(48,p.stamina-dt*(d>.12?.18:.035));
    });
    camera.setTarget(new BABYLON.Vector3((ball.position.x||0)*.25,0,(ball.position.z||0)*.18));
    updateRadar();updateStatsUI();const minute=Math.floor(gameSeconds/60);if(minute!==lastClockMinute){lastClockMinute=minute;ui();}
  }
  $("startBtn").addEventListener("click",()=>{if(matchEnded){reset();}if(halftime){halftime=false;secondHalfStarted=true;running=true;log("▶ نیمه دوم شروع شد.");}else{running=true;log("مسابقه شروع شد؛ تصمیم‌های بازیکن‌ها بر اساس ویژگی‌هایشان محاسبه می‌شود.");}ui();});
  $("pauseBtn").addEventListener("click",()=>{running=false;log("مسابقه متوقف شد.");ui();});
  $("resetBtn").addEventListener("click",reset);
  $("formationSelect").addEventListener("change",e=>applyFormation(e.target.value));
  $("strategySelect").addEventListener("change",e=>updateStrategy(e.target.value));
  $("cameraBtn").addEventListener("click",()=>{tacticalView=!tacticalView;camera.beta=tacticalView?.16:1.08;camera.radius=tacticalView?112:102;camera.lowerBetaLimit=tacticalView?.12:.72;camera.upperBetaLimit=tacticalView?.35:1.35;$("cameraBtn").textContent=tacticalView?"🎥 نمای تلویزیونی":"🎥 نمای تاکتیکی";log(tacticalView?"نمای تاکتیکی از بالا فعال شد.":"نمای تلویزیونی فعال شد.");});
  $("speedBtn").addEventListener("click",()=>{simulationSpeed=simulationSpeed===1?2:simulationSpeed===2?4:simulationSpeed===4?8:simulationSpeed===8?.5:1;$("speedBtn").textContent="⏩ سرعت "+(simulationSpeed===.5?"۰٫۵×":simulationSpeed+"×");log("سرعت شبیه‌سازی تغییر کرد.");});
  $("passBtn").addEventListener("click",()=>{if(!running&&!halftime&&!matchEnded)running=true;if(!owner)owner=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);chooseAction("pass");ui();});
  $("shootBtn").addEventListener("click",()=>{if(!running&&!halftime&&!matchEnded)running=true;if(!owner)owner=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);chooseAction("shot");ui();});
  scene.onBeforeRenderObservable.add(()=>update(Math.min(engine.getDeltaTime()/1000,.05)));
  engine.runRenderLoop(()=>scene.render());window.addEventListener("resize",()=>engine.resize());
  canvas.addEventListener("dblclick",()=>{tacticalView=!tacticalView;camera.beta=tacticalView?.16:1.08;camera.radius=tacticalView?112:102;camera.lowerBetaLimit=tacticalView?.12:.72;camera.upperBetaLimit=tacticalView?.35:1.35;$("cameraBtn").textContent=tacticalView?"🎥 نمای تلویزیونی":"🎥 نمای تاکتیکی";});
  const requestedFormation=["442","433","352"].includes(matchParams.get("formation"))?matchParams.get("formation"):"442";const requestedStrategy=["balanced","press","defensive","attack"].includes(matchParams.get("strategy"))?matchParams.get("strategy"):"balanced";$("formationSelect").value=requestedFormation;$("strategySelect").value=requestedStrategy;scene.executeWhenReady(()=>loading.classList.add("hidden"));applyFormation(requestedFormation,false);updateStrategy(requestedStrategy);reset();updateRadar();if(replayMode){running=true;log("▶ بازپخش خودکار شروع شد؛ نتیجه نهایی با گزارش مسابقه هماهنگ است.");ui();}
})();