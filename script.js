const $=s=>document.querySelector(s), canvas=$('#world'),ctx=canvas.getContext('2d'),mini=$('#mini'),mc=mini.getContext('2d');
const stages=[
 {name:'북한말 거리',kind:'culture',x:-4,z:8,desc:'길 위에 떠 있는 단어 카드를 만나 보세요.',color:'#dcaa57'},
 {name:'먹거리 시장',kind:'culture',x:3,z:8,desc:'평양 음식 네 가지 중 취향을 고르고, 주문 도전에 참여해 보세요.',color:'#d9826b'},
 {name:'만남의 광장',kind:'culture',x:10,z:8,desc:'평양에서 온 지우를 만나 첫인사를 나눠 보세요.',color:'#639aaf'},
 {name:'함께 달리기',kind:'culture',x:17,z:8,desc:'지우와 둘레길을 달리며 문화 카드를 모으고 편견을 피하세요.',color:'#e0a05a'},
 {name:'명절 마을',kind:'culture',x:24,z:8,desc:'설날에 사용할 전통 놀이 도구를 찾으세요.',color:'#b985ab'},
 {name:'일상생활 공방',kind:'culture',x:24,z:-8,desc:'북한말과 그림을 연결해 가방을 채워 주세요.',color:'#78a77c'},
 {name:'관광 안내소',kind:'culture',x:17,z:-8,desc:'풍경과 힌트로 여행 엽서를 완성하세요.',color:'#709fc2'},
 {name:'미래의 광장',kind:'story',x:10,z:-8,desc:'지우의 속마음을 듣고, 한반도의 미래에 대한 의견을 남기세요.',color:'#7b91a9'},
 {name:'선물 가게',kind:'culture',x:3,z:-8,desc:'여행의 추억을 친구에게 선물하세요.',color:'#dba16c'},
 {name:'마지막 광장',kind:'story',x:-4,z:-8,desc:'교류 중단 위기. 두 차례의 소식을 확인하고 대응을 선택하세요.',color:'#789b90'}];
