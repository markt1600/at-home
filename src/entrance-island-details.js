import * as THREE from 'three';
import {HallwayCandle,CANDLE_WICKS} from './hallway-candle.js';

// A single small texture supplies the stained-glass panes and their leadwork.
// The dome is a complete 3D shade; all of it stands clear of the office wall.
function stainedGlass(){
 const material=new THREE.MeshStandardMaterial({color:0x42a487,roughness:.28,metalness:.12,emissive:0x246b51,emissiveIntensity:.13,side:THREE.DoubleSide});
 if(typeof document==='undefined')return material;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d'),rows=[0,64,124,184,244,300,402,460,512],columns=32,step=canvas.width/columns;
 const colors=['#31997a','#4bb497','#3faa8d','#257d66','#69b99b','#398e73','#479f86'];
 for(let row=0;row<rows.length-1;row++)for(let col=0;col<columns;col++){
  ctx.fillStyle=colors[(col*13+row*17)%colors.length];ctx.fillRect(col*step,rows[row],step,rows[row+1]-rows[row]);
 }
 for(let i=0;i<2800;i++){const x=i*97%1024,y=i*137%512;ctx.fillStyle=i%3?'rgba(218,235,170,.07)':'rgba(9,76,55,.09)';ctx.beginPath();ctx.ellipse(x,y,3+i%9,1+i%4,.45,0,Math.PI*2);ctx.fill();}
 const lead=draw=>{ctx.strokeStyle='#404c37';ctx.lineWidth=4.3;ctx.beginPath();draw();ctx.stroke();ctx.strokeStyle='rgba(182,163,111,.65)';ctx.lineWidth=1.1;ctx.stroke();};
 lead(()=>{for(const y of rows){ctx.moveTo(0,y);ctx.lineTo(1024,y);}for(let col=0;col<=columns;col++){ctx.moveTo(col*step,0);ctx.lineTo(col*step,300);ctx.moveTo(col*step,402);ctx.lineTo(col*step,512);}});
 // The broad band has repeated intertwined leaf/heart shapes in bronze lead.
 lead(()=>{for(let i=-1;i<=16;i++){const x=i*64;ctx.moveTo(x,300);ctx.bezierCurveTo(x-48,321,x-42,372,x,402);ctx.bezierCurveTo(x+42,372,x+48,321,x,300);ctx.moveTo(x,316);ctx.bezierCurveTo(x-25,337,x-22,365,x,386);ctx.bezierCurveTo(x+22,365,x+25,337,x,316);}});
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 material.map=map;material.bumpMap=map;material.bumpScale=.0008;material.color.set(0xffffff);return material;
}

