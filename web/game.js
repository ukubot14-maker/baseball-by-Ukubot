(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const ui={inning:$("inning"),balls:$("balls"),strikes:$("strikes"),outs:$("outs"),home:$("homeScore"),away:$("awayScore"),read:$("pitchRead"),marker:$("timingMarker"),callout:$("callout"),base1:$("base1"),base2:$("base2"),base3:$("base3"),action:$("actionLabel"),hint:$("actionHint"),take:$("takeBtn"),role:$("roleName")};
let W=1000,H=620,dpr=1,last=0,gameTime=0;
let state={
 phase:"ready",half:"top",inning:1,balls:0,strikes:0,outs:0,
 home:0,away:0,bases:[false,false,false],pitchT:0,pitchDuration:1.38,
 pitchX:0,pitchY:0,pitchType:0,pitchTypes:["FOUR-SEAM","CHANGEUP","SLIDER"],
 windupStart:0,releaseAt:0,releaseQuality:.5,releaseWindow:false,
 swingStart:0,swingDuration:.38,swingQuality:"",swingOutcome:null,
 ballFlight:null,calloutUntil:0,shake:0,gameOver:false,finalText:"",lastContact:0
};
let particles=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
window.resizeBaseballCanvas = resize;

if ("ResizeObserver" in window) {
  new ResizeObserver(resize).observe(canvas);
}

window.addEventListener("resize", resize);
resize();
function rounded(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fill()}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function line(x1,y1,x2,y2,c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly(p,c){ctx.fillStyle=c;ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fill()}
function label(t,x,y,size,c,align="center",weight="bold"){ctx.fillStyle=c;ctx.textAlign=align;ctx.font=`${weight} ${size}px Arial`;ctx.fillText(t,x,y)}
function offense(){return state.half==="bottom"}
function announce(a,b,d=1.8){
 ui.callout.querySelector("span").textContent=a;
 ui.callout.querySelector("small").textContent=b;
 ui.callout.classList.remove("show","big-pop");
 void ui.callout.offsetWidth;
 ui.callout.classList.add("show","big-pop");
 state.calloutUntil=gameTime+d;
}
function updateUI(){
 ui.inning.textContent=(state.half==="top"?"TOP ":"BOT ")+state.inning;
 ui.home.textContent=state.home;ui.away.textContent=state.away;
 [["balls",state.balls],["strikes",state.strikes],["outs",state.outs]].forEach(([id,n])=>[...$(id).children].forEach((p,i)=>p.classList.toggle("on",i<n)));
 [ui.base1,ui.base2,ui.base3].forEach((e,i)=>e.classList.toggle("occupied",state.bases[i]));
 const batting=offense();
 ui.role.innerHTML=batting?'UKUBOT <span>#14</span>':'VISITOR BATTER <span>#</span>';
 ui.action.textContent=batting?"SWING":state.phase==="windup"?"RELEASE":"PITCH";
 ui.hint.textContent=batting?"TIME IT":state.phase==="windup"?"HIT THE WINDOW":"SET & THROW";
 ui.take.textContent=batting?"TAKE PITCH":"CHANGE PITCH";
 $("swingBtn").querySelector(".bat-icon").textContent=batting?"⚾":"➤";
}
function drawFielder(x,y,s,shirt,cap){ellipse(x,y+9*s,11*s,3*s,"#122a1e55");ellipse(x,y-12*s,6*s,7*s,"#c98e6b");rounded(x-7*s,y-7*s,14*s,17*s,5*s,shirt);rounded(x-8*s,y-18*s,16*s,5*s,3*s,cap);line(x-4*s,y+8*s,x-6*s,y+18*s,"#263b4c",3*s);line(x+4*s,y+8*s,x+6*s,y+18*s,"#263b4c",3*s)}
function stadium(){
 ctx.save();ctx.scale(W/1000,H/620);
 const sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,"#47749a");sky.addColorStop(.65,"#9bb4bd");sky.addColorStop(1,"#d4cbb2");ctx.fillStyle=sky;ctx.fillRect(0,0,1000,620);
 for(let i=0;i<18;i++){let x=i*62-15,h=25+(i*37%53);poly([[x,230-h],[x+48,230-h],[x+48,235],[x,235]],i%2?"#526c7b":"#405b6c");for(let j=0;j<3;j++)for(let k=0;k<2;k++)rounded(x+7+j*12,240-h+k*12,4,5,1,"#d7c89b")}
 poly([[0,200],[1000,200],[1000,340],[0,340]],"#293e4d");
 for(let row=0;row<7;row++)line(0,211+row*17,1000,211+row*17,row%2?"#64716d":"#89908a",5);
 for(let i=0;i<650;i++){let x=(i*97)%1000,y=211+((i*41)%112);ellipse(x,y,1.2,1.4,["#d5c8a7","#a8b7b7","#c68e65","#314b61","#e3e0d3"][i%5])}
 rounded(80,185,840,22,4,"#0c2741");label("DA PARK",500,201,13,"#e9b84f");label("FOR AUSTIN",165,201,7,"#f4e9c9");label("HOME OF THE UKUBOT NINES",835,201,7,"#f4e9c9");
 line(82,82,82,211,"#e6dfc9",5);line(918,82,918,211,"#e6dfc9",5);
 poly([[0,315],[1000,315],[1000,620],[0,620]],"#286b4d");
 for(let i=0;i<10;i++){let x=i*115-35;poly([[x,315],[x+58,315],[x+180,620],[x+80,620]],i%2?"#347d59":"#2d744f")}
 poly([[500,315],[720,445],[500,595],[280,445]],"#b98959");poly([[500,336],[690,445],[500,566],[310,445]],"#c99b68");poly([[500,349],[668,445],[500,548],[332,445]],"#347c52");
 line(500,350,668,445,"#e9dfc6",3);line(668,445,500,548,"#e9dfc6",3);line(500,548,332,445,"#e9dfc6",3);line(332,445,500,350,"#e9dfc6",3);
 ellipse(500,360,47,17,"#bd8c5e");rounded(493,356,14,3,1,"#f2e8d4");
 [[500,350],[668,445],[500,548],[332,445]].forEach(([x,y])=>{ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);rounded(-5,-5,10,10,1,"#f4f0e5");ctx.restore()});
 poly([[500,570],[510,578],[500,586],[490,578]],"#f3eee1");line(463,556,463,604,"#e6e0d1",2);line(537,556,537,604,"#e6e0d1",2);
 label("FOR AUSTIN AND COLIN",500,613,8,"#f2dcae");
 drawFielder(500,345,.54,"#e9e9e4","#c84a43");drawFielder(668,445,.48,"#e9e9e4","#c84a43");drawFielder(332,445,.48,"#e9e9e4","#c84a43");drawFielder(500,493,.57,"#e9e9e4","#c84a43");
 drawPitcher();drawBatter();drawCatcher();drawUmpire();
 if(["pitch","swing","windup","defenseFlight"].includes(state.phase)){
   let t=clamp(state.pitchT/state.pitchDuration,0,1),z=ease(t),x=lerp(500,500+state.pitchX,z),y=lerp(360,470+state.pitchY,z),r=lerp(3,10,z);
   if(state.phase==="swing"){x=500+state.pitchX*.25;y=470+state.pitchY*.25;}
   ellipse(x+2,y+3,r+1,r*.85,"#17332c66");ellipse(x,y,r,r,"#fffdf4");line(x-r*.4,y-r*.7,x+r*.4,y+r*.7,"#d6d0c6",.8);line(x-r*.4,y+r*.7,x+r*.4,y-r*.7,"#d6d0c6",.8);
 }
 if(state.ballFlight)drawFlight();
 ctx.setLineDash([5,5]);ctx.strokeStyle="#ffffff30";ctx.lineWidth=1;ctx.strokeRect(455,430,90,80);ctx.setLineDash([]);
 ctx.restore();
}
function drawPitcher(){
 let wind=state.phase==="windup"?Math.sin(clamp((gameTime-state.windupStart)/1.2,0,1)*Math.PI):0;
 drawFielder(500,340,1,"#f4f1e9","#c94c43");
 if(state.phase==="windup"){line(494,350,484+wind*15,330,"#f4f1e9",4);line(506,350,516-wind*10,361,"#f4f1e9",4)}
}
function drawBatter(){
 ellipse(606,572,42,9,"#0d2a1c66");
 const p=state.phase==="swing"?clamp((gameTime-state.swingStart)/state.swingDuration,0,1):0;
 const active=state.phase==="swing";
 const swingAngle=active?lerp(-1.12,.30,ease(p)):-1.12;
 line(590,548,581,574,"#e9e5dc",13);line(618,548,628,573,"#e9e5dc",13);
 line(581,574,572,578,"#293b4b",9);line(628,573,638,578,"#293b4b",9);
 ctx.save();ctx.translate(605,523);ctx.rotate(-.12);
 rounded(-22,-34,44,53,15,"#f0eee6");rounded(-22,-34,44,11,6,"#d6d6d0");
 label(offense()?"14":"27",0,-1,15,"#183553");ctx.restore();
 ellipse(602,477,17,19,"#c88e6e");
 ellipse(599,471,20,14,offense()?"#183653":"#b4433d");
 rounded(595,475,24,6,3,offense()?"#183653":"#b4433d");
 line(614,480,625,484,"#183653",4);
 const pivotX=580,pivotY=520;
 const tipX=pivotX+Math.cos(swingAngle)*86;
 const tipY=pivotY+Math.sin(swingAngle)*86;
 line(590,503,585,514,"#c88e6e",10);line(621,501,592,516,"#c88e6e",10);
 ellipse(pivotX,pivotY,7,7,"#c88e6e");
 line(pivotX,pivotY,tipX,tipY,"#8b5a2b",10);
 line(pivotX,pivotY,tipX,tipY,"#e7c58f",4);
 if(active&&state.swingOutcome==="hit"&&p>.54&&p<.78){
  const cx=500+state.pitchX*.25,cy=470+state.pitchY*.25;
  ctx.save();ctx.globalAlpha=1-Math.abs(.66-p)*5;
  for(let i=0;i<8;i++){let a=i*Math.PI/4;line(cx,cy,cx+Math.cos(a)*17,cy+Math.sin(a)*17,"#fff2a8",3)}
  ellipse(cx,cy,7,7,"#fffdf4");ctx.restore();
 }
}
function drawCatcher(){ellipse(500,573,18,5,"#12291d66");line(488,546,484,570,"#20384f",11);line(512,546,516,570,"#20384f",11);rounded(483,513,34,40,12,"#183e62");ellipse(500,505,15,16,"#c88e6e");ellipse(500,505,17,18,"#263d53");line(487,506,513,506,"#c5d0d7",3);rounded(488,520,24,8,3,"#b9c3c8")}
function drawUmpire(){rounded(470,514,23,40,8,"#182b3f");ellipse(481,505,12,13,"#bf896a");ellipse(481,504,13,14,"#202b37");line(473,505,489,505,"#b8c4cb",2);line(471,520,499,545,"#182b3f",7);line(492,520,499,545,"#182b3f",7)}

