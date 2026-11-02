
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
 windupStart:0,releaseAt:0,releaseQuality:.5,releaseWindow:false,aimX:0,aimY:0,
 swingStart:0,swingDuration:.38,swingQuality:"",swingOutcome:null,
 ballFlight:null,calloutUntil:0,shake:0,gameOver:false,finalText:"",lastContact:0
};
let particles=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
if("ResizeObserver" in window){new ResizeObserver(resize).observe(canvas)}else{window.addEventListener("resize",resize)}resize();
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
 ui.hint.textContent=batting?"TIME IT":state.phase==="windup"?"TAP TO THROW":"AIM & THROW";
 ui.take.textContent=batting?"TAKE PITCH":"CHANGE PITCH";
 $("swingBtn").querySelector(".bat-icon").textContent=batting?"⚾":"➤";
}
function drawFielder(x,y,s,shirt,cap){ellipse(x,y+9*s,11*s,3*s,"#122a1e55");ellipse(x,y-12*s,6*s,7*s,"#c98e6b");rounded(x-7*s,y-7*s,14*s,17*s,5*s,shirt);rounded(x-8*s,y-18*s,16*s,5*s,3*s,cap);line(x-4*s,y+8*s,x-6*s,y+18*s,"#263b4c",3*s);line(x+4*s,y+8*s,x+6*s,y+18*s,"#263b4c",3*s)}
function stadium(){
 if(!offense()){drawPitcherPerspective();return;}
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
   let t=clamp(state.pitchT/state.pitchDuration,0,1),z=ease(t),x=lerp(500,500+state.pitchX,z),y=lerp(360,522+state.pitchY,z),r=lerp(3,10,z);
   if(state.phase==="swing"){x=500+state.pitchX*.25;y=522+state.pitchY*.25;}
   ellipse(x+2,y+3,r+1,r*.85,"#17332c66");ellipse(x,y,r,r,"#fffdf4");line(x-r*.4,y-r*.7,x+r*.4,y+r*.7,"#d6d0c6",.8);line(x-r*.4,y+r*.7,x+r*.4,y-r*.7,"#d6d0c6",.8);
 }
 if(state.ballFlight)drawFlight();
 ctx.setLineDash([5,5]);ctx.strokeStyle="#ffffff30";ctx.lineWidth=1;ctx.strokeRect(455,482,90,80);ctx.setLineDash([]);
 ctx.restore();
}
function drawPitcherPerspective(){
 ctx.save();ctx.scale(W/1000,H/620);
 const sky=ctx.createLinearGradient(0,0,0,390);sky.addColorStop(0,"#416d91");sky.addColorStop(.72,"#a8c0c4");sky.addColorStop(1,"#d6c7a7");ctx.fillStyle=sky;ctx.fillRect(0,0,1000,620);
 // Outfield and stadium from the mound
 poly([[0,210],[1000,210],[1000,620],[0,620]],"#285e48");
 poly([[120,215],[880,215],[1000,620],[0,620]],"#347b55");
 poly([[315,620],[685,620],[570,270],[430,270]],"#b98c60");
 poly([[355,620],[645,620],[555,285],[445,285]],"#c99b70");
 // Stands and crowd
 poly([[0,130],[1000,130],[1000,245],[0,245]],"#263e50");
 for(let row=0;row<6;row++)line(0,145+row*15,1000,145+row*15,row%2?"#71818a":"#536a78",5);
 for(let i=0;i<500;i++){let x=(i*83)%1000,y=145+(i*37)%90;ellipse(x,y,1.5,1.5,["#d9c9a7","#e6e2d6","#c78e68","#536c82"][i%4])}
 rounded(330,112,340,25,5,"#102b43");label("UKUBOT PARK",500,130,14,"#f0c66f");
 // foul lines converging toward home
 line(500,355,205,620,"#f2e7d0",3);line(500,355,795,620,"#f2e7d0",3);
 // Batter's box and plate
 poly([[455,493],[545,493],[560,545],[440,545]],"#ffffff20");
 poly([[500,490],[518,505],[500,520],[482,505]],"#f5f1e7");
 // Batter in the box, facing the pitcher
 ellipse(625,493,34,9,"#17352677");
 line(606,462,595,510,"#e9e8df",15);line(640,462,651,510,"#e9e8df",15);
 line(595,510,584,516,"#24394c",10);line(651,510,663,516,"#24394c",10);
 rounded(600,408,48,61,14,"#f0eee7");label("27",624,447,16,"#183653");
 ellipse(624,388,19,21,"#c88e6e");ellipse(621,381,22,15,"#b4433d");rounded(600,384,43,7,3,"#b4433d");
 line(601,425,568,452,"#c88e6e",11);line(645,426,674,447,"#c88e6e",11);
 line(674,447,701,411,"#8b5a2b",9);line(674,447,701,411,"#e7c58f",4);
 // Catcher behind the plate
 ellipse(500,474,27,10,"#102b2777");rounded(477,430,46,52,14,"#1b4265");ellipse(500,422,20,20,"#263d53");line(482,422,518,422,"#c5d0d7",4);rounded(480,440,40,11,4,"#b9c3c8");
 // Strike-zone frame, perspective-friendly and readable
 ctx.strokeStyle="#f9e7b8";ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.strokeRect(440,335,120,130);ctx.setLineDash([]);
 label("STRIKE ZONE",500,326,12,"#fff0c8");
 // Pitcher glove/arms at bottom edge
 line(390,620,450,565,"#d6a27e",24);line(610,620,550,565,"#d6a27e",24);
 ellipse(500,570,43,35,"#b87942");ellipse(500,570,31,25,"#d39a56");line(470,560,530,580,"#754a2b",4);
 // Aim reticle while setting up
 if(state.phase==="ready"||state.phase==="windup"){
   const ax=500+state.aimX*55,ay=400+state.aimY*58;
   ctx.strokeStyle="#ffe28a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(ax,ay,13,0,Math.PI*2);ctx.moveTo(ax-21,ay);ctx.lineTo(ax+21,ay);ctx.moveTo(ax,ay-21);ctx.lineTo(ax,ay+21);ctx.stroke();
   label("AIM HERE",ax,ay-25,11,"#fff0c8");
 }
 // Ball flies from the pitcher's hand toward the selected spot
 if(state.phase==="defenseFlight"){
   const t=clamp(state.pitchT/state.pitchDuration,0,1),z=ease(t);
   const tx=500+state.pitchX*1.25,ty=400+state.pitchY*1.65;
   const x=lerp(500,tx,z),y=lerp(590,ty,z),r=lerp(15,4,z);
   ellipse(x+3,y+5,r+3,r,"#142b2666");ellipse(x,y,r,r,"#fffdf5");
   line(x-r*.45,y-r*.6,x+r*.45,y+r*.6,"#d6d0c6",1.3);line(x-r*.45,y+r*.6,x+r*.45,y-r*.6,"#d6d0c6",1.3);
 }
 if(state.ballFlight)drawFlight();
 // POV prompt
 if(state.phase==="ready")label("TAP PITCH TO START  •  DRAG TO AIM",500,600,15,"#fff3d5");
 else if(state.phase==="windup")label("RELEASE! TAP PITCH",500,600,16,"#ffe28a");
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
  const cx=500+state.pitchX*.25,cy=522+state.pitchY*.25;
  ctx.save();ctx.globalAlpha=1-Math.abs(.66-p)*5;
  for(let i=0;i<8;i++){let a=i*Math.PI/4;line(cx,cy,cx+Math.cos(a)*17,cy+Math.sin(a)*17,"#fff2a8",3)}
  ellipse(cx,cy,7,7,"#fffdf4");ctx.restore();
 }
}
function drawCatcher(){ellipse(500,573,18,5,"#12291d66");line(488,546,484,570,"#20384f",11);line(512,546,516,570,"#20384f",11);rounded(483,513,34,40,12,"#183e62");ellipse(500,505,15,16,"#c88e6e");ellipse(500,505,17,18,"#263d53");line(487,506,513,506,"#c5d0d7",3);rounded(488,520,24,8,3,"#b9c3c8")}
function drawUmpire(){rounded(470,514,23,40,8,"#182b3f");ellipse(481,505,12,13,"#bf896a");ellipse(481,504,13,14,"#202b37");line(473,505,489,505,"#b8c4cb",2);line(471,520,463,546,"#182b3f",7);line(492,520,499,545,"#182b3f",7)}
function drawFlight(){let f=state.ballFlight,t=clamp((gameTime-f.start)/f.duration,0,1),z=ease(t),x=lerp(f.x0,f.x1,z),y=lerp(f.y0,f.y1,z)-Math.sin(t*Math.PI)*f.arc,r=lerp(8,3,z);ellipse(x+3,y+5,r+3,r,"#091b1b66");ellipse(x,y,r,r,"#fffdf5")}
function startBattingPitch(){if(state.phase!=="ready"||!offense())return;state.phase="pitch";state.pitchT=0;state.pitchDuration=1.4+Math.random()*.2;state.pitchX=(Math.random()-.5)*90;state.pitchY=(Math.random()-.5)*68;ui.read.textContent="Pitcher in motion…";ui.marker.style.left="0%"}
function beginWindup(){if(state.phase!=="ready"||offense()||state.gameOver)return;state.phase="windup";state.windupStart=gameTime;state.releaseAt=gameTime+.95;ui.read.textContent=`${state.pitchTypes[state.pitchType]} — aim, then tap to release`;ui.marker.style.left="0%";updateUI()}
function releasePitch(){if(state.phase!=="windup")return;let delta=Math.abs(gameTime-state.releaseAt);state.releaseQuality=clamp(1-delta/.75,0,1);state.phase="defenseFlight";state.pitchT=0;state.pitchDuration=.92;state.pitchX=state.aimX*48+(Math.random()-.5)*(1-state.releaseQuality)*24;state.pitchY=state.aimY*38+(Math.random()-.5)*(1-state.releaseQuality)*20;ui.read.textContent=state.releaseQuality>.78?"Perfect release — ball on the way":state.releaseQuality>.45?"Good release — ball on the way":"Wild release — ball on the way";updateUI()}
function swing(){
 if(state.gameOver)return;
 if(!offense()){if(state.phase==="windup")releasePitch();else if(state.phase==="ready")beginWindup();return}
 if(state.phase==="ready"){startBattingPitch();return}
 if(state.phase!=="pitch")return;
 let timing=state.pitchT/state.pitchDuration,delta=Math.abs(timing-.89);
 state.phase="swing";state.swingStart=gameTime;state.swingDuration=.34;state.swingQuality=timing<.78?"EARLY":timing>1.01?"LATE":delta<.045?"PERFECT":delta<.095?"GOOD":"OFF";
 state.swingOutcome=state.swingQuality==="PERFECT"?"hit":state.swingQuality==="GOOD"?"hit":Math.random()<.25?"foul":"miss";
 state.contactPoint={x:500+state.pitchX*.25,y:522+state.pitchY*.25};
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
 const inZone=Math.abs(state.pitchX)<30&&Math.abs(state.pitchY)<23;
 if(!inZone){state.balls++;announce("BALL!","THAT PITCH MISSED THE ZONE");finishPitchCount();return;}
 let q=state.releaseQuality,roll=Math.random(),hitChance=.22+(q<.35?.12:0)+(state.pitchType===1?.04:0);
 if(roll<hitChance){let r=Math.random();if(r<.08){advanceRunners(4,"away");announce("HOME RUN","THE VISITORS GO DEEP",1.8);launchBall("homer","CPU")}else if(r<.32){advanceRunners(2,"away");announce("DOUBLE","HIT INTO THE GAP");launchBall("double","CPU")}else{advanceRunners(1,"away");announce("SINGLE","A BASE HIT");launchBall("single","CPU")}}
 else if(roll<hitChance+.16){state.strikes=Math.min(2,state.strikes+1);announce("FOUL BALL","BATTER STAYS ALIVE")}
 else{state.strikes++;announce("STRIKE!","THE BATTER MISSED")}
 finishPitchCount(false);
}
function launchBall(kind,who){
 const start=state.contactPoint||{x:500,y:522};
 state.ballFlight={start:gameTime,duration:kind==="homer"?1.75:1.1,x0:start.x,y0:start.y,x1:kind==="homer"?Math.random()*500+250:Math.random()*600+200,y1:kind==="homer"?170:Math.random()*330+230,arc:kind==="homer"?210:100};
 state.shake=kind==="homer"?10:5;
 for(let i=0;i<36;i++)particles.push({x:start.x,y:start.y,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9,life:.5+Math.random()*.65});
}
function advanceRunners(n,team){
 let runs=0;if(n===4){runs=1+state.bases.filter(Boolean).length;state.bases=[false,false,false]}
 else{let next=[false,false,false];for(let i=0;i<3;i++)if(state.bases[i]){if(i+n>=3)runs++;else next[i+n]=true}if(n>=4)runs++;else next[n-1]=true;state.bases=next}
 if(team==="home")state.home+=runs;else state.away+=runs;updateUI();if(team==="home"&&state.half==="bottom"&&state.inning>=9&&state.home>state.away)finishGame()
}
function finishPitchCount(count=true){
 if(state.balls>=4){state.balls=0;state.strikes=0;advanceRunners(1,offense()?"home":"away");announce("WALK","BATTER TAKES FIRST")}
 if(state.strikes>=3){state.outs++;state.balls=0;state.strikes=0;announce("STRIKE THREE","BATTER IS OUT")}
 updateUI();
 if(state.outs>=3){setTimeout(endHalfInning,850);return}
 if(state.gameOver)return;
 if(state.ballFlight){state.phase="flight";return}
 state.phase="result";setTimeout(()=>{if(state.phase==="result")nextBatter()},850);
}
function nextBatter(){if(state.gameOver)return;state.phase="ready";state.ballFlight=null;ui.read.textContent=offense()?"Pitcher getting set…":"Set your pitch…";updateUI();setTimeout(()=>{if(state.phase==="ready"&&offense())startBattingPitch()},500)}
function endHalfInning(){
 if(state.gameOver)return;
 state.balls=0;state.strikes=0;state.outs=0;state.bases=[false,false,false];state.ballFlight=null;
 if(state.half==="top"){
   if(state.inning>=9&&state.home>state.away){finishGame();return}
   state.half="bottom";announce("SWITCH SIDES","YOUR TEAM IS UP TO BAT",2);state.phase="ready";
 }else{
   if(state.inning>=9&&state.home!==state.away){finishGame();return}
   state.inning++;state.half="top";announce(state.inning>9?"EXTRA INNINGS":"SWITCH SIDES","YOU'RE BACK ON THE MOUND",2);state.phase="ready";
 }
 updateUI();ui.read.textContent=offense()?"Get ready to hit":"Get ready to pitch";setTimeout(()=>{if(!state.gameOver&&state.phase==="ready"&&offense())startBattingPitch()},900)
}
function finishGame(){state.gameOver=true;state.phase="gameover";let win=state.home>state.away?"UKUBOT WINS":state.home<state.away?"VISITORS WIN":"TIE GAME";announce(win,`FINAL SCORE  ${state.home} — ${state.away}`,8);ui.read.textContent="Final score";ui.action.textContent="NEW GAME";ui.hint.textContent="PLAY AGAIN";ui.take.textContent="RESET GAME";$("swingBtn").querySelector(".bat-icon").textContent="↻"}
function resetGame(){Object.assign(state,{phase:"ready",half:"top",inning:1,balls:0,strikes:0,outs:0,home:0,away:0,bases:[false,false,false],pitchT:0,ballFlight:null,gameOver:false,calloutUntil:0});updateUI();announce("PLAY BALL","NINE INNINGS. LET'S GO.",2);ui.read.textContent="Set your pitch…"}
function frame(ts){let dt=Math.min(.04,(ts-last)/1000||0);last=ts;gameTime+=dt;
 if(state.phase==="pitch"){state.pitchT+=dt;ui.marker.style.left=(clamp(state.pitchT/state.pitchDuration,0,1)*100)+"%";if(state.pitchT>=state.pitchDuration){state.phase="result";resolveTake();}}
 else if(state.phase==="swing"&&gameTime-state.swingStart>=state.swingDuration){resolveSwing();state.phase=state.ballFlight?"flight":"result";if(state.ballFlight)setTimeout(()=>{state.ballFlight=null;if(!state.gameOver&&state.phase==="flight")nextBatter()},state.ballFlight.duration*1000)}
 else if(state.phase==="windup"){let t=gameTime-state.windupStart;ui.marker.style.left=(clamp(t/1.5,0,1)*100)+"%";if(t>=1.5)releasePitch()}
 else if(state.phase==="defenseFlight"){state.pitchT+=dt;ui.marker.style.left=(clamp(state.pitchT/state.pitchDuration,0,1)*100)+"%";if(state.pitchT>=state.pitchDuration){state.phase="result";resolveDefensePitch();if(!state.ballFlight)setTimeout(()=>{if(state.phase==="result")nextBatter()},850);else setTimeout(()=>{state.ballFlight=null;if(state.phase==="flight")nextBatter()},state.ballFlight.duration*1000)}}
 if(gameTime>state.calloutUntil)ui.callout.classList.remove("show");
 ctx.save();if(state.shake>0){ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);state.shake=Math.max(0,state.shake-dt*22)}stadium();ctx.restore();
 particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=dt;ellipse(p.x,p.y,2,2,"#f5cb70")});
 requestAnimationFrame(frame)}