const words=[{n:'남새',d:'채소',art:'veg'},{n:'닭알',d:'달걀',art:'egg'},{n:'곽밥',d:'도시락',art:'lunchbox'},{n:'손전화',d:'휴대전화',art:'phone'}];
const state={i:0,album:new Map(),choice1:null,choice2:null,choice3:null,gift:null,ending:null,favorite:null,friendReply:null,crisisReply:null,friend:40,met:false};
let px=-9.5,pz=8,cx=px,cz=pz,auto=false,modal=false,arrivalDelay=0,keys=new Set(),width=0,height=0,dpr=1,scale=25,last=0,walkPhase=0,toastTimer,wordSeen=new Set();
let foodTimer=null,foodDeadline=0,foodRound=0,foodHits=0,foodOrder=[],foodNote='';let endings=[];try{endings=JSON.parse(localStorage.getItem('hanbando-endings-v2')||'[]');if(!Array.isArray(endings))endings=[];}catch{}
const rand=(function(){let s=987654;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}})();
// Low-poly 3D scene: world-space meshes, orthographic camera, face depth sorting and directional shading.
const scene=[];let terrain=[];const rgb=c=>{let h=c.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
function shade(c,k){return 'rgb('+rgb(c).map(n=>Math.min(255,Math.round(n*k))).join(',')+')'}
function face(list,pts,c,k=1){list.push({p:pts,c:shade(c,k)})}
function box(l,x,y,z,w,h,d,c){let a=x-w/2,b=x+w/2,f=z-d/2,g=z+d/2,t=y+h;face(l,[[a,t,f],[b,t,f],[b,t,g],[a,t,g]],c,1.13);face(l,[[a,y,g],[a,t,g],[b,t,g],[b,y,g]],c,.89);face(l,[[b,y,f],[b,t,f],[b,t,g],[b,y,g]],c,.74);face(l,[[a,y,f],[a,t,f],[b,t,f],[b,y,f]],c,.79);face(l,[[a,y,f],[a,t,f],[a,t,g],[a,y,g]],c,.95)}
function cyl(l,x,y,z,r,top,h,c,n=10){let a=[],b=[];for(let i=0;i<n;i++){let t=i*Math.PI*2/n;a.push([x+Math.cos(t)*r,y,z+Math.sin(t)*r]);b.push([x+Math.cos(t)*top,y+h,z+Math.sin(t)*top])}if(top>0)face(l,b,c,1.12);for(let i=0;i<n;i++){let j=(i+1)%n;face(l,[a[i],a[j],b[j],b[i]],c,.85+.18*Math.cos(i*2*Math.PI/n-1.5))}}
function roof(l,x,y,z,w,d,h,c){let a=x-w/2,b=x+w/2,f=z-d/2,g=z+d/2;face(l,[[a,y,f],[b,y,f],[b,y+h,z],[a,y+h,z]],c,.82);face(l,[[a,y,g],[b,y,g],[b,y+h,z],[a,y+h,z]],c,1.04);face(l,[[a,y,f],[a,y,g],[a,y+h,z]],c,.9);face(l,[[b,y,f],[b,y,g],[b,y+h,z]],c,.75)}
function flat(l,x,z,w,d,c,y=.025){face(l,[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]],c)}
function tree(x,z,h=2.3){cyl(scene,x,0,z,.17,.12,h*.43,'#8d6749',7);cyl(scene,x,h*.3,z,h*.45,h*.12,h*.53,rand()>.5?'#6f9b67':'#86ae72',8);cyl(scene,x,h*.65,z,h*.34,0,h*.55,'#8cb77c',8)}
function house(s,idx){let side=-1;let x=s.x,z=s.z+side*4.3;box(scene,x,0,z,5.2,.25,3.5,'#d7c7a6');box(scene,x,.25,z,4.6,2.25,3.0,'#f3e4c7');roof(scene,x,2.5,z,5.3,3.7,1.15,s.color);let f=z-side*1.52;box(scene,x,.25,f,1.05,1.65,.12,'#8c6b50');for(let dx of [-1.45,1.45]){box(scene,x+dx,1.0,f,.85,.7,.15,'#6c9caa');box(scene,x+dx,1.33,f,.05,.7,.17,'#f2e4c8')}if(idx===1||idx===8){for(let j=0;j<7;j++)box(scene,x-2.1+j*.7,2.2,z-side*2.1,.7,.12,1.2,j%2?s.color:'#fff1d0');for(let dx of [-2.3,2.3])box(scene,x+dx,.2,z-side*2.55,.09,2,.09,'#98795b')}if(s.kind==='story'){cyl(scene,x-2.6,0,z-side*2.6,.25,.18,2.2,'#b6a17c',7);box(scene,x-2.6,1.6,z-side*2.6,.65,.45,.12,'#f4d589')}}
// Base island and riverbanks
box(scene,10,-.55,0,40,.5,42,'#94bb80');flat(scene,10,0,39.8,41.8,'#a9ca8c',0);
for(let j=0;j<10;j++)flat(scene,-8.4+rand()*36,-19+rand()*38,1.5+rand()*2,1+rand()*1.5,'#b4d393',.009);
// roads
for(let i=0;i<stages.length;i++){let s=stages[i];flat(scene,s.x,s.z,5.0,4.8,'#d2c0a0');flat(scene,s.x,s.z,4.7,4.5,'#f0dfb8',.035);if(i){let a=stages[i-1];flat(scene,(a.x+s.x)/2,(a.z+s.z)/2,Math.abs(a.x-s.x)+3.1,Math.abs(a.z-s.z)+3.1,'#e8d7b0',.03)}}flat(scene,-7,8,6,3.1,'#e8d7b0',.03);
terrain=scene.splice(0);
// water, rocks, distant mountains
for(let i=0;i<12;i++){let z=-20+i*3.5;flat(terrain,31,z,5.8,3.6,'#80bfc0',-.03);flat(terrain,31+Math.sin(i)*.8,z,1.8,.11,'#c2e6da',.005)}
for(let i=0;i<13;i++){let x=-8+i*3.1,z=-25-rand()*3,h=3.0+rand()*5;cyl(scene,x,-.3,z,3.5,0,h,i%2?'#8eaa86':'#9bbba0',5)}
for(let i=0;i<stages.length;i++){let s=stages[i];house(s,i);for(let side of [-1,1]){let x=s.x+side*2.2,z=s.z-2.25;box(scene,x,0,z,.7,.27,.7,'#b99c72');cyl(scene,x,.27,z,.33,.25,.38,'#75a26c',7);for(let j=0;j<3;j++){let a=j*2.1;cyl(scene,x+Math.cos(a)*.19,.57,z+Math.sin(a)*.19,.12,0,.13,side>0?'#e5a37e':'#f4d77a',6)}}let x=s.x+2.4,z=s.z+1.75;cyl(scene,x,0,z,.09,.08,1.8,'#807b61',6);box(scene,x,1.65,z,.31,.36,.31,'#f5d591');roof(scene,x,2.01,z,.48,.48,.18,'#718d7b');}
for(let i=0;i<68;i++){let x=-9+rand()*36,z=-19+rand()*38;let near=stages.some(s=>Math.hypot(x-s.x,z-s.z)<6);let onRoad=stages.some((s,i)=>{if(!i)return false;let a=stages[i-1];return x>=Math.min(a.x,s.x)-2&&x<=Math.max(a.x,s.x)+2&&z>=Math.min(a.z,s.z)-2&&z<=Math.max(a.z,s.z)+2});if(!near&&!onRoad)tree(x,z,1.7+rand()*1.4)}
for(let i=0;i<20;i++){let x=-7+rand()*34,z=-18+rand()*36;if(!stages.some(s=>Math.hypot(s.x-x,s.z-z)<5)){cyl(scene,x,0,z,.25,.05,.18,'#f6d27a',6)}}
function project(v){let [x,y,z]=v;let a=x-cx,b=z-cz;return [width*.5+(a-b)*.866*scale,height*.52+(a+b)*.43*scale-y*.94*scale,(a+b)*.72+y*.6]}
function drawFace(f){let p=f.p.map(project);ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();ctx.fillStyle=f.c;ctx.fill();ctx.strokeStyle=f.c;ctx.lineWidth=.55;ctx.stroke()}
function depth(f){return f.p.reduce((a,p)=>a+(p[0]+p[2])*.72+p[1]*.6,0)/f.p.length}
function player(l,x,z,phase){let b=Math.abs(Math.sin(phase))*.10;flat(l,x,z,.9,.7,'#78966d',.047);let stride=Math.sin(phase)*.12;box(l,x-.17,.04,z+stride,.24,.45,.25,'#3f5260');box(l,x+.17,.04,z-stride,.24,.45,.25,'#3f5260');box(l,x,.43+b,z,.69,.71,.45,'#e6aa53');box(l,x-.43,.43+b,z,.19,.58,.22,'#e3a755');box(l,x+.43,.43+b,z,.19,.58,.22,'#e3a755');box(l,x,.49+b,z+.29,.48,.53,.23,'#557f87');cyl(l,x,1.1+b,z,.36,.33,.43,'#edbc94',10);cyl(l,x,1.39+b,z,.38,.27,.20,'#514339',10);box(l,x,1.5+b,z,.77,.08,.8,'#e2a65d');cyl(l,x,1.55+b,z,.34,.27,.17,'#e2a65d',10)}
function drawLabel(s,i,t){let p=project([s.x,.05,s.z]);let q=project([s.x,2.35+Math.sin(t/500+i)*.08,s.z]);if(q[0]<-80||q[0]>width+80||q[1]<-50||q[1]>height+50)return;let active=i===state.i&&!state.ending,done=i<state.i||!!state.ending;ctx.save();ctx.globalAlpha=active||done?1:.75;ctx.beginPath();ctx.ellipse(p[0],p[1],scale*.78,scale*.34,0,0,Math.PI*2);ctx.fillStyle=active?'#f4c75caa':'#f9f6e2aa';ctx.fill();if(active){ctx.strokeStyle='#fff8c7';ctx.lineWidth=2;ctx.stroke()}ctx.font='bold 12px system-ui, sans-serif';let txt=(done?'✓ ':active?'◆ ':'')+s.name;let w=ctx.measureText(txt).width+20;ctx.fillStyle=active?'#36745d':'#fffdf3';ctx.beginPath();ctx.roundRect(q[0]-w/2,q[1]-18,w,27,9);ctx.fill();ctx.fillStyle=active?'#fff':'#3d5b4d';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,q[0],q[1]-4);ctx.beginPath();ctx.arc(q[0],q[1]+24,11,0,Math.PI*2);ctx.fillStyle=done?'#78a98a':active?'#d8a64d':'#fffdf3';ctx.fill();ctx.fillStyle=done||active?'#fff':'#3d5b4d';ctx.font='bold 11px system-ui, sans-serif';ctx.fillText(String(i+1),q[0],q[1]+25);ctx.restore()}
function draw(t){ctx.setTransform(dpr,0,0,dpr,0,0);let g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,state.ending==='war'?'#9ba9ab':'#b7dce2');g.addColorStop(1,state.ending==='war'?'#c1c3b9':'#e6ead0');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);for(let f of terrain)drawFace(f);let dynamic=[];player(dynamic,px,pz,walkPhase);let all=scene.concat(dynamic);all.sort((a,b)=>depth(a)-depth(b));for(let f of all)drawFace(f);if(state.ending==='war'||(state.i===9&&!state.ending)){ctx.fillStyle=state.ending==='war'?'#59646566':'#79675e38';ctx.fillRect(0,0,width,height)}for(let i=0;i<stages.length;i++)drawLabel(stages[i],i,t);if(state.i===0&&!modal){for(let i=0;i<words.length;i++){if(wordSeen.has(i))continue;let x=-8.4+i*.9,z=8;let q=project([x,1.05+Math.sin(t/350+i)*.17,z]);ctx.fillStyle='#fff5ce';ctx.beginPath();ctx.roundRect(q[0]-24,q[1]-13,48,26,8);ctx.fill();ctx.strokeStyle='#d7a64f';ctx.stroke();ctx.fillStyle='#624a29';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(words[i].n,q[0],q[1]+4)}}let p=project([px,2.05,pz]);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(p[0]-5,p[1]-5);ctx.lineTo(p[0]+5,p[1]-5);ctx.lineTo(p[0],p[1]+2);ctx.fill();drawMini()}
function drawMini(){let w=mini.clientWidth||140,h=mini.clientHeight||100;if(mini.width!==w*dpr||mini.height!==h*dpr){mini.width=w*dpr;mini.height=h*dpr}mc.setTransform(dpr,0,0,dpr,0,0);mc.clearRect(0,0,w,h);let m=(x,z)=>[13+(x+10)/36*(w-26),12+(z+10)/20*(h-24)];mc.beginPath();stages.forEach((s,i)=>{let p=m(s.x,s.z);i?mc.lineTo(...p):mc.moveTo(...p)});mc.strokeStyle='#c9d9c4';mc.lineWidth=5;mc.lineJoin='round';mc.stroke();stages.forEach((s,i)=>{let p=m(s.x,s.z);mc.fillStyle=i<state.i?'#78a98a':i===state.i?'#d8a64d':'#dce4d7';mc.beginPath();mc.arc(...p,i===state.i?5:3.6,0,Math.PI*2);mc.fill()});let p=m(px,pz);mc.fillStyle='#3c6e8b';mc.beginPath();mc.arc(...p,3.8,0,Math.PI*2);mc.fill()}
function resize(){dpr=Math.min(devicePixelRatio||1,2);width=innerWidth;height=innerHeight;canvas.width=width*dpr;canvas.height=height*dpr;scale=Math.max(17,Math.min(34,Math.min(width/26,height/19)))}addEventListener('resize',resize);resize();
function notice(t,alert=false){clearTimeout(toastTimer);$('#toast').classList.toggle('alert',alert);$('#toast').textContent=t;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),1800)}
function collect(n,d,e,category){if(!state.album.has(n)){state.album.set(n,{n,d,e,category});$('#count').textContent=state.album.size;return true}return false}
function updateMission(){let s=stages[state.i];$('#stageLabel').textContent=state.ending?'JOURNEY COMPLETE':`STOP ${String(state.i+1).padStart(2,'0')} / ${stages.length} · ${s.kind==='story'?'이야기':'문화 체험'}`;$('#stageName').textContent=state.ending?'여행을 마쳤어요!':s.name;$('#stageDesc').textContent=state.ending?'도감과 엔딩을 다시 확인하거나 새로운 여행을 시작할 수 있어요.':s.desc;$('#progress').style.width=(state.ending?100:state.i/stages.length*100)+'%';$('#walkBtn').textContent=state.ending?'엔딩 다시 보기':auto?'이동 중…':'다음 장소로 이동 →';updateFriend()}
function tick(t){let dt=Math.min(.05,(t-(last||t))/1000);last=t;let dx=0,dz=0;if(!modal&&!state.ending){let horizontal=(keys.has('right')?1:0)-(keys.has('left')?1:0),vertical=(keys.has('down')?1:0)-(keys.has('up')?1:0);if(horizontal||vertical){auto=false;dx=(horizontal+vertical)*.707;dz=(vertical-horizontal)*.707}else if(auto){let s=stages[state.i],d=Math.hypot(s.x-px,s.z-pz);if(d>.05){dx=(s.x-px)/d;dz=(s.z-pz)/d;if(d<dt*5.8){px=s.x;pz=s.z;dx=dz=0}}}let norm=Math.hypot(dx,dz);if(norm){px=Math.max(-9.6,Math.min(27,px+dx/norm*dt*5.8));pz=Math.max(-18,Math.min(18,pz+dz/norm*dt*5.8));walkPhase+=dt*12}else walkPhase=0;if(state.i===0){words.forEach((w,i)=>{if(!wordSeen.has(i)&&Math.hypot(px-(-8.4+i*.9),pz-8)<.8){wordSeen.add(i);collect(w.n,w.d,w.art,'북한말');notice(w.n+' = '+w.d+' · 도감 획득!')}})}let s=stages[state.i];if(t>arrivalDelay&&Math.hypot(px-s.x,pz-s.z)<.85){auto=false;openStage()}}cx+=(px-cx)*Math.min(1,dt*5);cz+=(pz-cz)*Math.min(1,dt*5);draw(t);requestAnimationFrame(tick)}
let mapKey={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};addEventListener('keydown',e=>{if(dialogType==='run'&&[' ','ArrowUp','w','W'].includes(e.key)){e.preventDefault();if(run&&run.on)runJump();else runStart();return}if(mapKey[e.key]||mapKey[e.key.toLowerCase()]){if(!modal){e.preventDefault();keys.add(mapKey[e.key]||mapKey[e.key.toLowerCase()])}}if(e.key==='Escape'&&modal&&['album','help'].includes(dialogType))closeModal()});addEventListener('keyup',e=>keys.delete(mapKey[e.key]||mapKey[e.key.toLowerCase()]));addEventListener('blur',()=>keys.clear());document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key)});
$('#walkBtn').onclick=()=>{if(state.ending){showEnding();return}auto=true;updateMission()};
let dialogType='',step=0,chosen=-1,matched=new Set(),picked=new Set(),selected=-1,feedback='',answerOK=false;
const foodPhotos=["images/food-1.jpg", "images/food-2.jpg", "images/food-3.jpg", "images/food-4.jpg"];
const foods=[{"n": "평양냉면", "d": "메밀 면과 차가운 육수를 곁들인 평양의 대표적인 향토 음식.", "e": "", "taste": "시원하고 담백한 면 요리", "reply": "시원한 면 요리를 좋아하는구나!"}, {"n": "어복쟁반", "d": "넓은 쟁반에 고기와 채소 등을 담아 육수와 함께 즐기는 음식.", "e": "", "taste": "함께 나누기 좋은 푸짐한 요리", "reply": "여럿이 둘러앉아 먹는 음식이 좋구나!"}, {"n": "대동강 숭어국", "d": "대동강의 숭어를 이용해 끓이는 평양의 향토 국 요리.", "e": "", "taste": "따뜻한 생선 국물 요리", "reply": "따뜻한 국물도 좋지!"}, {"n": "평양어죽", "d": "물고기와 곡물을 이용해 끓이는 평양의 향토 죽 요리.", "e": "", "taste": "부드럽고 따뜻한 죽 요리", "reply": "부드러운 죽 요리를 골랐네!"}].map((f,i)=>({...f,photo:foodPhotos[i]}));
const holidays=[{n:'연',art:'kite',ok:true},{n:'게임기',art:'console',ok:false},{n:'윷',art:'yut',ok:true},{n:'볼링공',art:'bowling',ok:false},{n:'팽이',art:'top',ok:true},{n:'기타',art:'guitar',ok:false}];
const bag=[{n:'곽밥',d:'도시락',art:'lunchbox'},{n:'손전화',d:'휴대전화',art:'phone'},{n:'닭알',d:'달걀',art:'egg'},{n:'남새',d:'채소',art:'veg'}], bagOrder=[2,0,3,1];
const tours=[{n:'백두산',d:'정상부에 커다란 화산호인 천지가 있어요.',hint:'산 정상에 커다란 화산호인 천지가 있는 곳은?',art:'baek'},{n:'개성',d:'고려의 도읍이었으며 성균관 등 역사 유적이 남아 있어요.',hint:'고려의 옛 도읍이며 성균관 같은 유적이 남은 도시는?',art:'kae'},{n:'금강산',d:'기암괴석과 아름다운 경관으로 유명하며 과거 남북 관광 교류가 이루어졌어요.',hint:'빼어난 바위 봉우리로 유명하고 과거 남북 관광 교류가 이루어진 산은?',art:'geum'}];
const gifts=[{n:'여행 엽서',art:'postcard',d:'다음에는 같이 여행 가면 좋겠다!'},{n:'윷놀이 세트',art:'yut',d:'우리도 윷놀이를 즐겨! 다음에 같이 놀자.'},{n:'음식 조리법',art:'recipe',d:'고마워! 나도 좋아하는 음식의 조리법을 알려줄게.'}];
function art(a){let head='<svg viewBox="0 0 160 115" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">',bg='<rect width="160" height="115" rx="12" fill="#f0f0df"/>';let s='';if(a==='noodle'){s=`<ellipse cx="80" cy="95" rx="58" ry="8" fill="#b3ac9455"/><path d="M19 56 Q23 106 80 106 Q137 106 141 56" fill="#9eb7b8" stroke="#75989b" stroke-width="2"/><ellipse cx="80" cy="56" rx="61" ry="33" fill="#d3e1dd"/><ellipse cx="80" cy="56" rx="54" ry="27" fill="#d9bb85"/><g stroke="#957448" stroke-width="3" fill="none" stroke-linecap="round">${Array.from({length:8},(_,i)=>`<path d="M${47+i*6} 70 q-20 -12 2 -21 t18 -17"/>`).join('')}</g><path d="M49 38 l25 10 -5 6 -27 -10z M55 31 l29 12 -4 6 -30 -12z" fill="#7da671"/><ellipse cx="99" cy="45" rx="16" ry="12" fill="#fff8d8"/><ellipse cx="99" cy="45" rx="8" ry="7" fill="#e9b54c"/><path d="M92 68 l19 -12 7 6 -19 12z" fill="#ae7562"/>`;}else if(a==='tofu'||a==='soy'){let tofu=a==='tofu';s=`<ellipse cx="80" cy="92" rx="65" ry="14" fill="#b3ac9455"/><ellipse cx="80" cy="75" rx="70" ry="32" fill="#fdfbf2" stroke="#b6c6bf" stroke-width="2"/>${[0,1,2].map((i)=>{let x=18+i*42,y=35+(i%2)*14;return tofu?`<path d="M${x} ${y+49} L${x+22} ${y} L${x+48} ${y+49}Z" fill="#c89142" stroke="#a97231" stroke-width="2"/><path d="M${x+9} ${y+42} L${x+23} ${y+11} L${x+40} ${y+42}Z" fill="#fff5d6"/><path d="M${x+13} ${y+32} Q${x+26} ${y+18} ${x+34} ${y+37}" stroke="#b54e39" stroke-width="5" fill="none"/>`:`<rect x="${x+1}" y="${y+9}" width="42" height="42" rx="13" fill="#a87b4e" stroke="#845a3c" stroke-width="2"/><ellipse cx="${x+22}" cy="${y+11}" rx="18" ry="9" fill="#fef4ce"/><path d="M${x+8} ${y+12} q14 -10 27 0" stroke="#b95538" stroke-width="4" fill="none"/>`}).join('')}`;}else if(a==='yut'){s=`<g transform="rotate(-22 80 57)">${[32,51,70,89].map((x,i)=>`<rect x="${x}" y="16" width="15" height="84" rx="7" fill="${i%2?'#d5aa68':'#e5c18b'}" stroke="#a78050" stroke-width="1.5"/><path d="M${x+4} 33 h7 m-7 49 h7" stroke="#a78050" stroke-width="2"/>`).join('')}</g>`;}else if(a==='top'){s='<ellipse cx="80" cy="98" rx="35" ry="6" fill="#b3ac9455"/><path d="M41 42 Q42 66 80 97 Q118 66 119 42Z" fill="#d49b59" stroke="#996638" stroke-width="2"/><ellipse cx="80" cy="42" rx="39" ry="15" fill="#efd39c"/><path d="M44 55 Q80 77 116 55" stroke="#ba6551" stroke-width="7" fill="none"/><rect x="75" y="15" width="10" height="32" rx="4" fill="#a47b4e"/>';}else if(a==='baek'){bg='<rect width="160" height="115" rx="12" fill="#c0e2ed"/>';s='<path d="M0 75 L19 43 39 50 62 16 84 36 109 18 160 66V115H0Z" fill="#788a8f"/><path d="M30 60 L62 16 84 36 109 18 144 56 112 43 93 53 62 39Z" fill="#edf2e8"/><path d="M0 86 Q40 59 80 70 T160 78 V115H0Z" fill="#438eac"/><path d="M14 95 Q60 80 105 91 T154 89" fill="none" stroke="#94cddd" stroke-width="3"/>';}else if(a==='kae'){bg='<rect width="160" height="115" rx="12" fill="#cce4d5"/>';s='<path d="M0 66 L28 34 58 58 95 26 160 63V115H0" fill="#9cb98d"/><rect x="19" y="92" width="123" height="12" rx="2" fill="#c5b49b"/><rect x="37" y="50" width="86" height="43" fill="#efdcc2"/><path d="M12 52 L34 30 126 30 148 52 130 56 30 56Z" fill="#556f72"/><path d="M19 48 Q80 40 141 48" stroke="#799094" stroke-width="3" fill="none"/><g fill="#955e4a"><rect x="40" y="56" width="6" height="36"/><rect x="114" y="56" width="6" height="36"/><rect x="66" y="63" width="28" height="30"/></g><rect x="0" y="104" width="160" height="11" fill="#ddc69c"/>';}else if(a==='geum'){bg='<rect width="160" height="115" rx="12" fill="#c7e3e4"/>';s='<path d="M0 105 L12 74 33 49 42 70 66 18 80 45 95 8 113 54 124 33 160 85V115H0Z" fill="#9ca4a0"/><path d="M19 96 L33 49 42 70 66 18 72 63 95 8 105 65 124 33 139 83" fill="none" stroke="#d7d8ca" stroke-width="7"/><path d="M0 89 Q25 73 48 97 Q75 81 96 99 Q138 77 160 96 V115H0Z" fill="#64917a"/>';}else if(a==='veg'){s='<ellipse cx="80" cy="100" rx="48" ry="7" fill="#b3ac9455"/><path d="M38 72 Q34 30 80 24 Q126 30 122 72 Q118 100 80 100 Q42 100 38 72Z" fill="#8cbf6a" stroke="#5f8f45" stroke-width="2"/><path d="M52 60 Q56 40 80 36 Q104 40 108 60 Q104 84 80 86 Q56 84 52 60Z" fill="#b6d98e"/><path d="M80 98 V38 M80 70 L60 52 M80 62 L101 46 M80 84 L62 72 M80 80 L99 68" stroke="#eef6df" stroke-width="3" fill="none" stroke-linecap="round"/>';}else if(a==='egg'){s='<ellipse cx="80" cy="98" rx="50" ry="7" fill="#b3ac9455"/><ellipse cx="62" cy="62" rx="23" ry="31" fill="#fbf3e2" stroke="#d8c7a4" stroke-width="2"/><ellipse cx="101" cy="67" rx="21" ry="27" fill="#f1dcb6" stroke="#cdb38a" stroke-width="2"/><ellipse cx="55" cy="49" rx="6" ry="10" fill="#fff"/><ellipse cx="95" cy="56" rx="5" ry="8" fill="#fbeed6"/>';}else if(a==='lunchbox'){s='<ellipse cx="80" cy="100" rx="56" ry="7" fill="#b3ac9455"/><rect x="26" y="30" width="108" height="66" rx="11" fill="#c8874e" stroke="#9b6235" stroke-width="2"/><rect x="34" y="38" width="92" height="50" rx="7" fill="#fdf6e4"/><path d="M84 38 V88" stroke="#c8874e" stroke-width="3"/>'+[0,1,2,3,4,5].map(i=>`<circle cx="${46+(i%3)*14}" cy="${54+Math.floor(i/3)*17}" r="6" fill="#ffffff" stroke="#e7dcc4"/>`).join('')+'<rect x="92" y="46" width="26" height="12" rx="4" fill="#f2c25a"/><rect x="92" y="64" width="26" height="14" rx="5" fill="#7fae62"/>';}else if(a==='phone'){s='<ellipse cx="80" cy="104" rx="30" ry="5" fill="#b3ac9455"/><rect x="56" y="12" width="48" height="88" rx="10" fill="#3d4a57"/><rect x="61" y="22" width="38" height="64" rx="4" fill="#9fd0e0"/><circle cx="80" cy="93" r="3.5" fill="#c9d3da"/><path d="M68 38 h24 M68 49 h18 M68 60 h22 M68 71 h14" stroke="#e8f6fa" stroke-width="4" stroke-linecap="round"/>';}else if(a==='kite'){s='<path d="M80 92 q14 6 2 11 q-12 5 2 10" stroke="#c95b4a" stroke-width="3" fill="none"/><path d="M112 14 q22 -6 34 8" stroke="#a78050" stroke-width="1.5" fill="none"/><rect x="48" y="12" width="64" height="80" rx="3" fill="#f7efe0" stroke="#a78050" stroke-width="2"/><rect x="48" y="12" width="64" height="14" fill="#c95b4a"/><path d="M48 12 L112 92 M112 12 L48 92 M80 12 V92 M48 52 H112" stroke="#a78050" stroke-width="1.3"/><circle cx="80" cy="52" r="12" fill="#f0f0df" stroke="#a78050" stroke-width="2"/>';}else if(a==='console'){s='<ellipse cx="80" cy="98" rx="52" ry="6" fill="#b3ac9455"/><path d="M30 58 Q30 38 52 38 H108 Q130 38 130 58 L134 78 Q136 94 120 92 L104 78 H56 L40 92 Q24 94 26 78Z" fill="#5b6672"/><path d="M44 58 h18 M53 49 v18" stroke="#dfe6ec" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="52" r="6" fill="#e0785d"/><circle cx="116" cy="62" r="6" fill="#7fb8d4"/><circle cx="96" cy="64" r="6" fill="#f2c25a"/>';}else if(a==='bowling'){s='<ellipse cx="80" cy="100" rx="52" ry="6" fill="#b3ac9455"/><path d="M110 18 q-9 10 -6 24 q-11 14 -8 34 q2 18 14 20 q12 -2 14 -20 q3 -20 -8 -34 q3 -14 -6 -24z" fill="#f7f3ea" stroke="#c9c1b0" stroke-width="2"/><path d="M103 40 h14" stroke="#c95b4a" stroke-width="4"/><circle cx="60" cy="72" r="27" fill="#3f5a78"/><circle cx="52" cy="62" r="4" fill="#22344a"/><circle cx="63" cy="58" r="4" fill="#22344a"/><circle cx="58" cy="71" r="4" fill="#22344a"/>';}else if(a==='guitar'){s='<ellipse cx="80" cy="104" rx="46" ry="5" fill="#b3ac9455"/><g transform="translate(14 6) scale(.82) rotate(-35 80 60)"><rect x="74" y="0" width="12" height="62" rx="3" fill="#7a5233"/><rect x="71" y="-6" width="18" height="12" rx="3" fill="#5e3d27"/><circle cx="80" cy="72" r="22" fill="#d49b59" stroke="#996638" stroke-width="2"/><circle cx="80" cy="96" r="26" fill="#d49b59" stroke="#996638" stroke-width="2"/><circle cx="80" cy="80" r="8" fill="#5e3d27"/><rect x="70" y="100" width="20" height="5" rx="2" fill="#5e3d27"/></g>';}else if(a==='postcard'){s='<ellipse cx="80" cy="100" rx="58" ry="6" fill="#b3ac9455"/><rect x="22" y="20" width="116" height="76" rx="6" fill="#fffaf0" stroke="#c9b48e" stroke-width="2"/><rect x="30" y="28" width="52" height="46" rx="3" fill="#c0e2ed"/><path d="M30 64 L46 44 58 56 70 40 82 58 V74 H30Z" fill="#788a8f"/><path d="M90 28 V88" stroke="#e2d6bd" stroke-width="2"/><rect x="108" y="28" width="22" height="26" rx="2" fill="#e3a07a"/><path d="M96 66 h34 M96 76 h34 M96 86 h24" stroke="#c9b48e" stroke-width="2.5" stroke-linecap="round"/>';}else if(a==='recipe'){s='<ellipse cx="80" cy="100" rx="60" ry="6" fill="#b3ac9455"/><path d="M80 30 Q56 20 22 26 V94 Q56 88 80 98Z" fill="#fffaf0" stroke="#c9b48e" stroke-width="2"/><path d="M80 30 Q104 20 138 26 V94 Q104 88 80 98Z" fill="#f7efdf" stroke="#c9b48e" stroke-width="2"/><path d="M34 44 h34 M34 56 h30 M34 68 h34 M34 80 h24" stroke="#d2b98d" stroke-width="3" stroke-linecap="round"/><circle cx="109" cy="56" r="16" fill="#d3e1dd"/><ellipse cx="109" cy="56" rx="11" ry="7" fill="#d9bb85"/><path d="M94 82 h30" stroke="#d2b98d" stroke-width="3" stroke-linecap="round"/>';}else if(a==='volley'){s='<ellipse cx="80" cy="100" rx="40" ry="6" fill="#b3ac9455"/><circle cx="80" cy="56" r="36" fill="#fdfaf0" stroke="#7b91a9" stroke-width="2.5"/><path d="M80 20 Q62 48 76 92 M46 44 Q80 52 114 38 M50 80 Q86 68 112 80" stroke="#7b91a9" stroke-width="3" fill="none"/>';}return head+bg+s+'</svg>'}
function picture(o){return o.art?art(o.art):`<span class="glyph">${(o.n||'').slice(0,2)}</span>`}
function show(title,tag,body,type='stage'){modal=true;auto=false;keys.clear();['hud','mission','controls'].forEach(id=>document.getElementById(id).inert=true);dialogType=type;$('#overlay').hidden=false;$('#dialog').innerHTML=`<div class="tag ${tag.includes('STORY')?'story':''}">${tag}</div><h2>${title}</h2>${body}`;$('#dialog').scrollTop=0;updateMission()}
function closeModal(){stopFoodTimer();stopRun();modal=false;$('#overlay').hidden=true;['hud','mission','controls'].forEach(id=>document.getElementById(id).inert=false);keys.clear();dialogType='';arrivalDelay=performance.now()+350}
function finish(){if(state.i>=stages.length-1)return;state.i++;closeModal();updateMission();if(state.i===7){notice('속보 · 접경지역 긴장 증가, 교류 일정은 아직 유지 중',true)}else if(state.i===9){notice('긴급 · 교류 행사 일시 중단, 마지막 광장에서 소식을 확인하세요',true)}else notice('다음 장소가 열렸어요!')}
function button(t,fn='finish()',cls='primary'){return `<button class="${cls}" onclick="${fn}">${t}</button>`}
function foot(t='다음 장소로 →',fn='finish()'){return `<div class="dialogfoot">${button(t,fn)}</div>`}
function openStage(){step=0;chosen=-1;matched=new Set();picked=new Set();selected=-1;feedback='';answerOK=false;[wordStage,foodStage,story1,runStage,holidayStage,bagStage,tourStage,story2,giftStage,story3][state.i]()}
function wordStage(){show('북한말을 먹어라!','CULTURE 01 · 언어',`<p>길 위에서 만난 단어예요. 놓친 단어도 이곳에서 클릭해 배울 수 있어요.</p><div class="tiles">${words.map((w,i)=>`<button class="tile ${wordSeen.has(i)?'good':''}" onclick="wordPick(${i})">${picture(w)}<strong>${w.n}</strong><span class="small">${wordSeen.has(i)?w.d:'뜻 알아보기'}</span></button>`).join('')}</div><div class="notice">${wordSeen.size} / ${words.length} 단어 수집 · 얼음보숭이는 실제 일상에서 널리 쓰이는 표현으로 단정하기 어려워 수집 목록에서 제외했어요.</div>${foot(wordSeen.size===words.length?'시장으로 이동 →':'나머지는 나중에 알아보기 →')}`)}
function wordPick(i){wordSeen.add(i);let w=words[i];collect(w.n,w.d,w.art,'북한말');wordStage()}
function foodStage(){show('오늘은 뭐 먹을까?','CULTURE 02 · 평양의 맛',`<p>평양의 음식 네 가지예요. 사진을 보고 가장 먹고 싶은 음식을 골라 보세요. 정답은 없어요!</p><div class="tiles foodgrid">${foods.map((f,i)=>`<button class="tile ${state.favorite===i?'good':''}" onclick="foodPick(${i})"><img src="${f.photo}" alt="${f.n}"><strong>${f.n}</strong>${state.favorite===i?'<span class="small">나의 선택 ✓</span>':''}</button>`).join('')}</div><div class="notice">${state.favorite===null?'어떤 맛이 궁금한가요?':`나의 메뉴: <b>${foods[state.favorite].n}</b><br>${foods[state.favorite].d}<br><span class="small">${foods[state.favorite].taste} · 음식 도감 저장!</span>`}</div>${state.favorite===null?'':`<div class="dialogfoot">${button('15초 주문 도전!','startFoodChallenge()','secondary')}${button('다음 장소로 →')}</div>`}`)}
function foodPick(i){state.favorite=i;let f=foods[i];collect(f.n,f.d,f.e,'음식');foodStage()}
function stopFoodTimer(){if(foodTimer!==null){clearInterval(foodTimer);foodTimer=null}}
function startFoodChallenge(){stopFoodTimer();foodRound=0;foodHits=0;foodNote='';foodOrder=[0,1,2,3].sort(()=>Math.random()-.5);foodDeadline=performance.now()+15000;foodChallenge();foodTimer=setInterval(foodClock,100)}
function foodClock(){if(!$('#foodTime')){stopFoodTimer();return}let left=Math.max(0,foodDeadline-performance.now());$('#foodTime').textContent=(left/1000).toFixed(1)+'초';$('#foodBar').style.width=(left/15000*100)+'%';if(left<=0)endFoodChallenge()}
function foodChallenge(){let target=foodOrder[foodRound];show('주문이 밀려온다!','CULTURE 02 · 15초 도전',`<div class="clockline"><span>주문 ${foodRound+1} / 4</span><span id="foodTime">15.0초</span></div><div class="clockbar"><i id="foodBar"></i></div><div class="speech">${av('guest')}<p><b>“${foods[target].n} 주세요!”</b></p></div><div class="tiles foodgrid">${foods.map((f,i)=>`<button class="tile" aria-label="음식 ${i+1}" onclick="foodChallengePick(${i})"><img src="${f.photo}" alt="음식 ${i+1}"><strong>메뉴 ${i+1}</strong></button>`).join('')}</div><div class="notice">${foodNote||'사진을 눌러 주문을 처리해 보세요!'}</div>${foot('도전 마치기','endFoodChallenge()')}`);let left=Math.max(0,foodDeadline-performance.now());$('#foodTime').textContent=(left/1000).toFixed(1)+'초';$('#foodBar').style.width=(left/15000*100)+'%'}
function foodChallengePick(i){if(performance.now()>=foodDeadline){endFoodChallenge();return}let f=foods[i];if(i===foodOrder[foodRound]){foodHits++;collect(f.n,f.d,f.e,'음식');foodNote='주문 성공! '+f.n;foodRound++;if(foodRound===4){endFoodChallenge();return}}else foodNote='이건 '+f.n+'이에요. 다시 골라 보세요!';foodChallenge()}
function endFoodChallenge(){stopFoodTimer();show('주문 도전 종료!','CULTURE 02 · 오늘의 메뉴',`<div class="notice"><b>${foodHits} / 4 주문 성공!</b><br>${foodHits===4?'모든 주문을 마쳤어요!':'괜찮아요. 아래 메뉴를 살펴보고 새로운 음식을 알아가요.'}</div><div class="tiles foodgrid">${foods.map(f=>`<div class="tile"><img src="${f.photo}" alt="${f.n}"><strong>${f.n}</strong><span class="small">${f.d}</span></div>`).join('')}</div><p class="small">도전 결과는 엔딩과 관계없어요.</p><div class="dialogfoot">${button('다시 도전','startFoodChallenge()','secondary')}${button('다음 장소로 →')}</div>`)}
function story1(){talk('meet','story1b')}
function story1b(){show('지우와 이야기 나누기','STORY · 새로운 친구',`<div class="speech">${av('friend')}<p><b>지우</b><br>다음에 우리 같이 먹으러 가자! 그 전에, 궁금한 게 있으면 뭐든 물어봐.</p></div><p>지우와 어떤 이야기를 나눌까요?</p><div class="choices"><button class="choice" onclick="chooseStory1('food')"><strong>평양에서는 어떤 음식을 좋아해?</strong></button><button class="choice" onclick="chooseStory1('play')"><strong>쉬는 날에는 뭐 하고 놀아?</strong></button><button class="choice" onclick="chooseStory1('travel')"><strong>평양에서 구경할 만한 곳은 어디야?</strong></button></div><p class="small">지우는 가상의 인물이에요. 이 질문은 우정이나 엔딩에 영향을 주지 않아요.</p>`)}
function chooseStory1(v){state.friendReply=v;let messages={food:'나는 냉면이 좋아! 네가 고른 음식도 같이 먹어 보고 싶어.',play:'나는 친구들과 윷놀이 하는 걸 좋아해. 다음 명절 마을에서 같이 놀자!',travel:'대동강 풍경을 보여 주고 싶어. 여행 엽서도 함께 골라 보자!'};show('지우와 친구가 되었어요','CULTURE · 새로운 친구',`<div class="speech">${av('friend')}<p><b>지우</b><br>${messages[v]}<br><br>그럼 이따 둘레길에서 같이 달리자!</p></div>${foot()}`)}
function holidayStage(){let n=[...picked].filter(i=>holidays[i].ok).length;show('명절 준비 대작전','CULTURE 04 · 설날',`<div class="speech">${av('friend')}<p>곧 설날이야! 함께 즐길 민속놀이 도구 세 가지를 찾아 줄래?</p></div><div class="tiles">${holidays.map((h,i)=>`<button class="tile ${picked.has(i)?h.ok?'good':'bad':''}" onclick="holidayPick(${i})">${picture(h)}<strong>${h.n}</strong>${picked.has(i)?`<span class="small">${h.ok?'✓ 찾았다!':'다른 물건이에요'}</span>`:''}</button>`).join('')}</div><div class="notice">${n===3?'준비 완료! 북한에서도 설에 윷놀이와 연날리기 등 민속놀이를 즐기는 모습을 볼 수 있어요.':'민속놀이 도구 '+n+' / 3 발견'}</div><div class="dialogfoot">${n===3?'':button('정답 보기','holidayReveal()','secondary')}${button(n===3?'지우와 이야기하기 →':'체험 마치기 →',"talk('holiday','finish')")}</div>`)}
function holidayPick(i){picked.add(i);let h=holidays[i];if(h.ok)collect(h.n,'설날 등 즐길 수 있는 전통 놀이 도구.',h.art,'명절·놀이');holidayStage()}
function holidayReveal(){holidays.forEach((h,i)=>{if(h.ok){picked.add(i);collect(h.n,'설날 등 즐길 수 있는 전통 놀이 도구.',h.art,'명절·놀이')}});holidayStage()}
function bagStage(){show('친구의 가방을 챙겨줘!','CULTURE 05 · 일상생활',`<p>왼쪽 북한말을 고른 다음 오른쪽의 알맞은 그림을 클릭하세요. 틀려도 다시 도전할 수 있어요.</p><div class="split"><div><div class="small" style="text-align:center;margin-bottom:6px">물건 목록</div><div class="tiles">${bag.map((w,i)=>`<button class="tile ${matched.has(i)?'good':selected===i?'selected':''}" onclick="bagWord(${i})"><strong>${w.n}${matched.has(i)?' ✓':''}</strong></button>`).join('')}</div></div><div><div class="small" style="text-align:center;margin-bottom:6px">그림</div><div class="tiles">${bagOrder.map(i=>`<button class="tile ${matched.has(i)?'good':''}" onclick="bagPicture(${i})" aria-label="그림 ${bagOrder.indexOf(i)+1}">${picture(bag[i])}${matched.has(i)?`<span class="small">${bag[i].d}</span>`:''}</button>`).join('')}</div></div></div><div class="notice">${matched.size===4?'가방 준비 완료! 고마워!':feedback||`${matched.size} / 4 연결 완료`}</div><div class="dialogfoot">${matched.size===4?'':button('정답 보기','bagReveal()','secondary')}${button(matched.size===4?'다음 장소로 →':'체험 마치기 →')}</div>`)}
function bagWord(i){if(!matched.has(i)){selected=i;feedback='이 단어의 그림을 선택하세요.';bagStage()}}
function bagPicture(i){if(selected<0||matched.has(i))return;if(selected===i){matched.add(i);let w=bag[i];collect(w.n,w.d,w.art,'북한말');feedback=w.n+' = '+w.d+'!';selected=-1}else feedback='다른 그림을 골라 볼까요?';bagStage()}
function bagReveal(){bag.forEach((w,i)=>{matched.add(i);collect(w.n,w.d,w.art,'북한말')});selected=-1;bagStage()}
function tourStage(){let t=tours[step];show('북한 여행 엽서','CULTURE 06 · 관광',`<p>엽서 ${step+1} / ${tours.length} · 힌트와 그림을 보고 여행지를 맞혀 보세요. (풍경은 이해를 돕는 일러스트예요.)</p><div class="endart" style="height:180px">${art(t.art)}</div><p><b>${t.hint}</b></p><div class="tiles">${[2,0,1].map(i=>`<button class="tile ${chosen===i?(answerOK?'good':'bad'):''}" style="min-height:50px" onclick="tourPick(${i})"><strong>${tours[i].n}</strong></button>`).join('')}</div>${feedback?`<div class="notice ${answerOK?'':'bad'}">${feedback}</div>`:''}<div class="dialogfoot">${button('힌트 보기','tourHint()','secondary')}${button(answerOK?(step===2?'여행 완료 →':'다음 엽서 →'):'정답 확인하기','tourNext()')}</div>`)}
function tourPick(i){if(answerOK)return;chosen=i;answerOK=i===step;feedback=answerOK?'엽서 획득! '+tours[i].d:'아쉬워요! 다른 곳을 골라 보세요.';if(answerOK)collect(tours[i].n,tours[i].d,tours[i].art,'관광');tourStage()}
function tourHint(){feedback='힌트: '+tours[step].d;tourStage()}
function tourNext(){if(!answerOK){tourPick(step);return}if(step===2){finish();return}step++;chosen=-1;answerOK=false;feedback='';tourStage()}
function story2(){talk('lonely','story2main')}
function story2main(){show('앞으로도 이렇게 만날 수 있을까?','STORY 01 · 가상 시민 의견 조사',`<div class="notice"><b>마을 뉴스</b><br>남북 문화 교류가 이어지면서 미래의 관계를 정하는 회담이 열립니다. 다만 최근 접경지역의 긴장도 높아지고 있습니다.</div><div class="speech">${av('friend')}<p><b>지우</b><br>오늘처럼 서로 놀러 갈 수 있는 날이 계속되면 좋겠어.</p></div><p>당신은 앞으로 어떤 한반도를 희망하나요? 이 의견을 바탕으로 가상 이야기가 이어집니다.</p><div class="choices"><button class="choice" onclick="chooseStory2('unity')"><strong>A. 하나의 나라에서 함께 살기</strong><span>서로 다른 제도를 천천히 맞춰 가며, 주민들의 동의를 바탕으로 평화통일을 준비한다.</span></button><button class="choice" onclick="chooseStory2('coexist')"><strong>B. 두 나라로 살면서 자유롭게 만나기</strong><span>각자의 제도를 유지하면서 평화협정을 맺고 여행과 교류를 이어간다.</span></button></div><p class="small">두 미래에는 우열이 없어요. 이 선택만으로 결말이 확정되지는 않습니다.</p>`)}
function chooseStory2(v){state.choice2=v;show('미래에 대한 의견을 남겼어요','STORY 01 · 선택 기록',`<div class="notice">${v==='unity'?'주민들의 동의와 충분한 협의를 전제로 평화통일을 추진하는 방향이 논의됩니다.':'평화협정과 지속적인 교류를 통해 두 국가가 공존하는 방향이 논의됩니다.'}</div><p>이야기는 아직 끝나지 않았어요. 선물 가게로 가 볼까요?</p>${foot()}`)}
function giftStage(){show('친구에게 보내는 선물','CULTURE 07 · 교류',`<p>오늘 함께한 여행의 추억을 담아 지우에게 선물을 골라 주세요.</p><div class="tiles">${gifts.map((g,i)=>`<button class="tile ${chosen===i?'good':''}" onclick="giftPick(${i})">${picture(g)}<strong>${g.n}</strong></button>`).join('')}</div>${chosen!==-1?`<div class="speech">${av('friend')}<p><b>지우의 답장</b><br>${gifts[chosen].d}</p></div>${foot('선물 보내기 →','giftFinish()')}`:'<div class="notice">마음에 드는 선물을 골라 주세요. 어느 것을 골라도 괜찮아요.</div>'}`)}
function giftPick(i){chosen=i;giftStage()}
function giftFinish(){state.gift=chosen;let g=gifts[chosen];collect('선물: '+g.n,g.d,g.art,'교류');talk('promise','finish')}
function story3(){show('교류가 멈췄다','STORY 02 · 가상의 위기',`<div class="urgent"><b>● 긴급 속보</b><br>접경지역에서 군사적 충돌이 발생할 뻔했습니다. 양측은 서로 책임이 있다고 주장하고, 교류 행사가 일시 중단되었습니다.</div><div class="speech">${av('friend')}<p><b>지우의 메시지</b><br>우리 다음에 또 만나기로 했잖아. 행사가 취소된대… 무슨 일이야?</p></div><p>중재국이 양측에 군사 활동을 잠시 멈추자고 제안했습니다. 시민 의견 조사에서 어떤 대응을 지지하나요?</p><div class="choices"><button class="choice" onclick="crisisFirst('pause')"><strong>A. 양측이 동시에 군사 활동을 멈추고 조사하기</strong><span>당장 충돌 위험을 낮출 수 있지만, 상대도 약속을 지키는지 확인해야 한다.</span></button><button class="choice" onclick="crisisFirst('guard')"><strong>B. 경계를 유지하면서 먼저 사실관계를 확인하기</strong><span>안전 대비를 유지할 수 있지만, 서로 경계하는 상태가 계속된다.</span></button></div><p class="small">이 장면은 국가 차원의 가상 사건이며, 문화 체험이나 친구 선택과는 별개입니다.</p>`)}
function crisisFirst(v){state.choice1=v;let paused=v==='pause';show('하루 뒤, 마지막 협상','STORY 03 · 긴급 후속 소식',`<div class="${paused?'notice':'urgent'}"><b>${paused?'속보 · 잠정 중단 합의':'속보 · 긴장 지속'}</b><br>${paused?'이 가상 이야기에서 양측은 중재안을 받아들여 군사 활동을 일시 중단했습니다. 아직 정식 합의는 남아 있습니다.':'양측은 경계를 계속 유지하고 있습니다. 서로 상대가 먼저 조치해야 한다고 주장하면서 충돌 위험이 커졌습니다.'}</div><p>중재국이 양측의 동시 조치와 이행 확인을 포함한 협상안을 제안했습니다. 마지막으로 어떤 방안을 지지하나요?</p><div class="choices"><button class="choice" onclick="chooseStory3('mediate')"><strong>A. 중재 협상에 참여하기</strong><span>상대의 조치도 동시에 확인하는 조건으로 협상에 참여한다.</span></button><button class="choice" onclick="chooseStory3('hold')"><strong>B. 상대의 선조치를 요구하며 협상을 보류하기</strong><span>상대가 먼저 행동해야 한다는 입장을 유지한다. 협상이 지연될 수 있다.</span></button></div><p class="small">당신의 응답을 바탕으로 가상의 국가 간 사건이 이어집니다.</p>`)}
function decide(a,b,c){if(a==='guard'&&c==='hold')return 'war';if(b==='unity')return state.friend<50?'apart':'unity';return 'coexist'}
function chooseStory3(v){state.choice3=v;state.ending=decide(state.choice1,state.choice2,v);if(!endings.includes(state.ending)){endings.push(state.ending);try{localStorage.setItem('hanbando-endings-v2',JSON.stringify(endings))}catch{}}updateMission();showEnding()}
const endingInfo={apart:{n:'제도는 하나, 마음은 둘',label:'숨은 엔딩 · 닿지 않은 마음',text:'위기가 완화된 이후 평화적인 통일이 이루어졌어요. 하지만 여행 내내 서로의 말과 음식, 명절을 이해하려는 대화가 부족했던 탓에, 한 나라가 된 뒤에도 사람들 사이의 거리는 쉽게 좁혀지지 않았어요. 제도는 하나가 되었지만, 마음은 아직 둘로 남아 있습니다.',msg:'…응, 잘 지내. (지우에게서 짧은 답장만 돌아왔어요)'},unity:{n:'하나의 한반도',label:'평화통일',text:'위기가 완화된 이후, 오랜 협의와 주민들의 동의를 거쳐 평화적인 통일이 이루어졌어요. 문화마을의 음식과 놀이, 여행이 일상으로 이어지는 미래입니다.',msg:'우리 다음 설날에는 같이 윷놀이하자! 이번엔 내가 놀러 갈게.'},coexist:{n:'서로의 이웃으로',label:'평화적 두 국가 공존',text:'위기가 완화된 이후, 남과 북은 서로 다른 국가 체제를 유지하며 평화협정과 교류를 이어가는 길을 선택했어요. 사람들은 합의된 교류를 통해 계속 서로를 만나요.',msg:'다음 교류 축제에서 만나자! 내가 맛있는 냉면집을 알려줄게.'},war:{n:'멈춰버린 시간',label:'전쟁',text:'이 가상 이야기에서 양측은 군사 활동을 계속했고, 서로 선조치를 요구해 중재 협상까지 무산됐습니다. 이후 우발적인 충돌이 확대되어 전쟁으로 이어졌어요. 음식점과 문화 행사는 문을 닫고 주민들의 일상과 만남이 어려워졌어요.',msg:'잘 지내고 있어? 다시 만날 수 있으면 좋겠다. — 메시지 전달 실패'}};
function endArt(e){let war=e==='war',co=e==='coexist',ap=e==='apart';return `<svg viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice"><rect width="600" height="150" fill="${war?'#b7bfbe':ap?'#cbd8d6':'#bde0df'}"/><circle cx="480" cy="34" r="24" fill="${war?'#d1d0c6':'#ffe0a0'}"/><path d="M0 100 L75 34 140 78 210 24 290 90 380 32 450 85 540 29 600 65 V150 H0Z" fill="${war?'#929e99':'#8eb398'}"/><path d="M0 102 Q160 72 300 110 T600 95 V150 H0Z" fill="${war?'#a7aaa0':'#a6c88d'}"/>${[55,140,225,375,460,545].map((x,i)=>`<g><rect x="${x-22}" y="86" width="44" height="36" rx="2" fill="${war?'#c9c5b8':'#f2dfbd'}"/><path d="M${x-28} 87 L${x} 65 ${x+28} 87Z" fill="${war?'#7e8b89':['#cd856a','#7199a8','#d0a260'][i%3]}"/><rect x="${x-5}" y="102" width="10" height="20" fill="#957e66"/></g>`).join('')}${ap?'<path d="M45 138 Q170 126 268 132" stroke="#efd9ac" stroke-width="13" fill="none"/><path d="M332 132 Q430 126 555 138" stroke="#efd9ac" stroke-width="13" fill="none"/><circle cx="130" cy="117" r="10" fill="#e6aa53"/><circle cx="470" cy="117" r="10" fill="#5d93a6"/>':co?'<path d="M280 100 Q310 115 292 150 H329 Q345 123 314 100Z" fill="#7eb8c3"/><rect x="265" y="121" width="75" height="8" rx="3" fill="#bc9d72"/>':war?'<path d="M270 137 h22 m17 0 h21" stroke="#c6bba6" stroke-width="10"/><path d="M292 116 L308 150 M308 116 L292 150" stroke="#78827e" stroke-width="4"/>':'<path d="M45 138 Q300 119 555 138" stroke="#efd9ac" stroke-width="13" fill="none"/><circle cx="300" cy="116" r="18" fill="#e8c58c"/>'}</svg>`}
function showEnding(){let e=state.ending,info=endingInfo[e],msg=info.msg;if(e==='coexist'&&state.friend<50)msg='응, 다음에 또 보자. (지우의 답장이 예전보다 짧아졌어요)';show(info.n,'ENDING · '+info.label,`<div class="endart">${endArt(e)}</div><div class="ending ${e}"><b>${info.label}</b><p>${info.text}</p><div class="storytrace"><div>미래 의견 · ${state.choice2==='unity'?'하나의 국가':'두 국가의 평화적 공존'}</div><div>첫 위기 · ${state.choice1==='pause'?'상호 군사 활동 일시 중단':'경계 유지 및 조사'}</div><div>마지막 협상 · ${state.choice3==='mediate'?'중재 협상 참여':'상대 선조치 요구 및 협상 보류'}</div><div>지우와의 우정 · ${state.friend} (${friendTier()})</div>${e==='apart'?'<div>통일은 제도만으로 완성되지 않아요. 지우의 말과 음식, 명절을 이해하는 대답을 고르면 다른 결말을 볼 수 있어요.</div>':''}${e!=='war'?`<div>${state.choice3==='hold'?'앞서 이루어진 잠정 중단 덕분에 충돌을 피하고 이후 다시 협상을 열었습니다.':'중재 과정에서 상호 조치를 확인하며 위기를 완화했습니다.'}</div>`:''}</div><div class="speech">${av(e==='war'?'off':'friend')}<p>${msg}</p></div>${state.gift!==null?`<div class="small">오늘 고른 선물: ${gifts[state.gift].n} · ${e==='war'?'다시 만날 날을 기다립니다.':'친구와 함께한 추억으로 남았어요.'}</div>`:''}</div><p class="small">이 결과는 현실을 예측하는 것이 아니라, 선택에 따라 전개되는 가상의 이야기입니다. 문화 퀴즈 정답 개수는 엔딩과 무관하지만, 지우와의 우정은 결말에 영향을 줘요.</p><div class="dialogfoot">${button('이번 여행 정리','showSummary()','secondary')}${button('도감 확인','showAlbum()','secondary')}${button('마을 돌아보기','closeModal()','secondary')}${button('다시 여행하기','restart()')}</div>`,'ending')}
function showAlbum(){let a=[...state.album.values()];let html=['북한말','음식','명절·놀이','관광','교류'].map(cat=>{let list=a.filter(o=>o.category===cat);return `<h3 style="font-size:15px;margin:18px 0 6px">${cat} · ${list.length}개</h3><div class="stampgrid">${list.length?list.map(o=>`<div class="stamp">${cat==='음식'&&foods.find(f=>f.n===o.n)?`<img src="${foods.find(f=>f.n===o.n).photo}" alt="${o.n}">`:picture({art:o.e,n:o.n})}<b>${o.n}</b>${o.d}</div>`).join(''):'<span class="small">아직 수집한 항목이 없어요.</span>'}</div>`}).join('');show('나의 여행 도감','COLLECTION · '+a.length+'개 수집',`<p>점수가 아닌 여행의 기록이에요. 도감 수집률은 엔딩에 영향을 주지 않아요.</p>${html}<h3>엔딩 컬렉션 · ${endings.length} / 4</h3><div class="stampgrid" style="grid-template-columns:repeat(2,1fr)">${['unity','coexist','apart','war'].map(e=>`<div class="stamp ${endings.includes(e)?'':'locked'}"><span class="lockbadge">${endings.includes(e)?'발견':'미발견'}</span><b>${endings.includes(e)?endingInfo[e].n:(e==='apart'?'숨은 엔딩':'???')}</b>${endings.includes(e)?endingInfo[e].label:'아직 보지 못한 결말'}</div>`).join('')}</div>${foot('닫기','closeModal()')}`,'album')}
function showHelp(){show('여행을 시작해요!','HOW TO PLAY',`<p><b>방향키 / WASD</b> 또는 화면의 화살표 버튼으로 캐릭터를 직접 움직여요. <b>다음 장소로 이동</b> 버튼을 누르면 자동으로 걸어가요. <b>함께 달리기</b>에서는 스페이스바, 위쪽 방향키 또는 화면 터치로 점프해요.</p><p>초록색으로 표시된 장소에 가까이 가면 이벤트가 열려요. 문화 체험은 맞힐 때까지 다시 시도할 수 있고, 건너뛰거나 정답을 확인할 수도 있어요.</p><p>미래의 방향에 대한 의견 한 번과 국가 간 위기 대응 두 번이 엔딩을 바꿔요. 여기에 <b>지우와의 우정</b>이 더해져요. 지우에게 건네는 대답과 함께 달리기 결과에 따라 우정이 오르내리고, 우정이 낮으면 숨은 엔딩이 나올 수도 있어요. 음식 취향과 퀴즈 정답 개수는 결말과 무관해요.</p><div class="notice">이 마을은 실제 북한의 모습을 재현한 것이 아닌 가상의 문화교류 공간이에요. 등장인물과 미래 사건은 허구입니다. 음식 사진은 제공받은 사진을 사용했으며 음식 사진의 원 출처와 실제 재료는 별도로 검증하지 않았어요. 나머지 풍경은 설명용 일러스트입니다.</div><details class="sources"><summary>문화 콘텐츠 참고 자료</summary><ul><li><a href="https://encykorea.aks.ac.kr/Article/E0059956" target="_blank" rel="noopener">한국민족문화대백과사전 · 평양냉면</a></li><li><a href="https://encykorea.aks.ac.kr/Article/E0079945" target="_blank" rel="noopener">한국민족문화대백과사전 · 대동강숭엇국</a></li><li><a href="https://www.korean-culture.org/koreanet/view.do?RN=99&seq=11452" target="_blank" rel="noopener">한국문화원 · 평양 음식</a></li><li><a href="https://www.korea.kr/news/policyNewsView.do?newsId=148853961" target="_blank" rel="noopener">대한민국 정책브리핑 · 흥미로운 북한말 뜻풀이</a></li><li><a href="https://pedia.watcha.com/ko/contents/b9nOYdr" target="_blank" rel="noopener">우리말 통일사전 목차 · 남새, 닭알 등</a></li><li><a href="https://world.kbs.co.kr/service/contents_view.htm?board_seq=376431&id=&lang=k&menu_cate=northkorea" target="_blank" rel="noopener">KBS WORLD · 북한의 길거리 음식</a></li><li><a href="https://www.yna.co.kr/view/AKR20250123031300504" target="_blank" rel="noopener">연합뉴스 · 북한의 설 명절 문화 (2025)</a></li><li><a href="https://www.yna.co.kr/amp/view/AKR20220125126300504" target="_blank" rel="noopener">연합뉴스 · 북한 설 풍경 (2022)</a></li><li><a href="https://nkinfo.unikorea.go.kr/nkp/pge/view.do?menuId=MENU_48" target="_blank" rel="noopener">통일부 북한정보포털 · 관광업</a></li><li><a href="https://encykorea.aks.ac.kr/Article/E0001660" target="_blank" rel="noopener">한국민족문화대백과사전 · 개성특별시</a></li></ul><p class="small">어휘의 사용 빈도나 생활 방식은 지역과 시기에 따라 다를 수 있습니다.</p></details>${foot('여행 계속하기','closeModal()')}`,'help')}
// ===== 지우와의 우정 =====
function friendTier(){let f=state.friend;return f<35?'서먹한 사이':f<60?'알아가는 중':f<80?'친한 친구':'평생의 동무'}
function updateFriend(){let b=$('#friendBox');if(!b)return;b.hidden=!state.met;$('#friendVal').textContent=state.friend;$('#friendTier').textContent=friendTier();$('#friendBar').style.width=state.friend+'%'}
function addFriend(v){state.friend=Math.max(0,Math.min(100,state.friend+v));updateFriend()}
function av(k){
  let face=(hair,skin)=>`<circle cx="20" cy="23" r="10" fill="${skin}"/><circle cx="16.5" cy="24" r="1.3" fill="#3b2f2a"/><circle cx="23.5" cy="24" r="1.3" fill="#3b2f2a"/><path d="M17 28 q3 2.4 6 0" stroke="#b5654f" stroke-width="1.4" fill="none" stroke-linecap="round"/>${hair}`;
  let s={
    friend:'<circle cx="20" cy="20" r="20" fill="#d7ebe6"/>'+face('<path d="M9.5 22 Q9 10 20 10 Q31 10 30.5 22 Q27 15 20 15 Q13 15 9.5 22Z" fill="#2d2a2b"/><circle cx="9" cy="24" r="3.6" fill="#2d2a2b"/>','#f3cfaf'),
    guest:'<circle cx="20" cy="20" r="20" fill="#f3e3c9"/>'+face('<path d="M9.5 20 Q10 10 20 10 Q30 10 30.5 20Z" fill="#d9826b"/><rect x="20" y="17.5" width="14" height="3" rx="1.5" fill="#b9654f"/>','#edc39f'),
    off:'<circle cx="20" cy="20" r="20" fill="#e2e2dc"/><rect x="13" y="8" width="14" height="24" rx="3" fill="#6b7372"/><rect x="15" y="11" width="10" height="16" rx="1" fill="#b9c2c0"/><path d="M9 31 L31 9" stroke="#8a4632" stroke-width="3" stroke-linecap="round"/>'
  }[k];
  return `<span class="avatar"><svg viewBox="0 0 40 40" aria-hidden="true">${s}</svg></span>`;
}