function drawFlight(){let f=state.ballFlight,t=clamp((gameTime-f.start)/f.duration,0,1),z=ease(t),x=lerp(f.x0,f.x1,z),y=lerp(f.y0,f.y1,z)-Math.sin(t*Math.PI)*f.arc,r=lerp(8,3,z);ellipse(x+3,y+5,r+3,r,"#091b1b66");ellipse(x,y,r,r,"#fffdf5")}
function startBattingPitch(){if(state.phase!=="ready"||!offense())return;state.phase="pitch";state.pitchT=0;state.pitchDuration=1.4+Math.random()*.2;state.pitchX=(Math.random()-.5)*90;state.pitchY=(Math.random()-.5)*68;ui.read.textContent="Pitcher in motion…";ui.marker.style.left="0%"}
function beginWindup(){if(state.phase!=="ready"||offense()||state.gameOver)return;state.phase="windup";state.windupStart=gameTime;state.releaseAt=gameTime+.85;ui.read.textContent=`${state.pitchTypes[state.pitchType]} — get ready to release`;ui.marker.style.left="0%";updateUI()}
function releasePitch(){if(state.phase!=="windup")return;let delta=Math.abs(gameTime-state.releaseAt);state.releaseQuality=clamp(1-delta/.65,0,1);state.phase="defenseFlight";state.pitchT=0;state.pitchDuration=1.35;let spreadX=30+(1-state.releaseQuality)*55;let spreadY=22+(1-state.releaseQuality)*42;state.pitchX=(Math.random()-.5)*spreadX;state.pitchY=(Math.random()-.5)*spreadY;ui.read.textContent=state.releaseQuality>.78?"Excellent release":state.releaseQuality>.45?"Good release":"Missed the release window";updateUI()}
function swing(){
 if(state.gameOver)return;
 if(!offense()){if(state.phase==="windup")releasePitch();else if(state.phase==="ready")beginWindup();return}
 if(state.phase==="ready"){startBattingPitch();return}
 if(state.phase!=="pitch")return;
 let timing=state.pitchT/state.pitchDuration,delta=Math.abs(timing-.89);
 state.phase="swing";state.swingStart=gameTime;state.swingDuration=.34;state.swingQuality=timing<.78?"EARLY":timing>1.01?"LATE":delta<.045?"PERFECT":delta<.095?"GOOD":"OFF";
 state.swingOutcome=state.swingQuality==="PERFECT"?"hit":state.swingQuality==="GOOD"?"hit":Math.random()<.25?"foul":"miss";
 state.contactPoint={x:500+state.pitchX*.25,y:470+state.pitchY*.25};
 ui.read.textContent=state.swingQuality==="PERFECT"?"Perfect timing":state.swingQuality==="GOOD"?"Good timing":state.swingQuality==="EARLY"?"Too early":state.swingQuality==="LATE"?"Too late":"Off the mark";
}
function take(){if(state.gameOver)return;if(offense()){if(state.phase==="pitch")resolveTake();else if(state.phase==="ready")startBattingPitch()}else if(state.phase==="ready"){state.pitchType=(state.pitchType+1)%state.pitchTypes.length;ui.read.textContent=`Pitch selected: ${state.pitchTypes[state.pitchType]}`;}}
function resolveTake(){let inZone=Math.abs(state.pitchX)<30&&Math.abs(state.pitchY)<23;if(inZone){state.strikes++;announce("CALLED STRIKE","RIGHT OVER THE PLATE")}else{state.balls++;announce("BALL","GOOD EYE")}finishPitchCount()}
function resolveSwing(){
 const q=state.swingQuality,out=state.swingOutcome;
 if(out==="miss"){state.strikes++;announce(q==="EARLY"?"TOO EARLY":q==="LATE"?"TOO LATE":"SWING AND A MISS","THE BAT MISSED THE BALL")}
 else if(out==="foul"){state.strikes=Math.min(2,state.strikes);announce("FOUL BALL!","CONTACT — BUT IT IS OUT OF PLAY")}
 else{let roll=Math.random(),kind=q==="PERFECT"?(roll<.38?"homer":roll<.73?"double":roll<.9?"single":"triple"):(roll<.04?"homer":roll<.28?"double":roll<.78?"single":"out");if(kind==="out"){state.outs++;announce("CAUGHT IN THE OUTFIELD","BATTER IS OUT")}else{let bases=kind==="homer"?4:kind==="triple"?3:kind==="double"?2:1;advanceRunners(bases,"home");announce(kind==="homer"?"HOME RUN!":kind.toUpperCase()+"!",q==="PERFECT"?"BARRELLED UP — CRUSHED!":"BAT ON BALL — SOLID CONTACT",2.2);launchBall(kind,q)}}
 finishPitchCount(false);
}
function resolveDefensePitch(){
 state.swingStart=gameTime-.06;
 let q=state.releaseQuality,roll=Math.random(),hitChance=.22+(q<.35?.12:0)+(state.pitchType===1?.04:0);
 if(roll<hitChance){let r=Math.random();if(r<.08){advanceRunners(4,"away");announce("HOME RUN","THE VISITORS GO DEEP",1.8);launchBall("homer","CPU")}else if(r<.32){advanceRunners(2,"away");announce("DOUBLE","HIT INTO THE GAP");launchBall("double","CPU")}else{advanceRunners(1,"away");announce("SINGLE","A BASE HIT");launchBall("single","CPU")}}
 else if(roll<hitChance+.16){state.strikes++;announce("FOUL BALL","BATTER STAYS ALIVE")}
 else{state.outs++;announce(q>.75?"SWING AND A MISS":"WEAK CONTACT","BATTER IS OUT")}
 finishPitchCount(false);
}
function launchBall(kind,who){
 const start=state.contactPoint||{x:500,y:470};
 state.ballFlight={start:gameTime,duration:kind==="homer"?1.75:1.1,x0:start.x,y0:start.y,x1:kind==="homer"?Math.random()*500+250:Math.random()*600+200,y1:kind==="homer"?170:Math.random()*330+230,arc:kind==="homer"?210:100};
 state.shake=kind==="homer"?10:5;
 for(let i=0;i<36;i++)particles.push({x:start.x,y:start.y,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9,life:.5+Math.random()*.65});
}
function drawFlight(){
 const f=state.ballFlight;
 if(!f)return;
 const t=clamp(f.t/f.duration,0,1);
 const x=lerp(f.x,f.endX,t);
 const y=lerp(f.y,f.endY,t)-Math.sin(t*Math.PI)*65;
 ellipse(x,y+4,7,5,"#172d24aa");
 ellipse(x,y,6,6,"#fffdf4");
}