$("swingBtn").addEventListener("click",()=>{if(state.gameOver){resetGame();return}if(offense())swing();else swing()});
$("takeBtn").addEventListener("click",()=>{if(state.gameOver){resetGame();return}take()});
canvas.addEventListener("pointermove",e=>{if(offense())return;const r=canvas.getBoundingClientRect();state.aimX=clamp(((e.clientX-r.left)/r.width-.5)*2,-1,1);state.aimY=clamp(((e.clientY-r.top)/r.height-.64)*2,-1,1)});
canvas.addEventListener("pointerdown",e=>{e.preventDefault();if(offense())swing();else if(state.phase==="windup")releasePitch();else if(state.phase==="ready")beginWindup()});
window.addEventListener("keydown",e=>{if(e.code==="Space"&&!e.repeat){e.preventDefault();if(state.gameOver)resetGame();else if(offense())swing();else if(state.phase==="windup")releasePitch();else if(state.phase==="ready")beginWindup()}});
$("helpBtn").onclick=()=>$("modal").classList.remove("hidden");$("closeModal").onclick=$("playBtn").onclick=()=>$("modal").classList.add("hidden");
$("soundBtn").onclick=()=>{$("soundBtn").style.opacity=$("soundBtn").style.opacity==="0.45"?"1":".45"};
 
