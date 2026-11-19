import test from 'node:test';
import assert from 'node:assert/strict';
import {category,impact,makePlan,demoData,fallbackAnswer,profileOf} from '../engine.mjs';
const loc={name:'New Delhi',latitude:28.6,longitude:77.2};
test('AQI boundaries match US categories and missing values stay unavailable',()=>{
 for(const [n,level] of [[0,0],[50,0],[51,1],[100,1],[101,2],[150,2],[151,3],[200,3],[201,4],[300,4],[301,5],[500,5]])assert.equal(category(n).level,level);
 for(const n of [null,undefined,NaN,-1])assert.equal(category(n).level,-1);
});
test('sensitive household receives stronger advice at AQI 120',()=>{
 const d=demoData(loc);d.current.us_aqi=120;
 assert.match(makePlan(d,{children:true}).items[0].title,/indoors/);
 assert.match(makePlan(d,{}).items[0].title,/quieter/);
});
test('high AQI avoids encouraging cycling and includes ventilation safety',()=>{
 const d=demoData(loc);d.current.us_aqi=320;
 const p=makePlan(d,{commute:'bike'});
 assert.match(p.items[1].body,/enclosed public-transit/);
 assert.match(p.items[3].body,/overheated/);
 assert.equal(p.category.level,5);
});
test('missing AQI does not become good air',()=>{
 const d=demoData(loc);d.current.us_aqi=null;
 assert.match(makePlan(d,{}).items[0].body,/unavailable/);
});
test('impact formula is reversible and zero-distance produces zero',()=>{
 assert.ok(Math.abs(impact(16,22,'car','metro').saved-49.28)<.001);
 assert.equal(impact(16,22,'walk','car').saved,-63.36);
 assert.equal(impact(0,22,'car','bus').saved,0);
 assert.throws(()=>impact(-1,22,'car','bus'));
 assert.throws(()=>impact(1,22,'plane','bus'));
});
test('demo data and fallback disclose limitations',()=>{
 const d=demoData(loc);assert.equal(d.mode,'demo');assert.equal(d.hours.length,48);
 assert.match(fallbackAnswer('walk',d,{}),/illustrative demo/);
 assert.match(fallbackAnswer('walk',d,{}),/not a generated AI response/);
 assert.match(fallbackAnswer('ozone generator',d,{}),/Avoid ozone/);
 assert.match(fallbackAnswer('severe breathing difficulty',d,{}),/urgent/);
});
test('profile constrains unknown modes and numeric bounds',()=>{
 const p=profileOf({commute:'spaceship',distance:999,start:40});assert.equal(p.commute,'car');assert.equal(p.distance,100);assert.equal(p.start,23);
});