function startBattingPitch(){
 if(state.phase!=="ready"||!offense()||state.gameOver)return;
 state.phase="pitch";
 state.pitchT=0;
 state.pitchDuration=1.45+Math.random()*.25;
 state.pitchX=(Math.random()-.5)*100;
 state.pitchY=(Math.random()-.5)*65;
 ui.read.textContent="Pitcher in motion…";
 ui.marker.style.left="0%";
}

function beginWindup(){
 if(state.phase!=="ready"||offense()||state.gameOver)return;
 state.phase="windup";
 state.windupStart=gameTime;
 state.releaseAt=gameTime+.85;
 ui.read.textContent="Get ready to release!";
 ui.marker.style.left="0%";
 updateUI();
}

function releasePitch(){
 if(state.phase!=="windup")return;
 const delta=Math.abs(gameTime-state.releaseAt);
 state.releaseQuality=clamp(1-delta/.65,0,1);
 state.phase="defenseFlight";
 state.pitchT=0;
 state.pitchDuration=1.4;
 const spread=1+(1-state.releaseQuality)*.8;
 state.pitchX=(Math.random()-.5)*75*spread;
 state.pitchY=(Math.random()-.5)*50*spread;
 ui.read.textContent=state.releaseQuality>.78?"Excellent release":state.releaseQuality>.45?"Good release":"Missed the release window";
 updateUI();
}