// ===== UKUBOT BASEBALL TRAINER MODE =====

let trainerEnabled = true;
let trainerStep = 0;

const trainer = document.createElement("div");
trainer.id = "trainerPanel";
trainer.innerHTML = `
  <div class="trainer-heading">
    <span>⚾ COACH UKUBOT</span>
    <button id="trainerToggle">TRAINER: ON</button>
  </div>
  <div id="trainerTitle">Welcome to training!</div>
  <div id="trainerMessage">
    I'll help you learn how to hit, pitch, and understand baseball.
  </div>
  <div class="trainer-progress">
    <div id="trainerProgress"></div>
  </div>
  <button id="trainerNext">NEXT TIP →</button>
`;
document.querySelector(".game-shell").appendChild(trainer);

function trainerTip(title, message, progress = 20) {
  if (!trainerEnabled) return;
  $("trainerTitle").textContent = title;
  $("trainerMessage").textContent = message;
  $("trainerProgress").style.width = progress + "%";
  trainer.classList.add("trainer-active");
}

$("trainerToggle").onclick = () => {
  trainerEnabled = !trainerEnabled;
  $("trainerToggle").textContent =
    trainerEnabled ? "TRAINER: ON" : "TRAINER: OFF";
  trainer.classList.toggle("trainer-disabled", !trainerEnabled);
  if (trainerEnabled) {
    trainerTip("Trainer enabled!", "I'll guide you through the game.");
  }
};