// ===== 지우와의 대화 (대답에 따라 우정이 달라짐) =====
const talks={
  meet:{title:'평양에서 온 지우',tag:'STORY · 새로운 친구',
    line:()=>{let f=foods[state.favorite??0];return `안녕, 동무! 나는 평양에서 온 지우야. 시장에서 ${f.n} 골랐지? ${f.reply}`},
    ask:'"동무"라는 말을 처음 들은 나는 이렇게 대답했어요.',
    choices:[
      {t:'"동무? 친구라는 뜻이구나. 반가워, 지우야!"',v:12,r:'맞아, 친구라는 뜻이야! 우리 벌써 말이 잘 통하는 것 같아.'},
      {t:'"동무라니… 그 말은 좀 무섭게 들리는데."',v:-12,r:'아… 그냥 친구라는 뜻이었어. 내가 괜히 어색하게 만들었나 봐.'}],
    note:'"동무"는 원래 남과 북이 함께 쓰던, 친구를 뜻하는 우리말이에요. 남한에도 "어깨동무", "길동무" 같은 말이 남아 있어요.'},
  food:{title:'달리고 나서 먹는 간식',tag:'STORY · 지우와의 대화',
    line:'달리고 나니까 배고프다! 평양에서는 시장에서 두부밥이랑 인조고기밥을 자주 사 먹었어. 진짜 고소하거든.',
    ask:'어떻게 대답할까요?',
    choices:[
      {t:'"유부초밥이랑 비슷하네! 다음에 같이 만들어 먹자."',v:12,r:'좋아! 그럼 내가 양념장 만드는 법을 알려 줄게.'},
      {t:'"고기 대신 인조고기라니, 먹을 게 부족했나 보네."',v:-12,r:'…그냥 맛있어서 즐겨 먹는 음식이야.'}],
    note:'두부밥과 인조고기밥은 북한 시장에서 인기 있는 길거리 음식이에요. 인조고기는 콩기름을 짜고 남은 콩으로 만들어요.'},
  holiday:{title:'우리 설날엔',tag:'STORY · 지우와의 대화',
    line:'설날이면 가족이랑 이웃이 다 같이 모여서 윷놀이를 해. 너희도 그래?',
    ask:'어떻게 대답할까요?',
    choices:[
      {t:'"우리도 설날에 윷놀이해! 노는 방법도 거의 똑같네."',v:12,r:'정말? 그럼 다음 설날에는 한 판 붙자!'},
      {t:'"요즘 누가 윷놀이해. 인터넷이 안 돼서 그런 거 아니야?"',v:-12,r:'…다 같이 어울리는 게 좋아서 하는 건데.'}],
    note:'북한에서도 설에 윷놀이와 연날리기 같은 민속놀이를 즐겨요. 남과 북이 같은 명절에 같은 놀이를 하고 있는 셈이에요.'},
  lonely:{title:'지우의 속마음',tag:'STORY · 지우와의 대화',
    line:'사실 처음 여기 왔을 때, 사람들이 나를 신기한 듯 쳐다봐서 조금 외로웠어.',
    ask:'어떻게 대답할까요?',
    choices:[
      {t:'"나도 처음엔 편견이 있었어. 그런데 너랑 지내면서 다 사라졌어."',v:12,r:'…고마워. 그 말, 오래 기억할게.'},
      {t:'"환경이 달랐으니까 어쩔 수 없지, 뭐."',v:-8,r:'…그렇지, 뭐.'}],
    note:'편견은 직접 만나 이야기를 나눌 때 줄어들어요. 먼저 상대를 이해하려는 말 한마디가 거리를 좁혀요.'},
  promise:{title:'앞으로의 약속',tag:'STORY · 지우와의 대화',
    line:'선물 고마워. 그런데… 교류 행사가 끝나도 우리 계속 만날 수 있을까?',
    ask:'어떻게 대답할까요?',
    choices:[
      {t:'"그럼. 앞으로 함께 보낼 날이 훨씬 많았으면 좋겠어."',v:12,r:'응! 우리 이야기는 이제 시작이야.'},
      {t:'"다음엔 내가 맛집 소개해 줄게. 꼭 다시 만나자!"',v:8,r:'약속했다! 그땐 내가 두부밥 만들어 갈게.'},
      {t:'"좋은 경험이었어. 잘 지내."',v:-8,r:'…응, 그동안 고마웠어.'}],
    note:''}
};
function talk(id,next='finish'){
  state.met=true;updateFriend();
  let k=talks[id],order=k.choices.map((_,i)=>i).sort(()=>Math.random()-.5);
  let line=typeof k.line==='function'?k.line():k.line;
  show(k.title,k.tag,`<div class="speech">${av('friend')}<p><b>지우</b><br>${line}</p></div><p>${k.ask}</p><div class="choices">${order.map((ci,j)=>`<button class="choice" onclick="talkPick('${id}',${ci},'${next}')"><strong>${String.fromCharCode(65+j)}. ${k.choices[ci].t}</strong></button>`).join('')}</div><p class="small">대답에 따라 지우와의 우정이 달라져요.</p>`);
}
function talkPick(id,ci,next){
  let k=talks[id],c=k.choices[ci];addFriend(c.v);
  show(k.title,k.tag,`<div class="speech">${av('friend')}<p><b>지우</b><br>${c.r}</p></div><div class="delta ${c.v>=0?'up':'down'}">지우와의 우정 ${c.v>=0?'+':''}${c.v} · 현재 ${state.friend}</div>${k.note?`<div class="notice"><b>알아두기</b><br>${k.note}</div>`:''}${foot(next==='finish'?'다음 장소로 →':'계속 →',next+'()')}`);
}

