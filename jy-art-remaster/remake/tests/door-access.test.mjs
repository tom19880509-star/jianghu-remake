// Copyright 2026 Tom (tom19880509-star)
// SPDX-License-Identifier: Apache-2.0
// Attribution: Jianghu Remake / 江湖重绘, created and directed by Tom.
import assert from 'node:assert/strict';
import {coversHero, inFrontOfHero} from '../occlusion.js';
import {raisedTileAt, gameViewport, screenToTile} from '../viewport.js';
import {stickStep, pathfind} from '../navigation.js';

// A low wall hides the lower half but never intersects the former chest probe.
const hero = [20,20,480,320];
assert(coversHero([40,20,20,20],480,318,hero));
assert(coversHero([40,20,20,20],480,282,hero)); // head/shoulders only
assert(!coversHero([40,20,20,20],480,348,hero)); // clear of body
assert(!coversHero([40,60,20,60],550,320,hero)); // passed doorway
assert(inFrontOfHero(21,20,hero));
assert(!inFrontOfHero(19,20,hero));
assert(!coversHero([40,60,20,60],480,320,null));

const v=gameViewport(960,640),camera={x:20,y:20};
assert.deepEqual(raisedTileAt(480,320,v,camera,()=>0),{x:20,y:20});
// A 36-unit raised threshold projects two map cells back under the old inverse.
const height=(x,y)=>x===20&&y===20?36:0;
assert.deepEqual(raisedTileAt(480,284,v,camera,height),{x:20,y:20});
assert.deepEqual(screenToTile(480,284,{left:0,top:0,width:960,height:640},v,camera),
 {tx:480,ty:284,x:18,y:18});

// The right half of a north-east gesture is blocked by a door jamb.
const pass=(x,y)=>x===20&&y<20;
for(let i=0;i<8;i++) assert.equal(stickStep([273,275],i,20,20,pass),273);
assert.equal(stickStep([275],0,20,20,pass),275); // no unsolicited steering
assert.deepEqual([0,1,2,3].map(i=>stickStep([273,275],i,20,20,()=>true)),[273,275,273,275]);
assert.equal(pathfind([2,2],[[4,2]],8,(x)=>x!==3),null); // locked partition stays blocked
const route=pathfind([2,2],[[4,2],[2,4]],8,(x)=>x!==3);
assert.deepEqual(route.map(p=>[p.x,p.y]),[[2,3],[2,4]]); // nearest reachable original exit
console.log('PASS: partial-body occlusion, raised thresholds, blocked joystick axis and original collision routes.');
