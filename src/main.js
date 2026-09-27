import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const wrap=document.querySelector("#canvas-wrap");
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x070b14);

const camera=new THREE.PerspectiveCamera(55,1,0.1,100);
camera.position.set(4,3,6);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled=true;
wrap.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.target.set(0,0.2,0);

scene.add(new THREE.HemisphereLight(0xbcdcff,0x182033,2.2));
const key=new THREE.DirectionalLight(0xffffff,3);
key.position.set(4,6,5); key.castShadow=true; scene.add(key);

const floor=new THREE.Mesh(
  new THREE.PlaneGeometry(14,14),
  new THREE.MeshStandardMaterial({color:0x141c2e,roughness:0.9})
);
floor.rotation.x=-Math.PI/2; floor.position.y=-1.25; floor.receiveShadow=true; scene.add(floor);

const geometry=new THREE.BoxGeometry(2,2,2);
const material=new THREE.MeshStandardMaterial({color:0x7dd3fc,roughness:0.32,metalness:0.05});
const cube=new THREE.Mesh(geometry,material);
cube.castShadow=true; cube.receiveShadow=true; scene.add(cube);

const axes=new THREE.AxesHelper(3.5); scene.add(axes);
const grid=new THREE.GridHelper(12,12,0x355070,0x25324b); grid.position.y=-1.24; scene.add(grid);

const defaults={posX:0,posY:0,posZ:0,rotY:0.6,scale:1};
function bindRange(id,apply){
  const input=document.querySelector("#"+id), output=document.querySelector("#"+id+"Value");
  const update=()=>{const v=Number(input.value); output.value=v.toFixed(id==="rotY"?2:1); apply(v);};
  input.addEventListener("input",update); update();
}
bindRange("posX",v=>cube.position.x=v);
bindRange("posY",v=>cube.position.y=v);
bindRange("posZ",v=>cube.position.z=v);
bindRange("rotY",v=>cube.rotation.y=v);
bindRange("scale",v=>cube.scale.setScalar(v));

document.querySelector("#resetBtn").addEventListener("click",()=>{
  for(const [id,value] of Object.entries(defaults)){const input=document.querySelector("#"+id);input.value=value;input.dispatchEvent(new Event("input"))}
  controls.reset();
});

let combined=false;
document.querySelector("#combineBtn").addEventListener("click",e=>{
  combined=!combined;
  e.currentTarget.textContent=combined?"Back to starter view":"Show combined view";
  if(combined){cube.material.color.set(0xa78bfa);cube.rotation.x=.35;cube.rotation.z=-.25}
  else{cube.material.color.set(0x7dd3fc);cube.rotation.x=0;cube.rotation.z=0}
});

function resize(){
  const w=wrap.clientWidth,h=wrap.clientHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener("resize",resize);resize();

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  cube.position.y=Number(document.querySelector("#posY").value)+Math.sin(t*1.4)*0.05;
  controls.update();renderer.render(scene,camera);
}
animate();