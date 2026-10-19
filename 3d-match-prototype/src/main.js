(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const canvas=$("gameCanvas"), loading=$("loading"), homeScoreEl=$("homeScore"), awayScoreEl=$("awayScore"), timeEl=$("matchTime"), phaseEl=$("phaseLabel"), logEl=$("eventLog");
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const matchParams=new URLSearchParams(window.location.search);
  if(matchParams.get("home"))$("homeTeamName").textContent=matchParams.get("home");
  if(matchParams.get("away"))$("awayTeamName").textContent=matchParams.get("away");
  const replayMode=matchParams.has("hg")&&matchParams.has("ag");
  const replayTargetHome=Math.max(0,Number(matchParams.get("hg"))||0),replayTargetAway=Math.max(0,Number(matchParams.get("ag"))||0);
  const replayGoals=(matchParams.get("goals")||"").split(",").filter(Boolean).map(v=>{const q=v.split(":");return {minute:clamp(Number(q[0])||1,1,89),team:Number(q[1])===1?1:0,done:false}}).sort((a,b)=>a.minute-b.minute);
  const homeLabel=matchParams.get("home")||"آبی‌ها",awayLabel=matchParams.get("away")||"سبزها";
  let replayGoalPending=null;
  const engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
  const scene=new BABYLON.Scene(engine); scene.clearColor=new BABYLON.Color4(.025,.055,.085,1);
  const camera=new BABYLON.ArcRotateCamera("broadcast-camera",-Math.PI/2,1.08,102,new BABYLON.Vector3(0,0,0),scene);
  camera.lowerRadiusLimit=68;camera.upperRadiusLimit=120;camera.lowerBetaLimit=.72;camera.upperBetaLimit=1.35;camera.wheelPrecision=45;camera.panningSensibility=0;camera.attachControl(canvas,true);
  const hemi=new BABYLON.HemisphericLight("ambient",new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.95;
  const sun=new BABYLON.DirectionalLight("stadium-light",new BABYLON.Vector3(-.35,-1,.25),scene);sun.position=new BABYLON.Vector3(0,35,-20);sun.intensity=.65;
  const mat=(name,color,emissive=null)=>{const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(color);if(emissive)m.emissiveColor=BABYLON.Color3.FromHexString(emissive);return m;};
  const grassA=mat("grass-a","#26784c"),grassB=mat("grass-b","#2c8553"),lineMat=mat("field-lines","#e7f5e9"),blueMat=mat("blue-kit","#168cff","#04284c"),greenMat=mat("green-kit","#28d99b","#063d2c"),skinMat=mat("skin","#d7a77e"),darkMat=mat("boots","#14202b"),ballMat=mat("ball-white","#f7f8f6"),goalMat=mat("goal-frame","#f4f7fa"),standMat=mat("stand","#17283b"),seatMat=mat("seat","#31455b");
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
    const root=new BABYLON.TransformNode("player-"+team+"-"+idx,scene);
    const body=BABYLON.MeshBuilder.CreateCapsule("body",{height:1.55,radius:.34,tessellation:8,subdivisions:2},scene);body.parent=root;body.position.y=.94;body.material=team===0?blueMat:greenMat;
    const head=BABYLON.MeshBuilder.CreateSphere("head",{diameter:.48,segments:10},scene);head.parent=root;head.position.y=1.92;head.material=skinMat;
    const leg=BABYLON.MeshBuilder.CreateBox("leg",{width:.19,height:.62,depth:.22},scene);leg.parent=root;leg.position.set(-.16,.31,0);leg.material=darkMat;const leg2=leg.clone("leg");leg2.parent=root;leg2.position.x=.16;
    const arm=BABYLON.MeshBuilder.CreateCapsule("arm",{height:.82,radius:.13,tessellation:7,subdivisions:1},scene);arm.parent=root;arm.position.set(-.43,1.12,0);arm.rotation.z=-.18;arm.material=team===0?blueMat:greenMat;const arm2=arm.clone("arm");arm2.parent=root;arm2.position.x=.43;arm2.rotation.z=.18;
    const shorts=BABYLON.MeshBuilder.CreateBox("shorts",{width:.52,height:.28,depth:.34},scene);shorts.parent=root;shorts.position.y=.48;shorts.material=team===0?blueMat:greenMat;
    root.position.set(x,0,z);root.rotation.y=team===0?Math.PI/2:-Math.PI/2;
    // Individual ratings drive choices and ball execution; keep ratings different player to player.
    const p={team,idx,root,leg,leg2,arm,arm2,home:new BABYLON.Vector3(x,0,z),target:new BABYLON.Vector3(x,0,z),phase:rand(0,6.28),pace:rand(62,94),passing:rand(48,96),shooting:rand(42,96),technique:rand(45,97),control:rand(48,95),defending:rand(45,94),stamina:100};
    players.push(p);return p;
  }
  const homeFormation=[[-45,0],[-36,-22],[-36,-8],[-36,8],[-36,22],[-20,-24],[-20,-8],[-20,8],[-20,24],[-7,-9],[-7,9]];
  const awayFormation=[[45,0],[36,-22],[36,-8],[36,8],[36,22],[20,-24],[20,-8],[20,8],[20,24],[7,-9],[7,9]];
  homeFormation.forEach((p,i)=>makePlayer(0,i,p[0],p[1]));awayFormation.forEach((p,i)=>makePlayer(1,i,p[0],p[1]));
  const ball=BABYLON.MeshBuilder.CreateSphere("match-ball",{diameter:.72,segments:20},scene);ball.position.set(-7,.4,-9);ball.material=ballMat;
  const seam=BABYLON.MeshBuilder.CreateLines("ball-seam",{points:[new BABYLON.Vector3(-.28,.05,0),new BABYLON.Vector3(0,.05,.25),new BABYLON.Vector3(.28,.05,0),new BABYLON.Vector3(0,.05,-.25),new BABYLON.Vector3(-.28,.05,0)]},scene);seam.color=BABYLON.Color3.FromHexString("#1a2632");seam.parent=ball;seam.position.y=.05;
  let running=false, gameSeconds=0, homeScore=0, awayScore=0, owner=players[9], ballVelocity=new BABYLON.Vector3(0,0,0), ballVelocityY=0, actionIn=100, halftime=false, secondHalfStarted=false, matchEnded=false, lastClockMinute=-1, tacticalView=false, simulationSpeed=1;
  function log(message){const li=document.createElement("li");li.textContent=message;logEl.prepend(li);while(logEl.children.length>7)logEl.removeChild(logEl.lastChild);}
  function clock(){const minute=Math.min(90,Math.floor(gameSeconds/60));return String(minute).padStart(2,"0")+":"+String(Math.floor(gameSeconds%60)).padStart(2,"0");}
  function ui(){homeScoreEl.textContent=homeScore;awayScoreEl.textContent=awayScore;timeEl.textContent=clock();phaseEl.textContent=matchEnded?"پایان مسابقه":halftime?"پایان نیمه اول":running?"مسابقه در جریان":"آماده شروع";$("startBtn").textContent=halftime?"▶ شروع نیمه دوم":matchEnded?"✓ مسابقه تمام شد":"▶ شروع مسابقه";}
  function reset(){running=false;gameSeconds=0;homeScore=0;awayScore=0;halftime=false;secondHalfStarted=false;matchEnded=false;lastClockMinute=-1;actionIn=100;ballVelocity.set(0,0,0);ballVelocityY=0;owner=players[9];ball.position.set(owner.root.position.x,.4,owner.root.position.z);players.forEach(p=>{p.root.position.copyFrom(p.home);p.target.copyFrom(p.home);p.stamina=100;});camera.setTarget(BABYLON.Vector3.Zero());logEl.innerHTML="";log("تیم‌ها آماده‌اند؛ بازی ۹۰ دقیقه‌ای با دو نیمه یک‌دقیقه‌ای شروع می‌شود.");ui();}
  function moveBallToOwner(){if(owner){ball.position.x=owner.root.position.x+Math.sin(owner.phase)*.6;ball.position.z=owner.root.position.z+Math.cos(owner.phase)*.55;ball.position.y=.4;ballVelocityY=0;}}
  function getTeam(team){return players.filter(p=>p.team===team);}
  function nearestOpponent(p){return getTeam(1-p.team).reduce((best,q)=>dist(p.root.position,q.root.position)<dist(p.root.position,best.root.position)?q:best,getTeam(1-p.team)[0]);}
  function chooseAction(manual=null){
    if(!owner)return;
    const team=owner.team, dir=team===0?1:-1, goalX=dir*52.5, progress=owner.root.position.x*dir;
    const nearest=nearestOpponent(owner), pressure=nearest?Math.max(0,1-dist(owner.root.position,nearest.root.position)/8):0;
    const goalDistance=Math.abs(goalX-owner.root.position.x), shootingLane=Math.abs(owner.root.position.z)<15;
    const shotChance=clamp(.04+(progress>22?.12:0)+(progress>34?.18:0)+(shootingLane?.1:0)+(owner.shooting-70)/250, .02,.62);
    let action=manual;
    if(!action){if(goalDistance<24&&shootingLane&&Math.random()<shotChance)action="shot";else if(pressure>.65&&Math.random()<.56)action="pass";else if(Math.random()<.22+owner.technique/280)action="dribble";else action="pass";}
    if(action==="shot"){
      const quality=owner.shooting/100, technique=owner.technique/100, power=clamp(.58+quality*.38+rand(-.12,.1),.45,1);
      const accuracy=clamp((.24+quality*.48+technique*.18)*(1-pressure*.48),.12,.9);
      const targetZ=clamp(-owner.root.position.z*(.15+accuracy*.45)+rand(-1,1)*(1.4+(1-accuracy)*8),-8,8);
      const duration=clamp(goalDistance/(22+power*19),.55,1.8);
      ballVelocity.set((goalX-owner.root.position.x)/duration,0,(targetZ-owner.root.position.z)/duration);ballVelocityY=2.6*duration;
      owner=null;actionIn=rand(170,260);log("شوت! قدرت و دقت شوت روی مسیر توپ اثر گذاشت.");return;
    }
    if(action==="pass"){
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
    owner.target.set(clamp(owner.root.position.x+dir*(3+skill*4),-49,49),0,clamp(escape.z+rand(-2,2),-30,30));
    if(nearest&&dist(owner.root.position,nearest.root.position)<2.1&&Math.random()>(skill*.72)){owner=null;ballVelocity.set(-dir*rand(2,7),0,rand(-4,4));ballVelocityY=.5;log("مدافع توپ را از بازیکن گرفت.");}
    else{ballVelocity.set(0,0,0);actionIn=rand(80,140);log(skill>.78?"دریبل موفق و حرکت رو به جلو.":"بازیکن توپ را جلو می‌برد.");}
  }
  function restartAfterGoal(){ballVelocity.set(0,0,0);ballVelocityY=0;players.forEach(p=>{p.root.position.copyFrom(p.home);p.target.copyFrom(p.home);});owner=players[(homeScore+awayScore)%2===0?9:20];ball.position.set(owner.root.position.x,.4,owner.root.position.z);actionIn=110;}
  function goal(team){if(team===0)homeScore++;else awayScore++;log("⚽ گل برای "+(team===0?homeLabel:awayLabel)+"!");restartAfterGoal();ui();}
  function update(dt){
    if(!running)return;
    dt*=simulationSpeed;
    gameSeconds+=dt*45; // 45 match minutes pass in 60 real seconds.
    if(gameSeconds>=2700&&!halftime&&!secondHalfStarted){gameSeconds=2700;running=false;halftime=true;log("⏸ پایان نیمه اول؛ برای شروع نیمه دوم دکمه را بزن.");ui();return;}
    if(gameSeconds>=5400){gameSeconds=5400;running=false;matchEnded=true;log("🏁 پایان مسابقه.");ui();return;}
    if(replayMode){if(replayGoalPending){replayGoalPending.remaining-=dt;if(replayGoalPending.remaining<=0){const scoredTeam=replayGoalPending.team;goal(scoredTeam);log("بازپخش · گل ثبت‌شده برای "+(scoredTeam===0?homeLabel:awayLabel)+".");replayGoalPending=null;}}else{const minute=Math.floor(gameSeconds/60),ev=replayGoals.find(x=>!x.done&&x.minute<=minute);if(ev){ev.done=true;if((ev.team===0&&homeScore<replayTargetHome)||(ev.team===1&&awayScore<replayTargetAway)){const shooter=players.find(p=>p.team===ev.team&&p.idx>8)||players.find(p=>p.team===ev.team);if(shooter){shooter.root.position.x=ev.team===0?38:-38;shooter.root.position.z=0;ball.position.set(shooter.root.position.x+(ev.team===0?1:-1),.4,0);ballVelocity.set(ev.team===0?25:-25,0,0);ballVelocityY=1.1;owner=null;replayGoalPending={team:ev.team,remaining:.62};log("⚽ "+ev.minute+"′ · "+(ev.team===0?homeLabel:awayLabel)+" به سمت دروازه شوت می‌زند!");}}}}while(!replayGoalPending&&homeScore<replayTargetHome&&replayGoals.every(ev=>ev.done)){goal(0)}while(!replayGoalPending&&awayScore<replayTargetAway&&replayGoals.every(ev=>ev.done)){goal(1)}}
    actionIn-=dt*45;
    if(replayGoalPending){owner=null;}else if(owner){moveBallToOwner();if(actionIn<=0)chooseAction();}
    else{
      ball.position.x+=ballVelocity.x*dt;ball.position.z+=ballVelocity.z*dt;ballVelocityY-=5.2*dt;ball.position.y+=ballVelocityY*dt;if(ball.position.y<.36){ball.position.y=.36;ballVelocityY=Math.abs(ballVelocityY)*.2;if(ballVelocityY<.75)ballVelocityY=0;}ballVelocity.scaleInPlace(Math.pow(.988,dt*60));
      // Nearest player can intercept a pass or collect a loose ball.
      const nearest=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);
      if(nearest&&ball.position.y<1.55&&dist(nearest.root.position,ball.position)<1.55&&ball.position.x>-53.5&&ball.position.x<53.5){owner=nearest;ballVelocity.set(0,0,0);ballVelocityY=0;actionIn=rand(45,100);log((nearest.idx===0||nearest.idx===11)?"🧤 دروازه‌بان توپ را مهار کرد.":nearest.team===0?"آبی‌ها توپ را کنترل کردند.":"سبزها توپ را کنترل کردند.");}
      if(Math.abs(ball.position.x)>52.5&&!owner){if(replayMode&&replayGoalPending){ball.position.x=Math.sign(ball.position.x)*53;ballVelocity.set(0,0,0);}else if(Math.abs(ball.position.z)<3.7&&ball.position.y<2.55&&!replayMode){goal(ball.position.x>0?0:1);}else{ball.position.x=clamp(ball.position.x,-52.4,52.4);ballVelocity.x*=-.35;owner=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);if(!replayMode)log("توپ از خط انتهایی بیرون رفت؛ مالکیت عوض شد.");}}
    }
    players.forEach(p=>{
      const dir=p.team===0?1:-1, ownBall=owner===p, isAttacking=owner&&owner.team===p.team;
      if(ownBall){p.target.set(clamp(p.root.position.x+dir*3,-49,49),0,p.root.position.z);}
      else if(owner&&owner.team!==p.team){const d=dist(p.root.position,owner.root.position);if(d<24){p.target.set(owner.root.position.x-dir*1.2,0,owner.root.position.z+(p.idx%2?2:-2));}else{p.target.set(p.home.x+(owner.root.position.x-p.home.x)*.16,0,p.home.z+(owner.root.position.z-p.home.z)*.16);}}
      else if(isAttacking){const forward=p.idx>8?10:4;p.target.set(clamp(p.home.x+dir*forward,-47,47),0,p.home.z);}
      else if((p.idx===0||p.idx===11)&&!owner&&Math.abs(ball.position.x)>31&&(p.team===0?ball.position.x<0:ball.position.x>0)){p.target.set(p.home.x,0,clamp(ball.position.z,-6.2,6.2));}
      else p.target.copyFrom(p.home);
      const dx=p.target.x-p.root.position.x,dz=p.target.z-p.root.position.z,d=Math.hypot(dx,dz),pace=(p.pace/75)*(p.stamina/100);
      const step=Math.min(d,dt*(owner&&dist(p.root.position,owner.root.position)<8?5.5*pace:3.4*pace));
      if(d>.01){p.root.position.x+=dx/d*step;p.root.position.z+=dz/d*step;p.root.rotation.y=Math.atan2(dx,dz);}
      p.phase+=dt*(5+p.pace/18);p.root.position.y=Math.abs(Math.sin(p.phase))*.035;
      const stride=d>.12?Math.sin(p.phase)*.58:Math.sin(p.phase*.45)*.035;
      p.leg.rotation.z=stride;p.leg2.rotation.z=-stride;
      p.arm.rotation.z=-.18-stride*.48;p.arm2.rotation.z=.18+stride*.48;
      if(running)p.stamina=Math.max(55,p.stamina-dt*.025);
    });
    camera.setTarget(new BABYLON.Vector3((ball.position.x||0)*.25,0,(ball.position.z||0)*.18));
    const minute=Math.floor(gameSeconds/60);if(minute!==lastClockMinute){lastClockMinute=minute;ui();}
  }
  $("startBtn").addEventListener("click",()=>{if(matchEnded){reset();}if(halftime){halftime=false;secondHalfStarted=true;running=true;log("▶ نیمه دوم شروع شد.");}else{running=true;log("مسابقه شروع شد؛ تصمیم‌های بازیکن‌ها بر اساس ویژگی‌هایشان محاسبه می‌شود.");}ui();});
  $("pauseBtn").addEventListener("click",()=>{running=false;log("مسابقه متوقف شد.");ui();});
  $("resetBtn").addEventListener("click",reset);
  $("cameraBtn").addEventListener("click",()=>{tacticalView=!tacticalView;camera.beta=tacticalView?.16:1.08;camera.radius=tacticalView?112:102;camera.lowerBetaLimit=tacticalView?.12:.72;camera.upperBetaLimit=tacticalView?.35:1.35;$("cameraBtn").textContent=tacticalView?"🎥 نمای تلویزیونی":"🎥 نمای تاکتیکی";log(tacticalView?"نمای تاکتیکی از بالا فعال شد.":"نمای تلویزیونی فعال شد.");});
  $("speedBtn").addEventListener("click",()=>{simulationSpeed=simulationSpeed===1?2:simulationSpeed===2?.5:1;$("speedBtn").textContent="⏩ سرعت "+(simulationSpeed===.5?"۰٫۵×":simulationSpeed+"×");log("سرعت شبیه‌سازی تغییر کرد.");});
  $("passBtn").addEventListener("click",()=>{if(!running&&!halftime&&!matchEnded)running=true;if(!owner)owner=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);chooseAction("pass");ui();});
  $("shootBtn").addEventListener("click",()=>{if(!running&&!halftime&&!matchEnded)running=true;if(!owner)owner=players.reduce((best,p)=>dist(p.root.position,ball.position)<dist(best.root.position,ball.position)?p:best,players[0]);chooseAction("shot");ui();});
  scene.onBeforeRenderObservable.add(()=>update(Math.min(engine.getDeltaTime()/1000,.05)));
  engine.runRenderLoop(()=>scene.render());window.addEventListener("resize",()=>engine.resize());
  canvas.addEventListener("dblclick",()=>{tacticalView=!tacticalView;camera.beta=tacticalView?.16:1.08;camera.radius=tacticalView?112:102;camera.lowerBetaLimit=tacticalView?.12:.72;camera.upperBetaLimit=tacticalView?.35:1.35;$("cameraBtn").textContent=tacticalView?"🎥 نمای تلویزیونی":"🎥 نمای تاکتیکی";});
  scene.executeWhenReady(()=>loading.classList.add("hidden"));reset();if(replayMode){running=true;log("▶ بازپخش خودکار شروع شد؛ نتیجه نهایی با گزارش مسابقه هماهنگ است.");ui();}
})();