function finishPitchCount(){
 if(state.strikes>=3){
  state.outs++;
  state.strikes=0;
  state.balls=0;
  announce("STRIKE THREE","BATTER IS OUT");
  checkThreeOuts();
 }else if(state.balls>=4){
  state.balls=0;
  state.strikes=0;
  advanceRunners(true);
  announce("BALL FOUR","TAKE YOUR BASE");
 }
 state.phase="ready";
 state.pitchT=0;
 updateUI();
}

function resolveTake(){
 const inZone=Math.abs(state.pitchX)<32&&Math.abs(state.pitchY)<25;
 if(inZone){
  state.strikes++;
  announce("CALLED STRIKE","RIGHT OVER THE PLATE");
 }else{
  state.balls++;
  announce("BALL","GOOD EYE");
 }
 finishPitchCount();
}

function resolveSwing(){
 if(state.phase!=="pitch")return;
 const timing=clamp(1-Math.abs(state.pitchT/state.pitchDuration-.78)/.34,0,1);
 state.phase="swing";
 state.swingStart=gameTime;
 state.swingQuality=timing;
 state.swingOutcome=timing>.32?"hit":"miss";
 if(timing>.72){
  state.lastContact=gameTime;
  const hit=Math.random();
  if(hit>.88){
   state.ballFlight={x:500,y:470,endX:500+(Math.random()-.5)*400,endY:80,duration:1.5,t:0};
   announce("HOME RUN!","THAT ONE IS GONE!",2.5);
   if(offense())state.away+=1;else state.home+=1;
   state.bases=[false,false,false];
  }else if(hit>.55){
   advanceRunners(false);
   announce("BASE HIT!","THE RUNNER IS MOVING");
  }else{
   advanceRunners(false);
   announce("IN PLAY!","THE DEFENSE MAKES A PLAY");
   state.outs++;
   checkThreeOuts();
  }
 }else if(timing>.32){
  state.strikes++;
  announce("FOUL BALL","JUST A LITTLE EARLY OR LATE");
 }else{
  state.strikes++;
  announce("SWING AND MISS","YOU MISSED THAT ONE");
 }
 updateUI();
}

