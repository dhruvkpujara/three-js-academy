const canvas = document.querySelector("#trackCanvas");
const ctx = canvas.getContext("2d");
const el = (id) => document.getElementById(id);
const state = { running:false, x:0, y:0, angle:0, speed:0, steer:0, samples:[], distance:0, lastTime:0, laps:0 };
const keys = new Set();
const controls = { left:false,right:false,accelerate:false,brake:false };
const track = { cx:0.5, cy:0.5, rx:0.355, ry:0.36, innerRx:0.235, innerRy:0.225 };
let width=900,height=700,dpr=1, lastSensors={forward:0,left:0,right:0,delta:0,onTrack:true};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapAngle=(a)=>Math.atan2(Math.sin(a),Math.cos(a));
function resize(){
  const r=canvas.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2);
  width=Math.max(320,r.width);height=width/1.28;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!state.x) resetCar(false);
  draw();
}
function radii(){return {cx:width*track.cx,cy:height*track.cy,rx:width*track.rx,ry:height*track.ry,irx:width*track.innerRx,iry:height*track.innerRy};}
function isOnTrack(x,y){
 const r=radii(), nx=(x-r.cx)/r.rx, ny=(y-r.cy)/r.ry, outer=nx*nx+ny*ny;
 const ix=(x-r.cx)/r.irx, iy=(y-r.cy)/r.iry, inner=ix*ix+iy*iy;
 return outer<=1 && inner>=1;
}
function trackTangent(x,y){
 const r=radii(), nx=(x-r.cx)/r.rx, ny=(y-r.cy)/r.ry;
 // Tangent direction for the ellipse at the car's approximate polar angle.
 const a=Math.atan2(ny,nx);
 return Math.atan2(-r.ry*Math.sin(a),-r.rx*Math.cos(a));
}
function rayDistance(angle,max=240){
 for(let d=4;d<=max;d+=4){if(!isOnTrack(state.x+Math.cos(angle)*d,state.y+Math.sin(angle)*d))return d;}
 return max;
}
function sensors(){
 const forward=rayDistance(state.angle);
 const left=rayDistance(state.angle-0.72);
 const right=rayDistance(state.angle+0.72);
 const delta=wrapAngle(state.angle-trackTangent(state.x,state.y))*180/Math.PI;
 return {forward,left,right,delta,onTrack:isOnTrack(state.x,state.y)};
}
function draw(){
 if(!ctx)return;
 ctx.clearRect(0,0,width,height);
 ctx.fillStyle="#10251f";ctx.fillRect(0,0,width,height);
 // Subtle grass grid
 ctx.strokeStyle="#1a382d";ctx.lineWidth=1;
 for(let x=0;x<width;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
 for(let y=0;y<height;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
 const r=radii();
 ctx.beginPath();ctx.ellipse(r.cx,r.cy,r.rx,r.ry,0,0,Math.PI*2);ctx.fillStyle="#39434b";ctx.fill();
 ctx.lineWidth=4;ctx.strokeStyle="#e8edf2";ctx.stroke();
 ctx.beginPath();ctx.ellipse(r.cx,r.cy,r.irx,r.iry,0,0,Math.PI*2);ctx.fillStyle="#10251f";ctx.fill();
 ctx.lineWidth=4;ctx.strokeStyle="#e8edf2";ctx.stroke();
 // Red-white curbs, dashed centerline
 ctx.setLineDash([13,12]);ctx.lineWidth=2;ctx.strokeStyle="#a7b5c2";
 ctx.beginPath();ctx.ellipse(r.cx,r.cy,(r.rx+r.irx)/2,(r.ry+r.iry)/2,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 // Start/finish stripe
 const sx=r.cx, sy=r.cy-r.ry+5;
 ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.PI/2);
 for(let i=0;i<8;i++){ctx.fillStyle=i%2?"#111923":"#f5f7fa";ctx.fillRect(-15+i*4,-5,4,10);}
 ctx.restore();
 // Sensor rays
 const angles=[state.angle,state.angle-.72,state.angle+.72], colors=["#74f5c1","#72b8ff","#ffbf69"];
 angles.forEach((a,i)=>{const d=rayDistance(a);ctx.beginPath();ctx.moveTo(state.x,state.y);ctx.lineTo(state.x+Math.cos(a)*d,state.y+Math.sin(a)*d);ctx.strokeStyle=colors[i];ctx.globalAlpha=.8;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(state.x+Math.cos(a)*d,state.y+Math.sin(a)*d,3,0,Math.PI*2);ctx.fillStyle=colors[i];ctx.fill();});
 // Car body
 ctx.save();ctx.translate(state.x,state.y);ctx.rotate(state.angle);
 ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(2,5,15,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#74f5c1";ctx.beginPath();ctx.roundRect(-13,-8,27,16,5);ctx.fill();
 ctx.fillStyle="#172c3a";ctx.beginPath();ctx.roundRect(-4,-6,10,12,3);ctx.fill();
 ctx.fillStyle="#e7fbff";ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(7,-4);ctx.lineTo(7,4);ctx.closePath();ctx.fill();
 ctx.fillStyle="#111a25";ctx.fillRect(-10,-11,7,4);ctx.fillRect(4,-11,7,4);ctx.fillRect(-10,7,7,4);ctx.fillRect(4,7,7,4);
 ctx.restore();
 // HUD
 ctx.fillStyle="#06121bd9";ctx.beginPath();ctx.roundRect(12,12,150,49,9);ctx.fill();
 ctx.fillStyle="#d9e9f4";ctx.font="700 11px system-ui";ctx.fillText("LAP DISTANCE",23,30);
 ctx.fillStyle="#74f5c1";ctx.font="700 18px system-ui";ctx.fillText(Math.floor(state.distance)+" px",23,50);
}
function updateUI(){
 const s=sensors();lastSensors=s;
 el("sensorForward").textContent=s.forward.toFixed(0);
 el("sensorLeft").textContent=s.left.toFixed(0);
 el("sensorRight").textContent=s.right.toFixed(0);
 el("delta").textContent=(s.delta>=0?"+":"")+s.delta.toFixed(1)+"°";
 el("speed").textContent=state.speed.toFixed(1);
 el("trackStatus").textContent=s.onTrack?"ON TRACK":"OFF TRACK";
 el("trackStatus").style.color=s.onTrack?"#74f5c1":"#ff8e8e";
 el("sampleCount").textContent=state.samples.length;
}
function actionLabel(){
 const left=keys.has("a")||keys.has("arrowleft")||controls.left;
 const right=keys.has("d")||keys.has("arrowright")||controls.right;
 const accel=keys.has("w")||keys.has("arrowup")||controls.accelerate;
 const brake=keys.has("s")||keys.has("arrowdown")||controls.brake;
 return {steering:left&&!right?-1:right&&!left?1:0,throttle:accel?1:brake?-1:0,steeringLabel:left&&!right?"left":right&&!left?"right":"straight",throttleLabel:accel?"accelerate":brake?"brake":"coast"};
}
function recordSample(){
 const s=sensors(),a=actionLabel();
 state.samples.push({timestamp_ms:Math.round(performance.now()),inputs:{forward_distance_px:+s.forward.toFixed(2),left_distance_px:+s.left.toFixed(2),right_distance_px:+s.right.toFixed(2),delta_deg:+s.delta.toFixed(3),speed:+state.speed.toFixed(3),on_track:s.onTrack},label:{steering:a.steering,throttle:a.throttle,steering_action:a.steeringLabel,throttle_action:a.throttleLabel}});
 el("datasetMessage").textContent="Recorded sample "+state.samples.length+". Keep recording varied track positions and steering actions.";
 updateUI();
}
function frame(time){
 requestAnimationFrame(frame);
 const dt=state.lastTime?Math.min((time-state.lastTime)/1000,.04):0;state.lastTime=time;
 if(state.running&&dt>0){
   const a=actionLabel();
   state.steer+=(a.steering-state.steer)*Math.min(1,dt*7);
   if(a.throttle>0)state.speed+=dt*90;else if(a.throttle<0)state.speed-=dt*130;else state.speed-=dt*25;
   state.speed=clamp(state.speed,0,190);
   state.angle+=state.steer*dt*(0.6+state.speed/110);
   const oldX=state.x,oldY=state.y;
   state.x+=Math.cos(state.angle)*state.speed*dt;
   state.y+=Math.sin(state.angle)*state.speed*dt;
   if(isOnTrack(state.x,state.y)){state.distance+=Math.hypot(state.x-oldX,state.y-oldY);}
   else {state.speed*=.92; if(state.speed<8){state.running=false;el("driveState").textContent="OFF TRACK";}}
 }
 draw();updateUI();
}
function resetCar(stop=true){
 const r=radii();state.x=r.cx;state.y=r.cy-r.ry+(r.ry-r.iry)*.48;state.angle=0;state.speed=0;state.steer=0;state.distance=0;
 if(stop)state.running=false;
 el("driveState").textContent=state.running?"DRIVING":"READY";draw();updateUI();
}
el("startBtn").addEventListener("click",()=>{state.running=!state.running;el("startBtn").textContent=state.running?"Pause driving":"Resume driving";el("driveState").textContent=state.running?"DRIVING":"PAUSED";});
el("resetBtn").addEventListener("click",()=>{resetCar();el("startBtn").textContent="Start driving";el("driveState").textContent="READY";});
el("recordBtn").addEventListener("click",recordSample);
el("exportBtn").addEventListener("click",()=>{
 const payload={schema:"car-driving-samples/v1",description:"Supervised driving samples from Self-Driving Car Lab. Distances are pixels; delta is heading error in degrees.",inputs:["forward_distance_px","left_distance_px","right_distance_px","delta_deg","speed","on_track"],labels:["steering","throttle"],sample_count:state.samples.length,samples:state.samples};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="car-driving-dataset.json";a.click();URL.revokeObjectURL(url);
 el("datasetMessage").textContent="Exported "+state.samples.length+" samples as JSON.";
});
el("clearBtn").addEventListener("click",()=>{state.samples=[];updateUI();el("datasetMessage").textContent="Dataset cleared.";});
window.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();keys.add(k);if(k===" "&&!e.repeat){state.running=!state.running;el("driveState").textContent=state.running?"DRIVING":"PAUSED";}});
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
window.addEventListener("blur",()=>{keys.clear();Object.keys(controls).forEach(k=>controls[k]=false);document.querySelectorAll("[data-control]").forEach(b=>b.classList.remove("active"));});
document.querySelectorAll("[data-control]").forEach(btn=>{
 const name=btn.dataset.control;
 const down=e=>{e.preventDefault();controls[name]=true;btn.classList.add("active");};
 const up=e=>{e.preventDefault();controls[name]=false;btn.classList.remove("active");};
 btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointercancel",up);btn.addEventListener("pointerleave",up);
});
window.addEventListener("resize",resize);
resize();requestAnimationFrame(frame);