$("trainerNext").onclick = () => {
  trainerStep++;
  const tips = [
    ["BATTING", "Wait for the pitch to approach the plate, then swing. Timing is everything.", 20],
    ["PERFECT TIMING", "Try swinging when the pitch marker is near the middle of the timing bar.", 40],
    ["BALLS", "A pitch outside the strike zone is a ball. Four balls gives the batter a walk to first base.", 60],
    ["STRIKES", "Three strikes means the batter is out. A foul ball usually adds a strike, but cannot make strike three.", 80],
    ["PITCHING", "When pitching, press PITCH to begin your windup, then release near the timing window.", 100],
    ["THREE OUTS", "After three outs, the teams switch between batting and fielding.", 100],
    ["NINE INNINGS", "A standard MLB game has nine innings. If the score is tied, extra innings are played.", 100]
  ];
  const tip = tips[trainerStep % tips.length];
  trainerTip(tip[0], tip[1], tip[2]);
};

// Coach reacts to the current game
const originalStartBattingPitch = startBattingPitch;
startBattingPitch = function() {
  originalStartBattingPitch();
  trainerTip("WATCH THE PITCH", "The ball is coming toward the plate. Wait for the right moment to swing.", 30);
};

const originalBeginWindup = beginWindup;
beginWindup = function() {
  originalBeginWindup();
  trainerTip("GET READY TO PITCH", "Watch the timing marker. Release the pitch close to the target window.", 50);
};