function advanceRunners(walk){
 if(walk){
  if(state.bases[0]){
   if(state.bases[1]){
    if(state.bases[2]){
     if(offense())state.away++;else state.home++;
    }
    state.bases[2]=true;
   }
   state.bases[1]=true;
  }
  state.bases[0]=true;
 }else{
  if(state.bases[2]){if(offense())state.away++;else state.home++;}
  if(state.bases[1])state.bases[2]=true;
  if(state.bases[0])state.bases[1]=true;
  state.bases[0]=true;
 }
}

function checkThreeOuts(){
 if(state.outs<3)return;
 state.outs=0;
 state.balls=0;
 state.strikes=0;
 state.bases=[false,false,false];
 if(state.half==="top"){
  state.half="bottom";
 }else{
  state.half="top";
  state.inning++;
 }
 if(state.inning>9){
  if(state.home!==state.away){
   state.gameOver=true;
   state.phase="gameOver";
   announce("GAME OVER",state.home>state.away?"UKUBOT WINS!":"VISITORS WIN!",4);
  }else{
   state.inning=10;
   announce("EXTRA INNINGS","LET'S SETTLE THIS!");
  }
 }else{
  announce("SIDE RETIRED","SWITCHING SIDES");
 }
 updateUI();
}

function swing(){
 if(state.phase!=="pitch"||!offense())return;
 resolveSwing();
}