// ===== 함께 달리기 (2D 러닝 미니게임) =====
const runItems=[
  {n:'손전화',m:'휴대전화',d:'휴대전화',c:'북한말',art:'phone'},
  {n:'가락지빵',m:'도넛',d:'도넛. 가운데가 뚫린 모양이 가락지(반지)를 닮았어요.',c:'북한말'},
  {n:'살까기',m:'다이어트',d:'다이어트. 살을 깎아 낸다는 뜻이에요.',c:'북한말'},
  {n:'단물',m:'주스·음료수',d:'단맛이 나는 음료. 과일로 만든 것은 과일단물이라고 해요.',c:'북한말'},
  {n:'손풍금',m:'아코디언',d:'아코디언. 손으로 바람을 넣어 연주하는 악기예요.',c:'북한말'},
  {n:'동무',m:'친구',d:'친구. 원래 남과 북이 함께 쓰던 우리말이에요.',c:'북한말'},
  {n:'두부밥',m:'두부 속 밥',d:'기름에 지진 두부 속에 밥을 채우고 양념을 바른 길거리 음식.',c:'음식',art:'tofu'},
  {n:'인조고기밥',m:'콩고기 밥',d:'콩으로 만든 인조고기에 밥을 싸고 양념을 얹은 길거리 음식.',c:'음식',art:'soy'},
  {n:'강냉이국수',m:'옥수수 국수',d:'강냉이(옥수수) 가루로 만든 구수한 국수.',c:'음식',art:'noodle'},
  {n:'감자농마국수',m:'감자 녹말 국수',d:'감자 녹말(농마)로 만든 쫄깃한 국수. 감자가 많이 나는 북쪽 지방에서 즐겨 먹어요.',c:'음식',art:'noodle'},
  {n:'윷',m:'윷놀이',d:'설날 등 즐길 수 있는 전통 놀이 도구.',c:'명절·놀이',art:'yut'},
  {n:'연',m:'연날리기',d:'설날 등 즐길 수 있는 전통 놀이 도구.',c:'명절·놀이',art:'kite'},
  {n:'팽이',m:'팽이치기',d:'설날 등 즐길 수 있는 전통 놀이 도구.',c:'명절·놀이',art:'top'},
  {n:'배구',m:'생활 체육',d:'북한에서 많은 사람이 즐기는 생활 체육 가운데 하나예요.',c:'명절·놀이',art:'volley'}];
