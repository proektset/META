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
assert.equal(run('APP_VERSION'),'1.1');
assert.match(src,/refresh\.html/);
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


/* Exact tonnage checks: weight x completed repetitions x dumbbell count. */
run("S.sessions={}; S.history=[]; S.order=[0,1,2,3,4,5,6];");
run("ses(0).logs={chestpress:[{w:40,r:10,time:Date.now()},{w:40,r:8,time:Date.now()}],incline:[{w:12,r:10,time:Date.now()},{w:14,r:12,time:Date.now()}],trirope:[{w:20,r:12,time:Date.now()}]};");
assert.equal(run('exerciseVolume(DAYS[0][1][0],0)'),720);
assert.equal(run('exerciseVolume(DAYS[0][1][1],0)'),576);
assert.equal(run('exerciseVolume(DAYS[0][1][2],0)'),240);
assert.equal(run('volumeForDay(0)'),1536);
assert.equal(run('tonne()'),1536);
assert.equal(run('report().volume'),1536);
assert.equal(run('historyExtras().sessionStats[0].volume'),1536);
assert.match(run('tonnagePanel(0)'),/336 кг/);
assert.match(run('tonnagePanel(0)'),/× 2 гантели/);
assert.match(run('home()'),/Тоннаж цикла, кг/);
assert.match(run('review()'),/Тоннаж по занятиям/);
assert.match(run('training(0)'),/Тоннаж этого занятия/);
run('ses(1).logs.latpulldown=[{w:50,r:8,time:Date.now()}]');
assert.equal(run('volumeForDay(1)'),400);
assert.equal(run('tonne()'),1936);
assert.equal(run('report().volume'),1936);
run("ses(0).logs.chestpress.push({w:-5,r:10},{w:100,r:500,time:Date.now()})");
assert.equal(run('exerciseVolume(DAYS[0][1][0],0)'),720,'ignore invalid values and entries beyond configured sets');
assert.equal(run('tonne()'),1936);
run("ses(6).logs.walking=[{w:100,r:20,time:Date.now()}]");
assert.equal(run('volumeForDay(6)'),0,'no tonnage assigned to walking');
run("ses(0).done=true;ses(0).endAt=Date.now();ses(0).startAt=Date.now()-120000;ses(1).done=true;ses(1).endAt=Date.now();ses(1).startAt=Date.now()-120000;");
assert.equal(run('rollingWeek().volume'),1936);
assert.equal(run('historyExtras().sessionStats[1].volume'),400);
assert.equal(run('setVolume(DAYS[0][1][1],{w:2.5,r:12})'),60);
console.log('TRAIN v1.0 tonnage tests OK — dumbbells, actual sets, day/cycle/week consistency');


/* v1.1: exercises can add unlogged sets; completed and historic logs remain intact */
run("S.sessions={}; S.history=[]; S.order=[0,1,2,3,4,5,6];S.soundEnabled=true;");
assert.equal(run("DAYS[2][1][2][0]"),"butterfly");
assert.equal(run("DAYS[2][1][2][6]"),1);
assert.match(run("DAYS[2][1][2][1]"),/Бабочка/);
assert.equal(run("count(0)"),8);
run("ses(0).extraSets={chestpress:2};ses(0).warmupDoneAt=Date.now();save();");
assert.equal(run("count(0)"),10);
assert.equal(run("setTarget(DAYS[0][1][0],0)"),5);
assert.match(run("exercise(DAYS[0][1][0],0,0)"),/\+ Подход/);
assert.match(run("exercise(DAYS[0][1][0],0,0)"),/5-й подход/);
run("ses(0).logs.chestpress=[{w:40,r:10,time:Date.now()},{w:40,r:10,time:Date.now()},{w:40,r:10,time:Date.now()},{w:40,r:10,time:Date.now()},{w:40,r:10,time:Date.now()}];");
assert.equal(run("exerciseVolume(DAYS[0][1][0],0)"),2000);
assert.equal(run("volumeForDay(0)"),2000);
assert.equal(run("logged(0)"),5);
assert.equal(run("historyExtras().exerciseResults.chestpress.sets.length"),5);

run("S.sessions={};S.history=[];S.order=[0,1,2,3,4,5,6];");
run("ses(2).logs.lateral=[{w:5,r:12,time:Date.now()-4000},{w:6,r:10,time:Date.now()-3000}];ses(2).done=true;");
assert.equal(run("legacyExercises(2).length"),1);
assert.equal(run("activeExercises(2).some(e=>e[0]==='butterfly')"),false);
assert.equal(run("volumeForDay(2)"),240);
assert.equal(run("count(2)"),8);
assert.match(run("training(2)"),/Махи гантелями в стороны/);
assert.doesNotMatch(run("training(2)"),/УПРАЖНЕНИЕ 3<\/div><div class=\"extitle\"[^>]*>Тренажёр «Бабочка»/);
assert.match(run("tonnagePanel(2)"),/240/);
run("ses(2).done=false;ses(2).logs.butterfly=[{w:35,r:12,time:Date.now()}];");
assert.equal(run("activeExercises(2).some(e=>e[0]==='butterfly')"),true);
assert.equal(run("volumeForDay(2)"),660);
assert.equal(run("count(2)"),10);
assert.match(run("training(2)"),/Тренажёр «Бабочка»/);
assert.equal(run("historyExtras().exerciseResults.lateral.sets.length"),2);
assert.equal(run("historyExtras().exerciseResults.butterfly.sets[0].w"),35);
assert.equal(run("S.sessions[2].logs.lateral[0].w"),5);
const oldArchive=run("JSON.stringify(S.sessions[2].logs.lateral)");
run("S.history.unshift({...report(),...historyExtras()});S.sessions={};");
assert.equal(run("JSON.stringify(S.history[0].exerciseResults.lateral.sets)"),oldArchive);
assert.equal(run("dayExercises(2).some(e=>e[0]==='butterfly')"),true);

/* Sticky active timer and rest/warmup remain visible while scrolling */
run("ses(2).startAt=Date.now()-60000;ses(2).warmupDoneAt=Date.now();");
assert.match(run("training(2)"),/sticky-session-time/);
run("S.rest={i:2,end:Date.now()+60000,expired:false};");
assert.match(run("training(2)"),/sticky-rest-time/);
run("S.rest=null;ses(2).warmupEndAt=Date.now()+120000;ses(2).warmupDoneAt=0;");
assert.match(run("training(2)"),/sticky-warmup-time/);
const stylesheet=fs.readFileSync(__dirname+'/index.html','utf8');
assert.match(stylesheet,/#app>\.tabbar\{[\s\S]*?position:static/);
assert.match(stylesheet,/\.sticky-timer\{[\s\S]*?position:sticky/);

/* Alert 8 pulses totaling > 2 seconds at high web-audio gain */
const endings=[];
ctx.window.AudioContext=class{
 constructor(){this.state='running';this.currentTime=0;this.destination={}}
 createOscillator(){return {type:'',frequency:{setValueAtTime(){}},connect(){},start(){},stop(t){endings.push(t)}}}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}}}
};
run("S.soundEnabled=true;signal()");
assert.equal(endings.length,8);
assert.ok(endings[7]>=2.3);
assert.match(src,/linearRampToValueAtTime\(\.85/);
console.log('TRAIN v1.1 tests OK — extra sets, preserved lateral history, butterfly, sticky timer and 2.4s sound');

console.log('TRAIN PWA smoke checks OK — theme, UI, progress, order, history');