function takePitch(){
 if(state.phase!=="pitch"||!offense())return;
 state.phase="resolving";
 resolveTake();
}

function pitchAction(){
 if(offense()){
  if(state.phase==="ready")startBattingPitch();
 }else{
  if(state.phase==="ready")beginWindup();
  else if(state.phase==="windup")releasePitch();
 }
}

function frame(now){
 const dt=Math.min((now-last)/1000,.05);
 last=now;
 gameTime+=dt;

 if(state.phase==="pitch"||state.phase==="defenseFlight"){
  state.pitchT+=dt;
  if(state.pitchT>=state.pitchDuration){
   state.pitchT=state.pitchDuration;
   if(state.phase==="pitch"){
    state.phase="ready";
    state.balls++;
    announce("BALL","PITCH OUTSIDE THE ZONE");
    finishPitchCount();
   }else{
    state.phase="ready";
    announce("PITCH THROWN","READY FOR THE NEXT ONE");
    updateUI();
   }
  }
 }

 if(state.phase==="windup"&&gameTime>state.releaseAt+1.1){
  releasePitch();
 }

 if(state.phase==="swing"&&gameTime-state.swingStart>.42){
  state.phase="ready";
  state.swingOutcome=null;
  state.pitchT=0;
  updateUI();
 }

 if(state.ballFlight){
  state.ballFlight.t+=dt;
  if(state.ballFlight.t>state.ballFlight.duration)state.ballFlight=null;
 }

 if(state.calloutUntil&&gameTime>state.calloutUntil){
  ui.callout.classList.remove("show","big-pop");
  state.calloutUntil=0;
 }

 stadium();
 requestAnimationFrame(frame);
}

