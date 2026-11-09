const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const store=new Map();
const listeners={};
const app={innerHTML:'',addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>null};
const meta={content:'#0c1119'};
const doc={
 documentElement:{dataset:{}},
 body:{append:()=>{}},
 querySelector:s=>s==='#app'?app:s==='meta[name="theme-color"]'?meta:null,
 querySelectorAll:()=>[],
 createElement:()=>({style:{},remove(){}}),
 addEventListener:()=>{}
};
const ctx={
 document:doc,
 window:{addEventListener:()=>{}},
 navigator:{},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
 matchMedia:()=>({matches:false}),
 setInterval:()=>0,
 setTimeout:()=>0,
 confirm:()=>true,
 Date,Math,Number,JSON,Intl,Array,Object,String,Map,Set,
 console,
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=code=>vm.runInContext(code,ctx);
assert.match(app.innerHTML,/ПРОГРЕСС ЦИКЛА/);
assert.match(app.innerHTML,/Нагрузка по занятиям/);
assert.match(app.innerHTML,/Нагрузка по типам/);
assert.match(app.innerHTML,/Последние 7 дней/);
assert.match(app.innerHTML,/type-push/);
assert.match(app.innerHTML,/type-pull/);
assert.match(app.innerHTML,/type-legs/);
assert.match(app.innerHTML,/type-recovery/);
assert.match(app.innerHTML,/Включить светлую тему/);
assert.equal(run("S.order.join(',')"),'0,1,2,3,4,5,6');
assert.equal(run('loadByType().map(x=>x.actual).join(",")'),'0,0,0,0');
assert.match(run('chartSection()'),/Пока нет данных/);
run("ses(0).logs.chestpress=[{w:20,r:10,time:Date.now()}];save();moveWorkout(0,3);");
assert.equal(run("S.order.join(',')"),'1,2,3,0,4,5,6');
assert.equal(run("ses(0).logs.chestpress[0].w"),20);
assert.match(run('training(0)'),/Жим в грудном тренажёре/,'exercise remains linked to its day after reorder');
run("toggleTheme()");
assert.equal(store.get('train_theme'),'light');
assert.equal(doc.documentElement.dataset.theme,'light');
assert.equal(meta.content,'#f4f7f8');
assert.match(app.innerHTML,/Включить тёмную тему/);
run("ses(3).logs.incline=[{w:20,r:10,time:Date.now()-10000},{w:22,r:12,time:Date.now()}];");
assert.match(run('chartSection()'),/22 кг/);
assert.equal(run("bestWeights().incline"),22);
assert.equal(run("lastSetOf('incline',0).w"),22);
assert.equal(run('historyExtras().maxWeights.incline'),22);
assert.equal(run('historyExtras().sessionStats.length'),7);
run("ses(0).startAt=Date.now()-120000;ses(0).endAt=Date.now();ses(0).done=true");
assert.equal(run('rollingWeek().days'),1);
assert.ok(run('rollingWeek().volume')>0);
assert.ok(run('rollingWeek().sets')>0);
assert.match(run('weekSection()'),/План на неделю/);
assert.equal(run('S.history.length'),0);
assert.equal(run('validOrder(S.order)'),true);
assert.equal(run('validOrder([0,1,1,3,4,5,6])'),false);

assert.match(run('training(1)'),/РАЗМИНКА · 5 МИН/);
run('startWarmup(1)');
assert.ok(run('ses(1).warmupEndAt')>Date.now());
assert.equal(run('ses(1).warmupDoneAt'),0);
run('finishWarmup(1)');
assert.ok(run('ses(1).warmupDoneAt')>0);
assert.match(run('training(1)'),/Разминка выполнена/);
assert.match(run('training(6)'),/Пройдено километров/);
run('ses(6).distanceKm=3.25;save()');
assert.equal(run('kmTotal()'),3.25);
assert.equal(run('report().distanceKm'),3.25);
assert.equal(run('historyExtras().sessionStats[6].distanceKm'),3.25);
assert.match(run('review()'),/3,3 км|3,25 км/);
assert.equal(run('S.soundEnabled'),true);
run('S.soundEnabled=false;save()');
assert.equal(run('S.soundEnabled'),false);
assert.match(run('settings()'),/Офлайн-режим и сохранение/);
assert.match(run('settings()'),/Web Push/);
ctx.navigator.onLine=false;
assert.match(run('connectionIndicator()'),/Офлайн/);
ctx.navigator.onLine=true;
assert.match(run('connectionIndicator()'),/Сохранено на iPhone/);
console.log('TRAIN v0.7 tests OK — warmup, km, sound switch, offline status');


/* In-place update must retain the existing key and all other days. */
assert.match(src,/train_iphone_prototype_v1/);
assert.equal(run('APP_VERSION'),'0.8');
assert.match(run('settings()'),/Проверить обновление/);
assert.match(run('settings()'),/Первая тренировка/);
assert.equal(run('firstWorkoutSummary().count'),1);
const day2Before=run('JSON.stringify(S.sessions[1])');
const orderBefore=run('S.order.join(",")');
run("restoreFirstWorkoutFromBackup({v:1,sessions:{0:{startAt:111000,endAt:222000,done:true,logs:{chestpress:[{w:31,r:8,time:115000},{w:32,r:9,time:116000}],incline:[{w:16,r:10,time:117000}]}}},history:[]})");
assert.equal(run('firstWorkoutSummary().count'),3);
assert.equal(run('S.sessions[0].logs.chestpress[0].w'),31);
assert.equal(run('S.sessions[0].logs.incline[0].r'),10);
assert.equal(run('S.sessions[0].done'),true);
assert.equal(run('JSON.stringify(S.sessions[1])'),day2Before);
assert.equal(run('S.order.join(",")'),orderBefore);
assert.equal(run('S.history.length'),0);
console.log('TRAIN v0.8 tests OK — preserves local key and transfers only first workout');

console.log('TRAIN PWA smoke checks OK — theme, UI, progress, order, history');
