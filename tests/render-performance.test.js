import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AdaptiveResolution} from '../src/render-quality.js';
import {optimizeLocalLights} from '../src/render-lighting.js';
import {HouseReflections} from '../src/house-reflections.js';

test('resolution responds to sustained slow frames, holds steady, then recovers gradually',()=>{
 const q=new AdaptiveResolution(1.6),drive=(fps,seconds,active=true)=>{const changes=[];for(let i=0;i<fps*seconds;i++){const next=q.update(1/fps,active);if(next!==undefined)changes.push(next);}return changes;};
 assert.deepEqual(drive(60,20),[]);assert.equal(q.ratio,1.6);
 const changes=drive(30,20);assert.ok(changes.length>=2&&changes.length<=5);assert.ok(q.ratio<1.6&&q.ratio>=q.min);
 const low=q.ratio;assert.deepEqual(drive(50,12),[]);assert.equal(q.ratio,low,'hysteresis avoids constant resizing');
 drive(60,100);assert.equal(q.ratio,1.6);drive(20,100);assert.equal(q.ratio,q.min);
});

test('pause, loading and a background-tab gap cannot reduce resolution',()=>{
 const q=new AdaptiveResolution(1);
 for(let i=0;i<500;i++)q.update(.05,false);
 assert.equal(q.ratio,1);q.update(10);for(let i=0;i<150;i++)q.update(1/60);
 assert.equal(q.ratio,1);assert.equal(new AdaptiveResolution(.7).min,.7);
});

test('zero-light shortcut preserves existing shader hooks, materials, and all lights',()=>{
 const scene=new THREE.Scene(),m=new THREE.MeshStandardMaterial({roughness:.42,metalness:.3}),light=new THREE.PointLight(0xffeedd,5,3);
 m.onBeforeCompile=shader=>{shader.uniforms.existing={value:7};};m.customProgramCacheKey=()=> 'cinema-room';
 scene.add(new THREE.Mesh(new THREE.BoxGeometry(),m),light);optimizeLocalLights(scene);optimizeLocalLights(scene);
 const shader={uniforms:{},fragmentShader:'#include <lights_fragment_begin>\n#include <opaque_fragment>'};m.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.existing.value,7);assert.equal(m.customProgramCacheKey(),'cinema-room-local-light-culling-v1');
 assert.equal((shader.fragmentShader.match(/if \( directLight.visible \) RE_Direct/g)||[]).length,1);
 assert.ok(shader.fragmentShader.indexOf('if ( directLight.visible ) RE_Direct')>shader.fragmentShader.indexOf('getPointLightInfo'));
 assert.match(shader.fragmentShader,/#include <opaque_fragment>/);assert.equal(light.distance,3);assert.equal(light.intensity,5);assert.equal(m.roughness,.42);assert.equal(m.metalness,.3);
});

function reflections(t,mobile=false){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.05,200);camera.position.set(0,1,2);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 const reflections=new HouseReflections({scene,camera});reflections.mobile=mobile;
 reflections.surfaces.forEach((p,i)=>{p.mesh.visible=i<3;p.mesh.position.set(i===2?100:(i? .4:-.4),1,0);p.mesh.rotation.set(0,0,0);p.normal.set(0,0,1);p.width=p.height=1;p.mesh.updateMatrixWorld();});
 t.after(()=>reflections.surfaces.forEach(p=>{p.mesh.geometry.dispose();p.mesh.dispose();}));return reflections;
}

test('visible mirrors alternate captures without two full scene redraws in one frame',t=>{
 const r=reflections(t),captures=[];
 for(let now=0;now<=500;now+=10){r.update(now);const pending=r.surfaces.filter(p=>p.refresh);assert.ok(pending.length<=1);for(const p of pending){assert.ok(now-p.lastRefresh>=100);p.lastRefresh=now;captures.push({p,now});}}
 assert.equal(captures.length,11);assert.ok(new Set(captures.map(x=>x.p)).size===2);assert.ok(captures.every(x=>x.p!==r.surfaces[2]),'offscreen pane is not captured');
 r.world.camera.lookAt(0,1,4);r.update(600);assert.equal(r.surfaces.filter(p=>p.refresh).length,0);
});

test('mobile keeps its lower reflection cadence and hidden panes never consume a capture',t=>{
 const r=reflections(t,true);let captures=0;
 for(let now=0;now<1000;now+=10){r.update(now);for(const p of r.surfaces.filter(p=>p.refresh)){p.lastRefresh=now;captures++;}}
 assert.equal(captures,5);r.surfaces.forEach(p=>p.mesh.visible=false);r.update(1200);assert.ok(r.surfaces.every(p=>!p.refresh));
});
