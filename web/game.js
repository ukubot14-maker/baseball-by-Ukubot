(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const ui={inning:$("inning"),balls:$("balls"),strikes:$("strikes"),outs:$("outs"),home:$("homeScore"),away:$("awayScore"),read:$("pitchRead"),marker:$("timingMarker"),callout:$("callout"),base1:$("base1"),base2:$("base2"),base3:$("base3")};
let W=1000,H=620,dpr=1,last=0,gameTime=0;
let state={phase:"ready",pitchT:0,pitchDuration:1.55,pitchX:0,pitchY:0,balls:0,strikes:0,outs:0,inning:1,home:0,away:0,base:[false,false,false],swingUntil:0,batAngle:0,ballFlight:null,calloutUntil:0,calloutText:"PLAY BALL",calloutSub:"GET READY AT THE PLATE",lastCall:"",pitchType:"Four-seam fastball",sound:true,shake:0};
let particles=[];
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
new ResizeObserver(resize).observe(canvas);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}
function text(t,x,y,size,color,align="center",font="bold"){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${font} ${size}px Arial`;ctx.fillText(t,x,y)}
function announce(a,b,d=1.35){state.calloutText=a;state.calloutSub=b;state.calloutUntil=gameTime+d;ui.callout.querySelector("span").textContent=a;ui.callout.querySelector("small").textContent=b;ui.callout.classList.add("show")}
function updateUI(){ui.inning.textContent=(state.awayBat?"BOT ":"TOP ")+state.inning;ui.home.textContent=state.home;ui.away.textContent=state.away;[["balls",state.balls],["strikes",state.strikes],["outs",state.outs]].forEach(([id,n])=>{[...$(id).children].forEach((p,i)=>p.classList.toggle("on",i<n))});[ui.base1,ui.base2,ui.base3].forEach((e,i)=>e.classList.toggle("occupied",state.base[i]));}
function stadium(){
 const sx=W/1000,sy=H/620;ctx.save();ctx.scale(sx,sy);
 const sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,"#47749a");sky.addColorStop(.65,"#9bb4bd");sky.addColorStop(1,"#d4cbb2");ctx.fillStyle=sky;ctx.fillRect(0,0,1000,620);
 // distant skyline and lights
 for(let i=0;i<18;i++){let x=i*62-15,h=25+(i*37%53);poly([[x,230-h],[x+48,230-h],[x+48,235],[x,235]],i%2?"#526c7b":"#405b6c");for(let j=0;j<3;j++)for(let k=0;k<2;k++)rounded(x+7+j*12,240-h+k*12,4,5,1,"#d7c89b")}
 // stadium seating bowl
 poly([[0,200],[1000,200],[1000,340],[0,340]],"#293e4d");
 for(let row=0;row<7;row++){line(0,211+row*17,1000,211+row*17,row%2?"#64716d":"#89908a",5)}
 // crowd dots
 for(let i=0;i<650;i++){let x=(i*97)%1000,y=211+((i*41)%112);ellipse(x,y,1.2,1.4,["#d5c8a7","#a8b7b7","#c68e65","#314b61","#e3e0d3"][i%5])}
 // fascia and signs
 rounded(80,185,840,22,4,"#0c2741");text("UKUBOT PARK",500,201,13,"#e9b84f");text("FOR AUSTIN",165,201,7,"#f4e9c9");text("HOME OF THE UKUBOT NINES",835,201,7,"#f4e9c9");
 // foul poles and lights
 line(82,82,82,211,"#e6dfc9",5);line(918,82,918,211,"#e6dfc9",5);for(let x of [40,960]){line(x,105,x,195,"#526b7b",4);for(let j=0;j<5;j++)ellipse(x+(j%2)*10-5,100+Math.floor(j/2)*7,3,3,"#fff3c7")}
 // field in perspective
 poly([[0,315],[1000,315],[1000,620],[0,620]],"#286b4d");
 // outfield mowing stripes
 for(let i=0;i<10;i++){let x=i*115-35;poly([[x,315],[x+58,315],[x+180,620],[x+80,620]],i%2?"#347d59":"#2d744f")}
 // infield dirt diamond
 poly([[500,315],[720,445],[500,595],[280,445]],"#b98959");
 poly([[500,336],[690,445],[500,566],[310,445]],"#c99b68");
 // grass infield
 poly([[500,349],[668,445],[500,548],[332,445]],"#347c52");
 // basepaths
 line(500,350,668,445,"#e9dfc6",3);line(668,445,500,548,"#e9dfc6",3);line(500,548,332,445,"#e9dfc6",3);line(332,445,500,350,"#e9dfc6",3);
 // mound and rubber
 ellipse(500,360,47,17,"#bd8c5e");rounded(493,356,14,3,1,"#f2e8d4");
 // bases
 [[500,350],[668,445],[500,548],[332,445]].forEach(([x,y])=>{ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);rounded(-5,-5,10,10,1,"#f4f0e5");ctx.restore()});
 // home plate and chalk batter boxes
 poly([[500,570],[510,578],[500,586],[490,578]],"#f3eee1");line(463,556,463,604,"#e6e0d1",2);line(537,556,537,604,"#e6e0d1",2);line(463,556,485,556,"#e6e0d1",2);line(515,556,537,556,"#e6e0d1",2);
 text("FOR AUSTIN",500,613,8,"#f2dcae");
 // players distant
 drawFielder(500,345,.54,"#e9e9e4","#c84a43");drawFielder(668,445,.48,"#e9e9e4","#c84a43");drawFielder(332,445,.48,"#e9e9e4","#c84a43");drawFielder(500,493,.57,"#e9e9e4","#c84a43");
 // pitcher animation
 drawPitcher();
 // batter catcher umpire
 drawBatter();drawCatcher();drawUmpire();
 // pitch
 if(state.phase==="pitch"||state.phase==="swing"||state.phase==="result"&&state.ballFlight===null){let t=clamp(state.pitchT/state.pitchDuration,0,1);let z=ease(t);let x=lerp(500,500+state.pitchX,z),y=lerp(360,540+state.pitchY,z);let r=lerp(3,10,z);ellipse(x+2,y+3,r+1,r*.85,"#17332c66");ellipse(x,y,r,r,"#fffdf4");line(x-r*.4,y-r*.7,x+r*.4,y+r*.7,"#d6d0c6",.8);line(x-r*.4,y+r*.7,x+r*.4,y-r*.7,"#d6d0c6",.8)}
 if(state.ballFlight)drawFlight();
 // strike zone guide
 ctx.setLineDash([5,5]);ctx.strokeStyle="#ffffff30";ctx.lineWidth=1;ctx.strokeRect(455,482,90,80);ctx.setLineDash([]);
 ctx.restore();
}
function drawFielder(x,y,s,jersey,cap){ellipse(x,y+9*s,11*s,3*s,"#122a1e55");ellipse(x,y-12*s,6*s,7*s,"#c98e6b");rounded(x-7*s,y-7*s,14*s,17*s,5*s,jersey);rounded(x-8*s,y-18*s,16*s,5*s,3*s,cap);line(x-4*s,y+8*s,x-6*s,y+18*s,"#263b4c",3*s);line(x+4*s,y+8*s,x+6*s,y+18*s,"#263b4c",3*s)}
function drawPitcher(){let wind=state.phase==="pitch"?Math.sin(clamp(state.pitchT/.55,0,1)*Math.PI):0;drawFielder(500,340,1.0,"#f4f1e9","#c94c43");line(494,350,487+wind*4,361,"#f4f1e9",4);line(506,350,513-wind*4,361,"#f4f1e9",4);ellipse(500+wind*4,326,4,4,"#fff");}
function drawBatter(){
 // grounded shadow, legs, uniform and helmet
 ellipse(606,572,42,9,"#0d2a1c66");
 line(590,548,581,574,"#e9e5dc",13);line(618,548,628,573,"#e9e5dc",13);line(581,574,572,578,"#293b4b",9);line(628,573,638,578,"#293b4b",9);
 // torso rounded athletic silhouette
 ctx.save();ctx.translate(605,523);ctx.rotate(-.12);rounded(-21,-34,43,53,17,"#f0eee6");rounded(-21,-34,43,11,6,"#d6d6d0");text("14",0,-1,15,"#183553");ctx.restore();
 // arms
 line(589,503,570,526,"#c88e6e",11);line(621,501,637,519,"#c88e6e",11);ellipse(570,526,6,6,"#c88e6e");ellipse(637,519,6,6,"#c88e6e");
 // helmet and face side view
 ellipse(602,477,17,19,"#c88e6e");ellipse(599,471,19,14,"#183653");rounded(595,475,23,6,3,"#183653");line(614,480,625,484,"#183653",4);ellipse(611,481,2,2,"#202c38");
 // bat swing
 let a=state.phase==="swing"?-1.1+Math.sin((gameTime-(state.swingUntil-.28))/.28*Math.PI)*1.8: -.42;
 let bx=612,by=504;let ex=bx+Math.cos(a)*72,ey=by+Math.sin(a)*72;
 line(bx,by,ex,ey,"#b37b3f",8);line(bx,by,ex,ey,"#e5c18b",3);
}
function drawCatcher(){ellipse(500,573,18,5,"#12291d66");line(488,546,484,570,"#20384f",11);line(512,546,516,570,"#20384f",11);rounded(483,513,34,40,12,"#183e62");ellipse(500,505,15,16,"#c88e6e");ellipse(500,505,17,18,"#263d53");line(487,506,513,506,"#c5d0d7",3);rounded(488,520,24,8,3,"#b9c3c8");}
function drawUmpire(){rounded(470,514,23,40,8,"#182b3f");ellipse(481,505,12,13,"#bf896a");ellipse(481,504,13,14,"#202b37");line(473,505,489,505,"#b8c4cb",2);line(471,520,463,546,"#182b3f",7);line(492,520,499,545,"#182b3f",7)}
function drawFlight(){let f=state.ballFlight,t=clamp((gameTime-f.start)/f.duration,0,1),z=ease(t);let x=lerp(f.x0,f.x1,z),y=lerp(f.y0,f.y1,z)-Math.sin(t*Math.PI)*f.arc,r=lerp(8,3,z);ellipse(x+3,y+5,r+3,r,"#091b1b66");ellipse(x,y,r,r,"#fffdf5");if(t>.92){for(let i=0;i<9;i++){let a=i*Math.PI*2/9;line(x,y,x+Math.cos(a)*9,y+Math.sin(a)*9,"#f7d27b",2)}}}
function startPitch(){if(state.phase==="pitch"||state.phase==="swing"||state.phase==="flight")return;state.phase="pitch";state.pitchT=0;state.pitchDuration=1.42+Math.random()*.22;state.pitchX=(Math.random()-.5)*40;state.pitchY=(Math.random()-.5)*26;state.pitchType=Math.random()<.7?"Four-seam fastball":"Changeup";ui.read.textContent="Pitcher set…";announce("HERE COMES THE PITCH","TRACK IT TO THE PLATE",.8)}
function resolvePitch(swing){
 if(state.phase!=="pitch")return;
 let t=state.pitchT/state.pitchDuration;
 let timing=t; // Contact window near plate
 if(swing){
   state.phase="swing";state.swingUntil=gameTime+.28;
   let delta=Math.abs(timing-.89);
   if(timing<.72){state.strikes++;announce("TOO EARLY","SWING THROUGH IT");ui.read.textContent="Early swing";}
   else if(timing>1.01){state.strikes++;announce("TOO LATE","JUST MISSED IT");ui.read.textContent="Late swing";}
   else if(delta<.045){hitBall("PERFECT","CRUSHED!");return}
   else if(delta<.095){hitBall("GOOD CONTACT","SOLID LINE DRIVE");return}
   else if(Math.random()<.38){hitBall("FOUL BALL","STAY ALIVE");state.strikes=Math.min(2,state.strikes);return}
   else{state.strikes++;announce("SWING AND A MISS","STRIKE");ui.read.textContent="Missed the pitch";}
 } else {
   let x=500+state.pitchX,y=540+state.pitchY;
   let inZone=Math.abs(x-500)<48&&y>490&&y<564;
   if(inZone){state.strikes++;announce("CALLED STRIKE","RIGHT DOWN THE MIDDLE");ui.read.textContent="Called strike"}
   else{state.balls++;announce("BALL","GOOD EYE");ui.read.textContent="Ball outside"}
 }
 state.phase="result";updateUI();checkCount();setTimeout(()=>{if(state.phase==="result")nextPitch()},900);
}
function hitBall(label,sub){
 let timing=state.pitchT/state.pitchDuration,quality=label==="PERFECT"?1:.72;
 let roll=Math.random(),outcome=quality===1?(roll<.45?"homer":roll<.76?"triple":roll<.9?"double":"single"):(roll<.06?"homer":roll<.22?"double":roll<.72?"single":"out");
 if(label==="FOUL BALL"){outcome="foul"}
 state.phase="flight";state.ballFlight={start:gameTime,duration:outcome==="homer"?1.65:.95,x0:500,y0:540,x1:outcome==="homer"?Math.random()*360+320:Math.random()*600+200,y1:outcome==="homer"?220:Math.random()*300+270,arc:outcome==="homer"?180:80};
 state.shake=quality===1?9:4;particles=[];for(let i=0;i<35;i++)particles.push({x:500,y:540,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,life:.6+Math.random()*.5});
 if(outcome==="foul"){state.strikes=Math.min(2,state.strikes);announce("FOUL BALL","THAT ONE'S OUT OF PLAY");ui.read.textContent="Foul contact"}
 else if(outcome==="out"){state.outs++;announce("CAUGHT!","BATTER IS OUT");ui.read.textContent="Fly out"}
 else{let bases=outcome==="homer"?4:outcome==="triple"?3:outcome==="double"?2:1;scoreBases(bases);announce(outcome.toUpperCase()+"! ",sub,1.7);ui.read.textContent=label==="PERFECT"?"Perfect timing":"Good contact"}
 updateUI();setTimeout(()=>{state.ballFlight=null;state.phase="result";checkCount();if(state.phase==="result")setTimeout(nextPitch,650)},outcome==="homer"?1650:1000);
}
function scoreBases(n){let runs=0;if(n===4){runs=1+state.base.filter(Boolean).length;state.base=[false,false,false]}else{for(let i=2;i>=0;i--)if(state.base[i]){if(i+n>=3)runs++;else state.base[i+n]=true;state.base[i]=false}if(n>=4)runs++;else state.base[n-1]=true}state.home+=runs}
function checkCount(){if(state.balls>=4){state.balls=0;state.strikes=0;scoreBases(1);announce("WALK","TAKE YOUR BASE");}if(state.strikes>=3){state.outs++;state.balls=0;state.strikes=0;announce("STRIKE THREE","BATTER IS OUT")}if(state.outs>=3){state.outs=0;state.balls=0;state.strikes=0;state.base=[false,false,false];state.inning++;if(state.inning>9){state.inning=1;state.away=state.home;state.home=0}announce("SIDE RETIRED","CHANGE OF INNINGS",1.8)}updateUI()}
function nextPitch(){if(state.phase==="flight")return;state.phase="ready";state.ballFlight=null;ui.read.textContent="Pitcher getting set…";setTimeout(()=>{if(state.phase==="ready")startPitch()},550)}
function swing(){if(state.phase==="ready"){startPitch();return}if(state.phase==="pitch"){resolvePitch(true)}}
function take(){if(state.phase==="pitch"){resolvePitch(false)}else if(state.phase==="ready"){startPitch();ui.read.textContent="Watch the pitch…"}}
$("swingBtn").addEventListener("click",swing);$("takeBtn").addEventListener("click",take);canvas.addEventListener("pointerdown",e=>{e.preventDefault();swing()});window.addEventListener("keydown",e=>{if(e.code==="Space"&&!e.repeat){e.preventDefault();swing()}});
$("helpBtn").onclick=()=>$("modal").classList.remove("hidden");$("closeModal").onclick=$("playBtn").onclick=()=>$("modal").classList.add("hidden");
$("soundBtn").onclick=()=>{state.sound=!state.sound;$("soundBtn").style.opacity=state.sound?1:.45};
function frame(ts){let dt=Math.min(.04,(ts-last)/1000||0);last=ts;gameTime+=dt;
 if(state.phase==="pitch"){state.pitchT+=dt;let t=state.pitchT/state.pitchDuration;ui.marker.style.left=(clamp(t,0,1)*100)+"%";if(t>=1)resolvePitch(false)}
 if(state.phase==="swing"&&gameTime>state.swingUntil){state.phase="result";setTimeout(nextPitch,450)}
 if(gameTime>state.calloutUntil)ui.callout.classList.remove("show");
 ctx.save();if(state.shake>0){ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);state.shake=Math.max(0,state.shake-dt*22)}stadium();ctx.restore();
 particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=dt;ellipse(p.x,p.y,2,2,"#f5cb70")});
 requestAnimationFrame(frame)}
updateUI();ui.read.textContent="Pitcher getting set…";announce("PLAY BALL","YOUR FIRST AT-BAT AWAITS",2.4);setTimeout(startPitch,1700);requestAnimationFrame(frame);
})();