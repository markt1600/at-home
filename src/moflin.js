import * as THREE from 'three';
import {planPoint, floorHeight} from './house-layout.js';
import {createInteractionHand} from './interaction-hand.js';

const [bedX, bedZ] = planPoint(579, 331);
export const MOPS_POSITION = [bedX + .79, 1.307, bedZ + .60];
export const MOPS_LENGTH = .20;
export const MOPS_VIEW = [bedX + 1.43, floorHeight(bedX + 1.43, bedZ + .60) + 1.15, bedZ + .60];
const phase = (t, a, b) => THREE.MathUtils.smoothstep(t, a, b);

export class Moflin {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'Mops the grey Casio Moflin';
    this.group.position.set(...MOPS_POSITION);
    this.group.userData.dynamic = true;
    this.mode = 'idle'; this.remaining = 0; this.elapsed = 0; this.nextSound = 18;
    this.films = new Map(); this.view = 'side'; this.calibration = {};
    this.material = new THREE.MeshBasicMaterial({transparent: true, alphaTest: .08, depthWrite: false, side: THREE.DoubleSide});
    this.material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
        vec4 pixel = texture2D(map, vMapUv);
        float alpha = 1. - smoothstep(.08, .35, min(pixel.r, pixel.b) - pixel.g);
        pixel.a *= alpha;
        if(alpha < 1.) { pixel.r = min(pixel.r, pixel.g + .05); pixel.b = min(pixel.b, pixel.g + .05); }
        #ifdef DECODE_VIDEO_TEXTURE
        pixel = sRGBTransferEOTF(pixel);
        #endif
        diffuseColor *= pixel;
        #endif`);
    };
    this.body = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.body.visible = false;
    this.group.add(this.body);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.072, 24), new THREE.MeshBasicMaterial({color: 0x142033, transparent: true, opacity: .18, depthWrite: false}));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .58; shadow.position.y = .002;
    this.group.add(shadow);
    for (const action of ['idle', 'pet', 'talk']) for (const view of ['side', 'overhead']) {
      const name = `${action}-${view}`, video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.loop = true; video.preload = 'none';
      const film = {video, name, loaded: false, pending: false, retryAt: 0, texture: null};
      film.poster = new THREE.TextureLoader().load(`/art/mops/${name}.webp`);
      film.poster.colorSpace = THREE.SRGBColorSpace;
      video.addEventListener('error', () => {film.loaded = false; film.retryAt = this.elapsed + 15;});
      this.films.set(name, film);
    }
    fetch('/art/mops/framing.json').then(r => {if (!r.ok) throw Error(); return r.json();}).then(data => this.calibration = data).catch(() => {});
    this.group.userData.update = (dt, enabled, near) => this.update(dt, enabled, near);
    this.group.userData.dispose = () => this.dispose();
    this.group.userData.canWalk = () => false;
    this.installHands();
  }

  react(action) {
    if (!['pet', 'talk'].includes(action)) return;
    this.mode = action; this.remaining = 5.17;
    for (const view of ['side', 'overhead']) {
      const video = this.films.get(`${action}-${view}`).video;
      if (video.readyState >= 2) video.currentTime = 0;
    }
    this.world.onMopsSound?.(action);
  }

  update(dt, enabled, near) {
    const camera = this.world.camera, offset = camera.position.clone().sub(this.group.position);
    const active = dt > 0 && near && offset.lengthSq() < 3.5 * 3.5 && !document.hidden;
    this.elapsed += dt;
    if (this.remaining > 0) {this.remaining -= dt; if (this.remaining <= 0) this.mode = 'idle';}
    this.updateHands(dt);
    const elevation = Math.atan2(offset.y, Math.hypot(offset.x, offset.z));
    this.view = elevation > (this.view === 'overhead' ? 1.03 : 1.17) ? 'overhead' : 'side';
    const film = this.films.get(`${this.mode}-${this.view}`), video = film.video;
    const animate = active && enabled;
    if (active && !film.loaded && this.elapsed >= film.retryAt) {
      film.loaded = true; video.src = `/art/mops/${film.name}.mp4`; video.load();
    }
    for (const other of this.films.values()) if (other !== film && !other.video.paused) other.video.pause();
    if (active && film.loaded && video.paused && !film.pending && this.elapsed >= film.retryAt && (animate || video.readyState < 2)) {
      film.pending = true;
      video.play().catch(() => {film.retryAt = this.elapsed + 3;}).finally(() => film.pending = false);
    } else if ((!active || !enabled) && video.readyState >= 2 && !video.paused) video.pause();
    if (video.readyState >= 2 && !film.texture) {
      film.texture = new THREE.VideoTexture(video); film.texture.colorSpace = THREE.SRGBColorSpace;
    }
    const map = film.texture || (film.poster.image ? film.poster : this.films.get(`idle-${this.view}`).poster);
    this.body.visible = !!map.image;
    if (this.material.map !== map) {this.material.map = map; this.material.needsUpdate = true;}
    const framing = this.calibration[film.name] || {occupancy: .65, aspect: 1.5};
    const width = MOPS_LENGTH / framing.occupancy;
    this.body.scale.set(width, width / framing.aspect, 1);
    this.group.rotation.set(0, 0, 0);
    this.body.position.set(0, this.view === 'overhead' ? .057 : .050, 0);
    if (this.view === 'overhead') this.body.rotation.set(-Math.PI / 2, 0, 0);
    else this.body.rotation.set(-Math.min(.62, Math.max(0, elevation * .65)), Math.atan2(offset.x, offset.z), 0, 'YXZ');
    // A photo frame remains visible while the requested film decodes.
    if (!film.texture && animate) this.body.rotation.z += Math.sin(this.elapsed * 2.7) * (this.mode === 'idle' ? .008 : .025);
    this.group.userData.currentFilm = film.name;
    if (active && !this.world.paused && this.mode === 'idle' && this.elapsed > this.nextSound && offset.length() < 2.7) {
      this.nextSound = this.elapsed + 20 + Math.random() * 25;
      this.world.onMopsSound?.('idle');
    }
  }

  installHands() {
    this.handAnchor = new THREE.Group(); this.handAnchor.name = 'Petting Mops at the bedside';
    this.handAnchor.position.set(MOPS_POSITION[0], floorHeight(MOPS_POSITION[0], MOPS_POSITION[2]), MOPS_POSITION[2]);
    this.handAnchor.rotation.y = Math.PI / 2; this.handAnchor.userData.dynamic = true;
    this.world.scene.add(this.handAnchor);
    this.hands = [-1, 1].map(side => createInteractionHand(this.world, this.handAnchor, side, {name: side < 0 ? 'Left hand beside Mops' : 'Right hand stroking Mops', grip: .03}));
    this.hands.forEach(hand => hand.visible = false);
    this.handStance = [0, 0, .64]; this.bodyEyeHeight = 1.67; this.stage = 'idle';
    const bed = new THREE.Object3D(); bed.position.set(bedX, 0, bedZ);
    this.handSolids = [{anchor: bed, bounds: [[-1.06, .75, -1.09], [1.06, 1.305, 1.09]], name: 'bed frame and mattress'}];
  }

  pet() {
    if (this.stage !== 'idle' || !this.world.handInteraction.begin(this)) return false;
    this.stage = 'petting'; this.time = 0; this.bodyEyeHeight = 1.67; this.petted = false;
    this.followView = true; this.lastView = {yaw: this.world.yaw, pitch: this.world.pitch};
    return true;
  }

  updateHands(dt) {
    if (this.stage !== 'petting' || this.world.paused || dt <= 0 || !this.world.handInteraction.ready(this)) return;
    this.time += dt;
    const t = this.time, lower = phase(t, 0, .9), rise = phase(t, 4.8, 5.8);
    this.bodyEyeHeight = THREE.MathUtils.lerp(1.67, .98, lower * (1 - rise));
    const right = this.hands[1]; right.visible = t > .4;
    const reach = phase(t, .45, 1.4) * (1 - phase(t, 4.4, 5.1));
    right.position.set(.04, THREE.MathUtils.lerp(.84, .69, reach), THREE.MathUtils.lerp(.44, .035, reach));
    right.position.z += t > 1.4 && t < 4.4 ? Math.sin((t - 1.4) * Math.PI * 2) * .025 : 0;
    if (t >= 1.4 && !this.petted) {this.petted = true; this.react('pet'); this.world.onMopsCare?.('pet');}
    const w = this.world;
    if (Math.abs(w.yaw - this.lastView.yaw) > .0001 || Math.abs(w.pitch - this.lastView.pitch) > .0001) this.followView = false;
    if (this.followView) {
      const d = this.group.position.clone().add(new THREE.Vector3(0, .06, 0)).sub(w.camera.position);
      const yaw = Math.atan2(-d.x, -d.z), delta = Math.atan2(Math.sin(yaw - w.yaw), Math.cos(yaw - w.yaw));
      w.yaw = THREE.MathUtils.damp(w.yaw, w.yaw + delta, 8, dt);
      w.pitch = THREE.MathUtils.damp(w.pitch, Math.atan2(d.y, Math.hypot(d.x, d.z)), 8, dt);
      this.lastView = {yaw: w.yaw, pitch: w.pitch};
    }
    if (t > 5.8) this.cancelHandAction();
  }

  cancelHandAction() {
    this.stage = 'idle'; this.bodyEyeHeight = 1.67;
    this.hands.forEach(hand => hand.visible = false);
    this.world.handInteraction.finish(this);
  }

  dispose() {
    this.cancelHandAction();
    for (const film of this.films.values()) {film.video.pause(); film.video.removeAttribute('src'); film.video.load(); film.texture?.dispose(); film.poster.dispose();}
    this.body.geometry.dispose(); this.material.dispose();
  }
}
