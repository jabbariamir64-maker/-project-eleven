(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  const loading = document.getElementById("loading");
  const homeScoreEl = document.getElementById("homeScore");
  const awayScoreEl = document.getElementById("awayScore");
  const timeEl = document.getElementById("matchTime");
  const phaseEl = document.getElementById("phaseLabel");
  const logEl = document.getElementById("eventLog");
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.025, 0.055, 0.085, 1);
  scene.collisionsEnabled = true;
  const camera = new BABYLON.ArcRotateCamera("broadcast-camera", -Math.PI / 2, 1.08, 102, new BABYLON.Vector3(0, 0, 0), scene);
  camera.lowerRadiusLimit = 68; camera.upperRadiusLimit = 120; camera.lowerBetaLimit = 0.72; camera.upperBetaLimit = 1.35;
  camera.wheelPrecision = 45; camera.panningSensibility = 0; camera.attachControl(canvas, true);
  const light = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene); light.intensity = 0.95;
  const sun = new BABYLON.DirectionalLight("stadium-light", new BABYLON.Vector3(-0.35, -1, 0.25), scene); sun.position = new BABYLON.Vector3(0, 35, -20); sun.intensity = 0.65;
  const mat = (name, color, emissive = null) => { const m = new BABYLON.StandardMaterial(name, scene); m.diffuseColor = BABYLON.Color3.FromHexString(color); if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(emissive); return m; };
  const grassA = mat("grass-a", "#26784c"), grassB = mat("grass-b", "#2c8553"), lineMat = mat("field-lines", "#e7f5e9"), blueMat = mat("blue-kit", "#168cff", "#04284c"), greenMat = mat("green-kit", "#28d99b", "#063d2c"), skinMat = mat("skin", "#d7a77e"), darkMat = mat("boots", "#14202b"), ballMat = mat("ball-white", "#f7f8f6"), blackMat = mat("ball-detail", "#18222d"), goalMat = mat("goal-frame", "#f4f7fa");
  const ground = BABYLON.MeshBuilder.CreateGround("pitch", { width: 105, height: 68, subdivisions: 2 }, scene); ground.material = grassA; ground.position.y = -0.15;
  // Alternating pitch bands, all positioned on the actual ground plane.
  for (let i = 0; i < 10; i++) { const band = BABYLON.MeshBuilder.CreateGround("stripe-" + i, { width: 10.5, height: 68 }, scene); band.position.set(-47.25 + i * 10.5, -0.12, 0); band.material = i % 2 ? grassA : grassB; }
  function line(name, points, color = lineMat, width = 0.13) { const mesh = BABYLON.MeshBuilder.CreateLines(name, { points: points.map(p => new BABYLON.Vector3(p[0], 0.015, p[1])) }, scene); mesh.color = color.diffuseColor; mesh.alpha = 0.95; return mesh; }
  function rect(x1,z1,x2,z2) { line("marking", [[x1,z1],[x2,z1],[x2,z2],[x1,z2],[x1,z1]]); }
  rect(-52.5,-34,52.5,34); line("halfway",[ [0,-34],[0,34] ]);
  const circlePts=[]; for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;circlePts.push([9.15*Math.cos(a),9.15*Math.sin(a)]);} line("centre-circle",circlePts); 
  const spot = BABYLON.MeshBuilder.CreateSphere("centre-spot",{diameter:0.48,segments:12},scene); spot.position.set(0,0.04,0); spot.scaling.y=0.08; spot.material=lineMat;
  for(const sign of [-1,1]) { const x=sign*52.5; rect(sign*41.5,-20.16,sign*52.4,20.16); rect(sign*47.0,-9.16,sign*52.4,9.16); const p=[]; for(let i=0;i<=36;i++){const a=(i/36)*Math.PI/2; p.push([sign*(41.5+9.15*Math.cos(a)),9.15*Math.sin(a)]);} line("penalty-arc",p); 
    const gx=sign*53.2; const posts=[[-3.66,0],[3.66,0],[-3.66,2.6],[3.66,2.6]]; 
    const post1=BABYLON.MeshBuilder.CreateBox("goalpost",{width:0.22,height:2.6,depth:0.22},scene);post1.position.set(gx,1.15,-3.66);post1.material=goalMat;
    const post2=post1.clone("goalpost");post2.position.z=3.66;
    const bar=BABYLON.MeshBuilder.CreateBox("goalbar",{width:0.22,height:0.22,depth:7.32},scene);bar.position.set(gx,2.45,0);bar.material=goalMat;
    const netMat=mat("net-"+sign,"#a7c3d5"); netMat.alpha=0.15; const back=BABYLON.MeshBuilder.CreateBox("net-back",{width:1.7,height:2.4,depth:7.2},scene);back.position.set(sign*54.0,1.2,0);back.material=netMat;
  }
  // Low stands provide a sense of scale without expensive crowd geometry.
  const standMat=mat("stand","#17283b"), seatMat=mat("seat","#31455b");
  for(const side of [-1,1]){const stand=BABYLON.MeshBuilder.CreateBox("stand",{width:112,height:5,depth:7},scene);stand.position.set(0,1.8,side*39);stand.material=standMat;for(let r=0;r<3;r++){const row=BABYLON.MeshBuilder.CreateBox("seat-row",{width:108,height:0.16,depth:0.4},scene);row.position.set(0,0.4+r*0.65,side*(36.5+r*1.6));row.material=seatMat;}}
  const players=[];
  function makePlayer(team, idx, x, z) {
    const root=new BABYLON.TransformNode("player-"+team+"-"+idx,scene);
    const body=BABYLON.MeshBuilder.CreateCapsule("body",{height:1.55,radius:0.34,tessellation:8,subdivisions:2},scene);body.parent=root;body.position.y=0.94;body.material=team===0?blueMat:greenMat;
    const head=BABYLON.MeshBuilder.CreateSphere("head",{diameter:0.48,segments:10},scene);head.parent=root;head.position.y=1.92;head.material=skinMat;
    const leg1=BABYLON.MeshBuilder.CreateBox("leg",{width:0.19,height:0.62,depth:0.22},scene);leg1.parent=root;leg1.position.set(-0.16,0.31,0);leg1.material=darkMat;
    const leg2=leg1.clone("leg");leg2.parent=root;leg2.position.x=0.16;
    root.position.set(x,0,z);root.rotation.y=team===0?Math.PI/2:-Math.PI/2;
    const p={team,idx,root,home:new BABYLON.Vector3(x,0,z),target:new BABYLON.Vector3(x,0,z),phase:Math.random()*6.28};players.push(p);return p;
  }
  const homeFormation=[[-45,0],[-36,-22],[-36,-8],[-36,8],[-36,22],[-20,-24],[-20,-8],[-20,8],[-20,24],[-7,-9],[-7,9]];
  const awayFormation=[[45,0],[36,-22],[36,-8],[36,8],[36,22],[20,-24],[20,-8],[20,8],[20,24],[7,-9],[7,9]];
  homeFormation.forEach((p,i)=>makePlayer(0,i,p[0],p[1]));awayFormation.forEach((p,i)=>makePlayer(1,i,p[0],p[1]));
  const ball=BABYLON.MeshBuilder.CreateSphere("match-ball",{diameter:0.72,segments:20},scene);ball.position.set(0,0.4,0);ball.material=ballMat;
  const ballMark=BABYLON.MeshBuilder.CreateLines("ball-seam",{points:[new BABYLON.Vector3(-0.28,0.05,0),new BABYLON.Vector3(0,0.05,0.25),new BABYLON.Vector3(0.28,0.05,0),new BABYLON.Vector3(0,0.05,-0.25),new BABYLON.Vector3(-0.28,0.05,0)]},scene);ballMark.color=BABYLON.Color3.FromHexString("#1a2632");ballMark.parent=ball;ballMark.position.y=0.05;
  let running=false, matchSeconds=0, homeScore=0, awayScore=0, ballVelocity=new BABYLON.Vector3(0,0,0), nextAction=2.8, actionCount=0, lastEvent=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function log(text){const li=document.createElement("li");li.textContent=text;logEl.prepend(li);while(logEl.children.length>6)logEl.removeChild(logEl.lastChild);}
  function ui(){homeScoreEl.textContent=homeScore;awayScoreEl.textContent=awayScore;timeEl.textContent=String(Math.floor(matchSeconds/60)).padStart(2,"0")+":"+String(Math.floor(matchSeconds%60)).padStart(2,"0");phaseEl.textContent=running?"مسابقه در جریان":matchSeconds>0?"مسابقه متوقف":"آماده شروع";}
  function reset(){running=false;matchSeconds=0;homeScore=0;awayScore=0;ballVelocity.set(0,0,0);ball.position.set(0,0.4,0);players.forEach(p=>{p.root.position.copyFrom(p.home);p.target.copyFrom(p.home)});camera.setTarget(BABYLON.Vector3.Zero());logEl.innerHTML="";log("مسابقه آماده است؛ شروع را بزن.");ui();}
  function chooseAction(force){const attackTeam=(actionCount%2===0)?0:1;const direction=attackTeam===0?1:-1;const active=players.filter(p=>p.team===attackTeam);const passer=active.reduce((best,p)=>BABYLON.Vector3.Distance(p.root.position,ball.position)<BABYLON.Vector3.Distance(best.root.position,ball.position)?p:best,active[0]);if(BABYLON.Vector3.Distance(passer.root.position,ball.position)>7){ball.position.x=passer.root.position.x;ball.position.z=passer.root.position.z;ball.position.y=0.4;}
    const isShot=force==="shot"||(!force&&Math.random()<0.32);if(isShot){ballVelocity.set(direction*(force==="shot"?28:21),0,(Math.random()-0.5)*(force==="shot"?7:12));log((attackTeam===0?"آبی‌ها":"سبزها")+" شوت زدند.");}else{const receiver=active.filter(p=>p!==passer).sort((a,b)=>(direction*b.root.position.x-direction*a.root.position.x))[0];ballVelocity.set(direction*(force==="pass"?11:8),0,(receiver.root.position.z-ball.position.z)*0.75);log((attackTeam===0?"آبی‌ها":"سبزها")+" پاس دادند.");}
    actionCount++;lastEvent=matchSeconds;nextAction=matchSeconds+(force?4:3+Math.random()*2);
  }
  function goal(team){if(team===0)homeScore++;else awayScore++;log("⚽ گل برای "+(team===0?"آبی‌ها":"سبزها")+"! گل پس از عبور توپ از خط دروازه ثبت شد.");ballVelocity.set(0,0,0);ball.position.set(0,0.4,0);players.forEach(p=>{p.root.position.copyFrom(p.home);p.target.copyFrom(p.home)});nextAction=matchSeconds+2;ui();}
  function update(dt){if(!running)return;matchSeconds+=dt;nextAction-=dt;
    if(nextAction<=0)chooseAction(null);
    ball.position.x+=ballVelocity.x*dt;ball.position.z+=ballVelocity.z*dt;ballVelocity.scaleInPlace(Math.pow(0.985,dt*60));ball.position.z=clamp(ball.position.z,-32.5,32.5);
    if(Math.abs(ball.position.x)>52.5){if(Math.abs(ball.position.z)<=3.66&&ball.position.x*(ballVelocity.x)>=0){goal(ball.position.x>0?0:1);}else{ball.position.x=clamp(ball.position.x,-52.5,52.5);ballVelocity.x*=-0.45;log("توپ از خط انتهایی بیرون رفت.");}}
    players.forEach(p=>{const d=BABYLON.Vector3.Distance(p.root.position,ball.position);if(d<23){const chase=p.team===(ball.position.x>0?0:1);if(chase){p.target.x=clamp(ball.position.x+(p.team===0?-2:2),-49,49);p.target.z=clamp(ball.position.z+(p.idx%2?3:-3),-31,31);}else{p.target.x=p.home.x+(ball.position.x-p.home.x)*0.12;p.target.z=p.home.z+(ball.position.z-p.home.z)*0.12;}}else p.target.copyFrom(p.home);
      const dx=p.target.x-p.root.position.x,dz=p.target.z-p.root.position.z,dist=Math.hypot(dx,dz),step=Math.min(dist,dt*(d<8?5.5:3.3));if(dist>0.01){p.root.position.x+=dx/dist*step;p.root.position.z+=dz/dist*step;p.root.rotation.y=Math.atan2(dx,dz);}p.phase+=dt*7;p.root.position.y=Math.abs(Math.sin(p.phase))*0.035;});
    camera.setTarget(new BABYLON.Vector3(ball.position.x*0.25,0,ball.position.z*0.18));ui();
  }
  document.getElementById("startBtn").addEventListener("click",()=>{running=true;log("مسابقه شروع شد.");ui();});
  document.getElementById("pauseBtn").addEventListener("click",()=>{running=false;log("مسابقه متوقف شد.");ui();});
  document.getElementById("resetBtn").addEventListener("click",reset);
  document.getElementById("passBtn").addEventListener("click",()=>{if(!running){running=true;}chooseAction("pass");ui();});
  document.getElementById("shootBtn").addEventListener("click",()=>{if(!running){running=true;}chooseAction("shot");ui();});
  scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(engine.getDeltaTime()/1000,0.05);update(dt);});
  engine.runRenderLoop(()=>scene.render());
  window.addEventListener("resize",()=>engine.resize());
  scene.executeWhenReady(()=>loading.classList.add("hidden"));
  reset();
})();