$("swingBtn").addEventListener("click",()=>{
 if(offense())swing();
 else pitchAction();
});

$("takeBtn").addEventListener("click",()=>{
 if(offense())takePitch();
 else{
  state.pitchType=(state.pitchType+1)%state.pitchTypes.length;
  ui.read.textContent="Pitch type: "+state.pitchTypes[state.pitchType];
 }
});

canvas.addEventListener("click",()=>{
 if(offense())swing();
 else pitchAction();
});

window.addEventListener("keydown",e=>{
 if(e.code==="Space"){
  e.preventDefault();
  if(offense())swing();
  else pitchAction();
 }
 if(e.key.toLowerCase()==="p"&&!offense())pitchAction();
});

const help=$("helpBtn");
if(help)help.addEventListener("click",()=>{
 announce("HOW TO PLAY","BAT: SPACE OR SWING. PITCH: P TO WIND UP, THEN P AGAIN TO RELEASE.",4);
});

const homeButton=$("homeBtn");
if(homeButton)homeButton.addEventListener("click",()=>{
 const gameScreen=$("gameScreen");
 const homeScreen=$("homeScreen");
 if(gameScreen)gameScreen.hidden=true;
 if(homeScreen)homeScreen.hidden=false;
});

let trainerEnabled=true;
let trainerStep=0;
function trainerTip(title,description,progress=0){
 const panel=$("trainerPanel");
 if(!panel||!trainerEnabled)return;
 const heading=panel.querySelector(".trainer-title");
 const body=panel.querySelector(".trainer-text");
 const bar=panel.querySelector(".trainer-progress");
 if(heading)heading.textContent=title;
 if(body)body.textContent=description;
 if(bar)bar.style.width=progress+"%";
}

const trainerToggle=$("trainerToggle");
if(trainerToggle)trainerToggle.addEventListener("click",()=>{
 trainerEnabled=!trainerEnabled;
 trainerToggle.textContent=trainerEnabled?"COACH ON":"COACH OFF";
 if(trainerEnabled)trainerTip("COACH UKUBOT","I'll give you tips while you play.",0);
});

const trainerNext=$("trainerNext");
if(trainerNext)trainerNext.addEventListener("click",()=>{
 trainerStep++;
 const tips=[
  ["BATTING","Wait for the pitch to approach the plate, then swing.",20],
  ["PERFECT TIMING","Try swinging as the ball reaches the strike zone.",40],
  ["BALLS","A pitch outside the strike zone is a ball. Four balls gives a walk.",60],
  ["STRIKES","Three strikes means the batter is out.",80],
  ["PITCHING","Press P to begin your windup, then press P again to release.",100],
  ["THREE OUTS","After three outs, the teams switch sides.",100],
  ["NINE INNINGS","A standard game has nine innings. Tied games go to extras.",100]
 ];
 const tip=tips[trainerStep%tips.length];
 trainerTip(tip[0],tip[1],tip[2]);
});

updateUI();
ui.read.textContent="Ready for the pitch!";
requestAnimationFrame(frame);
})();