export function buildEntranceIslandDetails(world,console,m){
 const top=.40,decor=new THREE.Group();decor.name='Freestanding lamp, glass-covered candle and cream vase';console.add(decor);
 const bronze=world.mat(0x59503a,.36,.66),green=world.mat(0x173c2b,.3,.28),ivory=world.mat(0xf4ead6,.24,.04),wax=world.mat(0x938575,.87),red=world.mat(0x842d31,.78);
 // Batch these five finishes together while retaining each one's surface response.
 const palette=new Set([bronze,green,ivory,wax,red]),finish=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:1});
 finish.onBeforeCompile=shader=>{shader.vertexShader='attribute vec2 surface; varying vec2 vSurface;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=surface;');shader.fragmentShader='varying vec2 vSurface;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=vSurface.x;').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor*=vSurface.y;');};
 const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{if(palette.has(mat)){const n=geo.attributes.position.count,colors=new Float32Array(n*3),surface=new Float32Array(n*2);for(let i=0;i<n;i++){mat.color.toArray(colors,i*3);surface[i*2]=mat.roughness;surface[i*2+1]=mat.metalness;}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setAttribute('surface',new THREE.BufferAttribute(surface,2));mat=finish;}const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const cylinder=(rt,rb,h,x,y,z,mat,parent,n=24)=>mesh(parent,new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z);
 const lathe=(parent,points,mat)=>mesh(parent,new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),48),mat);
 const ring=(parent,r,t,y,mat)=>{const o=mesh(parent,new THREE.TorusGeometry(r,t,6,64),mat,0,y,0);o.rotation.x=Math.PI/2;return o;};
 const tube=(parent,points,r,mat)=>mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,5,false),mat);
 const place=(name,x,z)=>{const g=new THREE.Group();g.name=name;g.position.set(x,top,z);decor.add(g);return g;};
 const lamp=place('Freestanding green stained-glass table lamp',.37,-.02);
 lathe(lamp,[[0,0],[.081,0],[.100,.01],[.114,.045],[.118,.12],[.110,.235],[.085,.30],[.061,.321],[.054,.335],[0,.335]],green);
 ring(lamp,.081,.004,.304,bronze);ring(lamp,.059,.004,.332,bronze);
 cylinder(.034,.042,.050,0,.35,0,bronze,lamp,24);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,points=[];for(let j=0;j<=16;j++){const t=j/16,y=.025+t*.27,r=.110*Math.sin(.38+t*2.3)+.009,angle=a+Math.sin(t*Math.PI)*.24;points.push([Math.sin(angle)*r,y,Math.cos(angle)*r]);}
  tube(lamp,points,.0015,bronze);
 }
 const shade=mesh(lamp,new THREE.SphereGeometry(.26,64,32,0,Math.PI*2,0,Math.PI/2),stainedGlass(),0,.375,0);shade.name='Complete green glass dome';
 ring(lamp,.26,.005,.375,bronze);
 cylinder(.055,.065,.012,0,.629,0,bronze,lamp,32);
 cylinder(.009,.017,.022,0,.647,0,bronze,lamp,16);mesh(lamp,new THREE.SphereGeometry(.012,16,10),bronze,0,.661,0).scale.y=.4;
 // A loose cable runs back across the worktop; there is no wall bracket.
 tube(decor,[[.37,.418,-.02],[.26,.404,-.11],[.17,.404,-.04],[.12,.404,-.14]],.0025,m.black);
 const candle=place('Ivory candle beneath clear glass cloche',-.08,.15);
 lathe(candle,[[0,0],[.104,0],[.119,.012],[.134,.23],[.142,.353],[.139,.367],[.129,.368],[.126,.349],[.123,.32]],ivory);
 cylinder(.126,.126,.012,0,.339,0,wax,candle,48);
 for(const [x,z] of CANDLE_WICKS)world.cyl(.0018,.002,.013,x,.35,z,m.black,candle,6);
 // Raised oval medallion on the ceramic vessel, facing the room.
 for(const scale of [1,.88]){
  const geo=new THREE.TorusGeometry(.077,.0018,5,48);geo.scale(scale,1.5*scale,1);geo.translate(0,.18,0);
  const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),r=.119+Math.min(1,y/.353)*.023;p.setZ(i,Math.sqrt(Math.max(0,r*r-x*x))+.003+p.getZ(i));}
  geo.computeVertexNormals();mesh(candle,geo,ivory);
 }
 const glass=new THREE.MeshStandardMaterial({color:0xe4edeb,roughness:.10,metalness:.20,transparent:true,opacity:.13,depthWrite:false});
 // Grazing highlights make the clear cover visible without a costly refraction pass.
 glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float glassEdge=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);
 outgoingLight=mix(outgoingLight,vec3(.92,.97,1.),glassEdge*.72);
 diffuseColor.a=.028+glassEdge*.48;
 #include <opaque_fragment>`);};
 const clochePoints=[[.172,.003],[.173,.012],[.172,.33]];
 for(let i=0;i<=20;i++){const a=i*Math.PI/40;clochePoints.push([.172*Math.cos(a),.33+.172*Math.sin(a)]);}
 const cover=new THREE.Group();cover.name='Liftable candle glass cover';cover.userData.dynamic=true;candle.add(cover);
 const cloche=lathe(cover,clochePoints,glass);cloche.name='Transparent rounded candle dome';cloche.castShadow=false;ring(cover,.172,.003,.007,glass).castShadow=false;
 world.hallwayCandle=new HallwayCandle(world,candle,cover,m);
 const vase=place('Cream ceramic vase with open bowl and side handles',-.43,.24);
 lathe(vase,[[0,0],[.066,0],[.077,.012],[.087,.16],[.099,.23],[.083,.284],[.056,.304],[.056,.318],[.080,.326],[.106,.355],[.111,.371],[.106,.374],[.099,.351],[.073,.331],[.039,.322],[.053,.28],[.063,.19],[.056,.025],[0,.025]],ivory);
 for(const side of [-1,1])cylinder(.020,.020,.066,side*.112,.211,0,ivory,vase,20).rotation.z=Math.PI/2;
 tube(vase,[[-.113,.231,.008],[-.116,.192,.024],[-.117,.136,.03],[-.096,.114,.028]],.002,red);
 const tag=world.box(.026,.085,.006,-.107,.095,.030,m.oak,vase);tag.rotation.z=-.13;
 world.entranceIslandDetails={decor,lamp,candle,vase};return decor;
}
