import * as THREE from 'three';
import {House} from '../src/scene.js';
import {buildHouse} from '../src/house.js';
import {optimizeHouse} from '../src/house-meshes.js';
export function createHouseModel({optimize=true}={}){
 const world=Object.create(House.prototype);
 Object.assign(world,{scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),materials:{},colliders:[],targets:[]});
 buildHouse(world);if(optimize)world.optimization=optimizeHouse(world);return world;
}