const originalReleasePitch = releasePitch;
releasePitch = function() {
  originalReleasePitch();
  trainerTip(
    state.releaseQuality > .78 ? "GREAT RELEASE!" : "PITCHING TIP",
    state.releaseQuality > .78
      ? "Excellent timing! A good release improves your pitch."
      : "Try releasing closer to the center of the timing window.",
    65
  );
};

const originalResolveSwing = resolveSwing;
resolveSwing = function() {
  const quality = state.swingQuality;
  originalResolveSwing();
  if (quality === "PERFECT") {
    trainerTip("PERFECT SWING!", "Amazing timing! Keep watching the ball and making contact.", 100);
  } else if (quality === "GOOD") {
    trainerTip("GOOD CONTACT", "Nice swing! Try to get even closer to perfect timing.", 85);
  } else if (quality === "EARLY") {
    trainerTip("TOO EARLY", "You swung before the ball reached the plate. Wait a little longer.", 40);
  } else if (quality === "LATE") {
    trainerTip("TOO LATE", "The ball passed the ideal contact point. Try swinging sooner.", 40);
  } else {
    trainerTip("KEEP PRACTICING", "Watch the ball's approach and adjust your timing.", 30);
  }
};

trainerTip("WELCOME TO TRAINING!", "Start playing! I'll give you tips while you learn the game.", 10);

updateUI();ui.read.textContent="Set your pitch…";announce("PLAY BALL","NINE INNINGS. LET'S GO.",2.4);requestAnimationFrame(frame);
})();
