import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PETS, newLife, restoreLife, advanceLife, careForPet, contextForVoice} from '../src/life.js';
import {MOPS_POSITION, MOPS_LENGTH, MOPS_VIEW} from '../src/moflin.js';
import {cleanMemoryPet} from '../src/pet-memories.js';
import {createHouseModel} from '../scripts/house-model.mjs';
import {inWalkableArea} from '../src/navigation.js';
import {planPoint} from '../src/house-layout.js';

test('existing saves acquire Mops without losing pet care or memory filters', () => {
  const old = newLife('Mark'); delete old.pets.mops;
  old.pets.sunny.affection = 97; old.memoryFilter.from = '2024-01-01';
  const restored = restoreLife(JSON.stringify(old));
  assert.equal(restored.pets.mops.affection, 75);
  assert.equal(restored.pets.sunny.affection, 97);
  assert.equal(restored.memoryFilter.from, '2024-01-01');
  assert.equal(cleanMemoryPet('mops'), 'mops');
});

test('Mops responds to petting and talking but does not need food or water', () => {
  const state = newLife(), before = {...state.pets.mops};
  advanceLife(state, 5);
  assert.equal(state.pets.mops.food, before.food);
  assert.equal(state.pets.mops.water, before.water);
  assert.ok(state.pets.mops.affection < before.affection);
  assert.equal(careForPet(state, 'mops', 'food'), null);
  assert.equal(careForPet(state, 'mops', 'water'), null);
  assert.match(careForPet(state, 'mops', 'pet'), /stroke Mops/);
  assert.match(careForPet(state, 'mops', 'talk'), /chirps/);
  assert.equal(state.pets.mops.affection, 100);
  assert.equal(state.journal.length, 2);
  const context = JSON.parse(contextForVoice(state));
  const mops = context.pets.find(pet => pet.name === 'Mops');
  assert.equal(mops.stationary, true);
  assert.deepEqual(mops.needs, {affection: 100});
});

test('Mops fits on the mattress at 20 cm with an accessible bedside viewpoint', () => {
  const world = createHouseModel(), [bedX, bedZ] = planPoint(579, 331);
  assert.equal(PETS.find(pet => pet.id === 'mops').stationary, true);
  assert.equal(MOPS_LENGTH, .20);
  assert.ok(Math.abs(MOPS_POSITION[0] - bedX) + MOPS_LENGTH / 2 < 1);
  assert.ok(Math.abs(MOPS_POSITION[2] - bedZ) + MOPS_LENGTH / 2 < 1);
  assert.ok(MOPS_POSITION[1] > 1.305 && MOPS_POSITION[1] < 1.315);
  assert.ok(inWalkableArea(MOPS_VIEW[0], MOPS_VIEW[2], true, world.colliders));
});

test('every Mops action has compact fast-start video and a still at both viewing angles', () => {
  const root = new URL('../public/art/mops/', import.meta.url);
  const framing = JSON.parse(fs.readFileSync(new URL('framing.json', root)));
  let bytes = 0;
  for (const action of ['idle', 'pet', 'talk']) for (const view of ['side', 'overhead']) {
    const name = `${action}-${view}`, video = fs.readFileSync(new URL(name + '.mp4', root));
    assert.ok(video.indexOf('moov') >= 0 && video.indexOf('moov') < video.indexOf('mdat'));
    assert.ok(fs.statSync(new URL(name + '.webp', root)).size > 1000);
    assert.ok(framing[name].occupancy > .5 && framing[name].occupancy < .8);
    bytes += video.length;
  }
  assert.ok(bytes < 1_600_000);
});