const runColor={'북한말':'#c8913a','음식':'#cf6f55','명절·놀이':'#9a6a90'};
const runObs={
  pre:{labels:['편견'],me:['거기는 다 못 살지 않아?','북한 사람은 다 무서울 것 같았어.','우리랑은 완전히 다르겠지?'],ji:['…그렇게만 생각했구나.','나도 그냥 평범한 대학생이야.','궁금하면 직접 물어봐 줘.'],note:'편견 먹구름: 직접 묻지 않고 단정하면 마음의 거리가 멀어져요.'},
  slang:{labels:['갑분싸','얼죽아','킹받네','TMI','스불재','별다줄'],me:['오늘 완전 킹받네!','나 얼죽아라서… TMI인가?','갑분싸 되면 스불재잖아!'],ji:['…방금 무슨 말이야?','외국어처럼 들려.','조금 풀어서 말해 줄래?'],note:'줄임말 폭탄: 줄임말과 신조어는 처음 듣는 사람에게 벽이 될 수 있어요.'}};
const rpick=a=>a[Math.floor(Math.random()*a.length)];
const RW=640,RH=260,RG=214,RPX=170,RTIME=40;
let run=null,runRAF=0;
function stopRun(){cancelAnimationFrame(runRAF);runRAF=0;run=null}
function runStage(){
  stopRun();
  show('지우와 함께 달리기','CULTURE 03 · 함께 달리기',`<p>지우와 마을 둘레길을 ${RTIME}초 동안 달려요. <b>스페이스바, 위쪽 방향키 또는 화면 터치</b>로 점프하고, 공중에서 한 번 더 누르면 2단 점프! 문화 카드를 모으고 <b>편견 먹구름</b>과 <b>줄임말 폭탄</b>을 피하세요.</p><div class="runwrap"><canvas id="runCanvas" aria-label="달리기 미니게임 화면"></canvas><div class="runhud"><span id="runTime">남은 시간 ${RTIME}초</span><span id="runScore">문화 카드 0장 · 부딪힘 0회</span></div></div><div class="notice" id="runNote">부딪히면 지우가 서운해해요. 준비되면 시작을 누르세요.</div><div class="dialogfoot" id="runFoot">${button('건너뛰기','runEnd(true)','secondary')}${button('달리기 시작','runStart()')}</div>`,'run');
  runSetup();runDraw();
}
function runSetup(){
  let c=$('#runCanvas'),d=Math.min(devicePixelRatio||1,2);
  c.width=RW*d;c.height=RH*d;c.getContext('2d').setTransform(d,0,0,d,0,0);
  c.onpointerdown=e=>{e.preventDefault();if(run&&run.on)runJump();else runStart()};
  run={on:false,t:0,last:0,y:RG,vy:0,jumps:0,jx:RPX-90,jy:RG,jvy:0,scroll:0,items:[],obs:[],fx:[],got:new Map(),hits:0,inv:0,nc:.6,no:1.8,me:null,ji:null,sad:0};
}
function runStart(){
  if(!run||run.on)return;
  run.on=true;run.last=0;
  $('#runFoot').innerHTML=button('그만 달리기','runEnd(true)','secondary');
  $('#runNote').textContent='점프! 문화 카드를 모아 보세요.';
  if(document.activeElement)document.activeElement.blur();
  runRAF=requestAnimationFrame(runLoop);
}
function runJump(){if(!run||!run.on)return;if(run.jumps<2){run.vy=run.jumps?-500:-600;run.jumps++}}
function runLoop(t){
  if(!run||!run.on||!$('#runCanvas')){runRAF=0;return}
  let dt=Math.min(.05,(t-(run.last||t))/1000);run.last=t;
  runUpdate(dt);runDraw();
  if(run.t>=RTIME){runEnd(false);return}
  runRAF=requestAnimationFrame(runLoop);
}
function runPickItem(){let fresh=runItems.filter(it=>!run.got.has(it.n));return fresh.length&&Math.random()<.7?rpick(fresh):rpick(runItems)}
function runUpdate(dt){
  let r=run;r.t+=dt;let sp=290+r.t*3.5,dx=sp*dt;r.scroll+=dx;
  r.vy+=2000*dt;r.y+=r.vy*dt;if(r.y>=RG){r.y=RG;r.vy=0;r.jumps=0}
  // 우정이 높을수록 지우가 가까이에서 함께 달려요
  r.jx=RPX-(46+(1-state.friend/100)*80);
  r.jvy+=2000*dt;r.jy+=r.jvy*dt;
  if(r.jy>=RG){r.jy=RG;r.jvy=0;if(r.obs.some(o=>o.x>r.jx-10&&o.x-r.jx<62))r.jvy=-600}
  if(r.t>=r.nc&&r.t<RTIME-1){
    let it=runPickItem(),h=rpick([26,26,80,80,80,160]);
    if(r.obs.some(o=>Math.abs(o.x-(RW+30))<80))h=Math.max(h,80);
    r.items.push({it,x:RW+30,y:RG-h,ph:Math.random()*6});
    r.nc=r.t+.8+Math.random()*.6;
  }
  if(r.t>=r.no&&r.t<RTIME-2){
    let type=Math.random()<.55?'pre':'slang';
    r.obs.push({type,x:RW+40,label:rpick(runObs[type].labels)});
    r.no=r.t+1.4+Math.random()*1.1;
  }
  r.items.forEach(o=>o.x-=dx);r.obs.forEach(o=>o.x-=dx);
  let top=r.y-54;
  r.items=r.items.filter(o=>{
    if(o.x<-80)return false;
    let hw=o.w?o.w/2:30;
    if(Math.abs(o.x-RPX)<hw+10&&o.y+12>top&&o.y-12<r.y){
      r.got.set(o.it.n,o.it);
      r.fx.push({x:o.x,y:o.y,text:o.it.n+' = '+o.it.m,life:1.3,color:runColor[o.it.c]});
      return false;
    }
    return true;
  });
  r.obs=r.obs.filter(o=>o.x>-70);
  if(r.inv>0)r.inv-=dt;
  else for(let o of r.obs){
    if(o.hit)continue;
    let hw=o.type==='pre'?24:15,hh=o.type==='pre'?34:32;
    if(Math.abs(o.x-RPX)<hw+9&&r.y>RG-hh){
      o.hit=true;r.hits++;r.inv=1.1;r.sad=1.6;
      let k=runObs[o.type];r.me={t:rpick(k.me),life:1.7};r.ji={t:rpick(k.ji),life:1.7};
      $('#runNote').textContent=k.note;break;
    }
  }
  if(r.sad>0)r.sad-=dt;
  for(let b of ['me','ji'])if(r[b]){r[b].life-=dt;if(r[b].life<=0)r[b]=null}
  r.fx=r.fx.filter(f=>(f.life-=dt)>0);r.fx.forEach(f=>f.y-=26*dt);
  $('#runTime').textContent='남은 시간 '+Math.max(0,Math.ceil(RTIME-r.t))+'초';
  $('#runScore').textContent=`문화 카드 ${r.got.size}장 · 부딪힘 ${r.hits}회`;
}
function runPill(g,x,y,t,col){
  g.font='bold 13px system-ui, sans-serif';let w=g.measureText(t).width+26;
  g.fillStyle='#fffdf5';g.strokeStyle=col;g.lineWidth=2.5;g.beginPath();g.roundRect(x-w/2,y-13,w,26,13);g.fill();g.stroke();
  g.fillStyle=col;g.beginPath();g.arc(x-w/2+11,y,4,0,7);g.fill();
  g.fillStyle='#3d3a33';g.textAlign='center';g.textBaseline='middle';g.fillText(t,x+5,y+1);g.textBaseline='alphabetic';
  return w;
}
function runObstacle(g,o,t){
  g.save();g.textAlign='center';g.textBaseline='middle';
  if(o.type==='pre'){
    let x=o.x,b=RG;g.fillStyle=o.hit?'#a3aaae':'#6f7a83';
    g.beginPath();g.arc(x-14,b-14,14,0,7);g.arc(x+2,b-24,17,0,7);g.arc(x+17,b-13,13,0,7);g.fill();g.fillRect(x-20,b-14,38,14);
    g.fillStyle='#fff';g.font='bold 12px system-ui, sans-serif';g.fillText(o.label,x+1,b-16);
  }else{
    let x=o.x,cy=RG-17;
    g.strokeStyle='#5b4a3a';g.lineWidth=2.5;g.beginPath();g.moveTo(x+8,cy-14);g.quadraticCurveTo(x+16,cy-26,x+24,cy-22);g.stroke();
    g.fillStyle=Math.floor(t*10)%2?'#f2c25a':'#e0785d';g.beginPath();g.arc(x+25,cy-23,4,0,7);g.fill();
    g.fillStyle=o.hit?'#a99c95':'#c2563f';g.beginPath();g.arc(x,cy,17,0,7);g.fill();
    g.fillStyle='#fff';g.font='bold 10px system-ui, sans-serif';g.fillText(o.label,x,cy+1);
  }
  g.restore();
}
function runPerson(g,x,y,me,t,air,sad,blink){
  if(blink)return;
  g.save();g.translate(x,y);
  g.fillStyle='rgba(0,0,0,.13)';g.beginPath();g.ellipse(0,RG-y+2,14,4,0,0,7);g.fill();
  let sw=air?.55:Math.sin(t*14)*.7,leg=me?'#3f5260':'#3d4650',body=me?'#e6aa53':'#5d93a6',dark=me?'#c98d3c':'#477a8c';
  g.lineCap='round';g.strokeStyle=leg;g.lineWidth=6;
  [sw,-sw].forEach(a=>{g.beginPath();g.moveTo(0,-22);g.lineTo(Math.sin(a)*14,-22+Math.cos(a)*20);g.stroke()});
  if(me){g.fillStyle='#557f87';g.beginPath();g.roundRect(-15,-43,8,18,3);g.fill()}
  g.fillStyle=body;g.beginPath();g.roundRect(-10,-44,20,25,7);g.fill();
  g.strokeStyle=dark;g.lineWidth=5;
  [-sw,sw].forEach(a=>{g.beginPath();g.moveTo(0,-39);g.lineTo(Math.sin(a)*13,-39+Math.cos(a)*15);g.stroke()});
  g.fillStyle=me?'#edbc94':'#f3cfaf';g.beginPath();g.arc(0,-53,10,0,7);g.fill();
  if(me){g.fillStyle='#e2a65d';g.beginPath();g.ellipse(0,-58,14,3.5,0,0,7);g.fill();g.beginPath();g.arc(0,-59,9,Math.PI,0);g.fill()}
  else{g.fillStyle='#2d2a2b';g.beginPath();g.arc(0,-55,10.5,Math.PI*1.02,Math.PI*1.98);g.fill();g.beginPath();g.arc(-10,-51,4.5,0,7);g.fill()}
  g.fillStyle='#3b2f2a';g.beginPath();g.arc(3,-53,1.5,0,7);g.arc(7.5,-53,1.5,0,7);g.fill();
  g.strokeStyle='#b5654f';g.lineWidth=1.5;g.beginPath();
  if(sad)g.arc(5.5,-45,3,Math.PI*1.15,Math.PI*1.85);else g.arc(5.5,-49,3,Math.PI*.15,Math.PI*.85);
  g.stroke();g.restore();
}
function runBubble(g,x,y,t,dark){
  g.font='bold 12px system-ui, sans-serif';let w=g.measureText(t).width+18,bx=Math.max(4,Math.min(RW-w-4,x-w/2));
  g.fillStyle=dark?'#2f5d58':'#fffdf5';g.strokeStyle=dark?'#2f5d58':'#cfd8cc';g.lineWidth=1.5;
  g.beginPath();g.roundRect(bx,y-24,w,24,9);g.fill();g.stroke();
  g.beginPath();g.moveTo(x-5,y);g.lineTo(x,y+7);g.lineTo(x+5,y);g.fill();
  g.fillStyle=dark?'#fff':'#3d3a33';g.textAlign='center';g.textBaseline='middle';g.fillText(t,bx+w/2,y-12);g.textBaseline='alphabetic';
}
function runDraw(){
  let c=$('#runCanvas');if(!c||!run)return;
  let g=c.getContext('2d'),r=run,s=r.scroll;
  let sky=g.createLinearGradient(0,0,0,RG);sky.addColorStop(0,'#b7dce2');sky.addColorStop(1,'#eef0d8');g.fillStyle=sky;g.fillRect(0,0,RW,RH);
  g.fillStyle='#ffe7a6';g.beginPath();g.arc(560,52,22,0,7);g.fill();
  g.fillStyle='rgba(255,255,255,.85)';
  for(let i=-1;i<5;i++){let x=i*190-(s*.08)%190+40,y=34+((i+3)*17)%26;g.beginPath();g.arc(x,y,13,0,7);g.arc(x+16,y-6,16,0,7);g.arc(x+33,y,12,0,7);g.fill()}
  g.fillStyle='#a6c8a0';g.beginPath();g.moveTo(0,RG);
  for(let x=0;x<=RW;x+=20)g.lineTo(x,RG-58-Math.sin((x+s*.2)*.012)*16-Math.cos((x+s*.2)*.005)*12);
  g.lineTo(RW,RG);g.fill();
  let cols=['#dcaa57','#d9826b','#639aaf','#b985ab','#78a77c','#709fc2'],sp=150,off=s*.45;
  for(let i=-1;i<6;i++){
    let x=i*sp-off%sp,ci=Math.floor(off/sp)+i,col=cols[((ci%6)+6)%6];
    g.fillStyle='#f3e4c7';g.fillRect(x+20,RG-62,64,62);
    g.fillStyle=col;g.beginPath();g.moveTo(x+12,RG-60);g.lineTo(x+52,RG-88);g.lineTo(x+92,RG-60);g.fill();
    g.fillStyle='#8c6b50';g.fillRect(x+46,RG-30,13,30);
    g.fillStyle='#6c9caa';g.fillRect(x+28,RG-48,12,11);g.fillRect(x+65,RG-48,12,11);
    g.fillStyle='#86ae72';g.beginPath();g.arc(x+118,RG-34,16,0,7);g.fill();
    g.fillStyle='#8d6749';g.fillRect(x+115,RG-20,6,20);
  }
  g.fillStyle='#e8d7b0';g.fillRect(0,RG,RW,RH-RG);g.fillStyle='#d2c0a0';g.fillRect(0,RG,RW,4);
  g.fillStyle='#f3e6c6';for(let x=-(s%60);x<RW;x+=60)g.fillRect(x,RG+20,26,4);
  r.items.forEach(o=>{o.w=runPill(g,o.x,o.y+Math.sin(r.t*4+o.ph)*3,o.it.n,runColor[o.it.c])});
  r.obs.forEach(o=>runObstacle(g,o,r.t));
  runPerson(g,r.jx,r.jy,false,r.on?r.t:0,r.jy<RG-1,r.sad>0,false);
  runPerson(g,RPX,r.y,true,r.on?r.t:0,r.y<RG-1,false,r.inv>0&&Math.floor(r.t*12)%2===0);
  if(r.me)runBubble(g,RPX+10,r.y-70,r.me.t,false);
  if(r.ji)runBubble(g,r.jx-6,r.jy-98,r.ji.t,true);
  r.fx.forEach(f=>{g.globalAlpha=Math.min(1,f.life*1.5);g.font='bold 13px system-ui, sans-serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle='#fffdf5';g.strokeText(f.text,f.x,f.y-20);g.fillStyle=f.color;g.fillText(f.text,f.x,f.y-20);g.globalAlpha=1});
  if(!r.on){
    g.fillStyle='rgba(32,58,54,.38)';g.fillRect(0,0,RW,RH);
    g.fillStyle='#fffdf5';g.textAlign='center';g.font='bold 18px system-ui, sans-serif';g.fillText('화면을 누르거나 스페이스바로 시작',RW/2,RH/2-4);
    g.font='13px system-ui, sans-serif';g.fillText('공중에서 한 번 더 누르면 2단 점프',RW/2,RH/2+20);
  }
}
function runEnd(skip){
  if(!run)return;
  cancelAnimationFrame(runRAF);runRAF=0;
  let r=run,played=r.on;run=null;
  r.got.forEach(it=>collect(it.n,it.d,it.art||'',it.c));
  let gain=played?Math.min(8,r.got.size)-3*Math.min(3,r.hits):0;
  state.met=true;addFriend(gain);
  let list=[...r.got.values()];
  show(played?'달리기 끝!':'달리기를 건너뛰었어요','CULTURE 03 · 함께 달리기',
    `${played?`<div class="notice"><b>문화 카드 ${r.got.size}장 · 부딪힘 ${r.hits}회</b><br>${r.hits?'편견과 줄임말에 부딪힐 때마다 지우가 조금씩 서운해했어요.':'한 번도 부딪히지 않았어요! 지우가 즐거워해요.'}</div><div class="delta ${gain>=0?'up':'down'}">지우와의 우정 ${gain>=0?'+':''}${gain} · 현재 ${state.friend}</div>`:''}${list.length?`<div class="cardlist">${list.map(it=>`<div class="chip" style="border-left:4px solid ${runColor[it.c]}"><b>${it.n}</b>${it.m}</div>`).join('')}</div><p class="small">모은 카드는 도감에 저장했어요.</p>`:'<p class="small">모은 카드가 없어요. 다음 여행에서 다시 달려 봐요.</p>'}${foot('지우와 이야기하기 →',"talk('food','finish')")}`);
}

// ===== 이번 여행에서 만난 북한 문화 (발표 마무리용 정리 화면) =====
function showSummary(){
  let a=[...state.album.values()];
  let sec=(cat,title)=>{let l=a.filter(o=>o.category===cat);return l.length?`<h3>${title} · ${l.length}개</h3><div class="sumlist">${l.map(o=>`<div><b>${o.n}</b>${o.d}</div>`).join('')}</div>`:''};
  show('이번 여행에서 만난 북한 문화','SUMMARY · '+a.length+'개 기록',`<p>말은 조금 달라도, 알고 보면 익숙한 것이 많았어요. 이번 여행에서 만난 문화를 정리했어요.</p>${sec('북한말','북한말과 남한말')}${sec('음식','음식')}${sec('명절·놀이','명절과 놀이')}${sec('관광','가 보고 싶은 곳')}${a.length?'':'<div class="notice">이번 여행에서 기록한 문화가 없어요.</div>'}<div class="ending ${state.ending||''}"><b>지우와의 우정 · ${state.friend} (${friendTier()})</b><p>우리는 같은 설날에 윷을 던지고, 같은 냉면을 좋아합니다. 서로의 말과 음식, 명절을 알아 가는 것에서 통일은 시작됩니다.</p></div><div class="dialogfoot">${button('엔딩으로 돌아가기','showEnding()','secondary')}${button('다시 여행하기','restart()')}</div>`,'ending');
}

function restart(){state.i=0;state.album.clear();state.choice1=state.choice2=state.choice3=state.gift=state.ending=state.favorite=state.friendReply=state.crisisReply=null;stopFoodTimer();stopRun();state.friend=40;state.met=false;wordSeen.clear();px=cx=-9.5;pz=cz=8;auto=false;$('#count').textContent='0';closeModal();updateMission()}
$('#albumBtn').onclick=()=>showAlbum();$('#helpBtn').onclick=()=>showHelp();$('#resetBtn').onclick=()=>{show('새로운 여행을 시작할까요?','RESTART',`<p>이번 여행의 도감과 선택 기록은 초기화돼요. 발견한 엔딩은 브라우저가 저장을 허용하는 경우 유지됩니다.</p><div class="dialogfoot">${button('취소','closeModal()','secondary')}${button('처음부터','restart()')}</div>`,'help')};
updateMission();showHelp();requestAnimationFrame(tick);
