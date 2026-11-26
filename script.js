const $=s=>document.querySelector(s), canvas=$('#world'),ctx=canvas.getContext('2d'),mini=$('#mini'),mc=mini.getContext('2d');
const stages=[
 {name:'북한말 거리',kind:'culture',x:-4,z:8,desc:'길 위에 떠 있는 단어 카드를 만나 보세요.',color:'#4b5563'},
 {name:'먹거리 시장',kind:'culture',x:3,z:8,desc:'평양 음식 네 가지 중 취향을 고르고, 주문 도전에 참여해 보세요.',color:'#d94a3a'},
 {name:'만남의 광장',kind:'culture',x:10,z:8,desc:'평양에서 온 지우를 만나 첫인사를 나눠 보세요.',color:'#3f7cc2'},
 {name:'함께 달리기',kind:'culture',x:17,z:8,desc:'3구간 점프맵을 지우와 달리며 문화 카드를 모으고 퀴즈 문을 통과하세요.',color:'#e8963a'},
 {name:'명절 마을',kind:'culture',x:24,z:8,desc:'설날에 사용할 전통 놀이 도구를 찾으세요.',color:'#2f8f7a'},
 {name:'일상생활 공방',kind:'culture',x:24,z:-8,desc:'북한말과 그림을 연결해 가방을 채워 주세요.',color:'#d94a3a'},
 {name:'관광 안내소',kind:'culture',x:17,z:-8,desc:'풍경과 힌트로 여행 엽서를 완성하세요.',color:'#3f7cc2'},
 {name:'미래의 광장',kind:'story',x:10,z:-8,desc:'지우의 속마음을 듣고, 한반도의 미래에 대한 의견을 남기세요.',color:'#e8963a'},
 {name:'선물 가게',kind:'culture',x:3,z:-8,desc:'여행의 추억을 친구에게 선물하세요.',color:'#4b5563'},
 {name:'마지막 광장',kind:'story',x:-4,z:-8,desc:'교류 중단 위기. 두 차례의 소식을 확인하고 대응을 선택하세요.',color:'#2f8f7a'}];
const words=[{n:'남새',d:'채소',art:'veg'},{n:'닭알',d:'달걀',art:'egg'},{n:'원주필',d:'볼펜',art:'pen'},{n:'손전화',d:'휴대전화',art:'phone'}];
const state={i:0,album:new Map(),choice1:null,choice2:null,choice3:null,gift:null,ending:null,favorite:null,friendReply:null,crisisReply:null,friend:40,met:false};
let px=-9.5,pz=8,cx=px,cz=pz,auto=false,modal=false,arrivalDelay=0,keys=new Set(),width=0,height=0,dpr=1,scale=25,last=0,walkPhase=0,toastTimer,wordSeen=new Set();
let foodTimer=null,foodDeadline=0,foodRound=0,foodHits=0,foodOrder=[],foodNote='';let endings=[];try{endings=JSON.parse(localStorage.getItem('hanbando-endings-v2')||'[]');if(!Array.isArray(endings))endings=[];}catch{}
const rand=(function(){let s=987654;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}})();
// Low-poly 3D scene: world-space meshes, orthographic camera, face depth sorting and directional shading.
const scene=[];let terrain=[];const rgb=c=>{let h=c.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
function shade(c,k){return 'rgb('+rgb(c).map(n=>Math.min(255,Math.round(n*k))).join(',')+')'}
function face(list,pts,c,k=1){list.push({p:pts,c:shade(c,k)})}
function box(l,x,y,z,w,h,d,c){let a=x-w/2,b=x+w/2,f=z-d/2,g=z+d/2,t=y+h;face(l,[[a,t,f],[b,t,f],[b,t,g],[a,t,g]],c,1.13);face(l,[[a,y,g],[a,t,g],[b,t,g],[b,y,g]],c,.89);face(l,[[b,y,f],[b,t,f],[b,t,g],[b,y,g]],c,.74)}
function cyl(l,x,y,z,r,top,h,c,n=10){let a=[],b=[];for(let i=0;i<n;i++){let t=i*Math.PI*2/n;a.push([x+Math.cos(t)*r,y,z+Math.sin(t)*r]);b.push([x+Math.cos(t)*top,y+h,z+Math.sin(t)*top])}if(top>0)face(l,b,c,1.12);for(let i=0;i<n;i++){let j=(i+1)%n,m=(i+.5)*Math.PI*2/n;if(Math.cos(m)+Math.sin(m)<-.55)continue;face(l,[a[i],a[j],b[j],b[i]],c,.85+.18*Math.cos(i*2*Math.PI/n-1.5))}}
function roof(l,x,y,z,w,d,h,c){let a=x-w/2,b=x+w/2,f=z-d/2,g=z+d/2;face(l,[[a,y,f],[b,y,f],[b,y+h,z],[a,y+h,z]],c,.82);face(l,[[a,y,g],[b,y,g],[b,y+h,z],[a,y+h,z]],c,1.04);face(l,[[a,y,f],[a,y,g],[a,y+h,z]],c,.9);face(l,[[b,y,f],[b,y,g],[b,y+h,z]],c,.75)}
function flat(l,x,z,w,d,c,y=.025){face(l,[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]],c)}
function tree(x,z,h=2.3){blob(terrain,x+.3,z+.3,h*.42,h*.3,'#5d993d');let g=rand(),c=g>.66?['#2f7d43','#3b8f4d','#4aa25a']:g>.33?['#337f3f','#43944b','#56a85c']:['#2b7340','#378746','#48995a'];cyl(scene,x,0,z,.16,.12,h*.3,'#7a5233',6);cyl(scene,x,h*.22,z,h*.44,0,h*.5,c[0],7);cyl(scene,x,h*.45,z,h*.34,0,h*.42,c[1],7);cyl(scene,x,h*.66,z,h*.24,0,h*.38,c[2],7)}
// house(): 아래 world 모듈에서 정의
// Base island and riverbanks
flat(scene,12,0,45.4,43.4,'#5f9a3e',0);flat(scene,12,0,44.6,42.6,'#7cbd4e',0);
for(let j=0;j<10;j++)flat(scene,-8.4+rand()*36,-19+rand()*38,1.5+rand()*2,1+rand()*1.5,'#76b64e',.009);
// roads
for(let i=0;i<stages.length;i++){let s=stages[i];flat(scene,s.x,s.z,5.0,4.8,'#cfae78');flat(scene,s.x,s.z,4.7,4.5,'#ecd5a6',.035);if(i){let a=stages[i-1];flat(scene,(a.x+s.x)/2,(a.z+s.z)/2,Math.abs(a.x-s.x)+3.1,Math.abs(a.z-s.z)+3.1,'#e6cd9c',.03)}}flat(scene,-7,8,6,3.1,'#e6cd9c',.03);
terrain=scene.splice(0);
// water, rocks, distant mountains
for(let i=0;i<12;i++){let z=-19.2+i*3.5;flat(terrain,31,z,7.2,3.7,'#d9c99a',-.031);flat(terrain,31,z,5.8,3.6,'#7cc0c4',-.03);flat(terrain,31+Math.sin(i)*.8,z,1.8,.11,'#c2e6da',.005)}

for(let i=0;i<stages.length;i++){let s=stages[i];house(s,i);props(s,i);for(let side of [-1,1]){let x=s.x+side*2.2,z=s.z-2.25;box(scene,x,0,z,.7,.27,.7,'#b99c72');cyl(scene,x,.27,z,.33,.25,.38,'#75a26c',7);for(let j=0;j<3;j++){let a=j*2.1;cyl(scene,x+Math.cos(a)*.19,.57,z+Math.sin(a)*.19,.12,0,.13,side>0?'#e5a37e':'#f4d77a',6)}}let x=s.x+2.4,z=s.z+1.75;cyl(scene,x,0,z,.09,.08,1.8,'#807b61',6);box(scene,x,1.65,z,.31,.36,.31,'#f5d591');roof(scene,x,2.01,z,.48,.48,.18,'#718d7b');}
buildScenery();buildExtras();buildLand();
[[-8.6,-1.5],[-7.2,.8],[-5.6,-2.4],[-3.8,.2],[-2.2,-1.8],[-.4,.6],[1.4,-2.2],[3.2,.4],[4.6,-1.4],[15.2,-1.6],[16.8,.6],[18.6,-2.2],[20.2,.2],[19.4,2.2],[16,2.4],[-6.4,2.6],[2.2,2.6]].forEach(([x,z])=>tree(x,z,1.9+rand()*1.4));
for(let i=0;i<170;i++){let x=-9.5+rand()*37,z=-20+rand()*40;let near=stages.some(s=>Math.hypot(x-s.x,z-s.z)<5.4)||inScenery(x,z);let onRoad=stages.some((s,i)=>{if(!i)return false;let a=stages[i-1];return x>=Math.min(a.x,s.x)-2&&x<=Math.max(a.x,s.x)+2&&z>=Math.min(a.z,s.z)-2&&z<=Math.max(a.z,s.z)+2});if(!near&&!onRoad&&!onPath(x,z,.9))tree(x,z,1.9+rand()*1.6)}
for(let i=0;i<20;i++){let x=-7+rand()*34,z=-18+rand()*36;if(!stages.some(s=>Math.hypot(s.x-x,s.z-z)<5)){cyl(scene,x,0,z,.25,.05,.18,'#f6d27a',6)}}
function project(v){let [x,y,z]=v;let a=x-cx,b=z-cz;return [width*.5+(a-b)*.866*scale,height*.52+(a+b)*.43*scale-y*.94*scale,(a+b)*.72+y*.6]}
function drawFace(f){let p=f.p.map(project);ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();ctx.fillStyle=f.c;ctx.fill();if(f.d!==undefined){if(Math.abs(p[0][0]-p[2][0])+Math.abs(p[0][1]-p[2][1])<8)return;ctx.strokeStyle='rgba(52,40,34,.45)';ctx.lineWidth=.75}else{ctx.strokeStyle=f.c;ctx.lineWidth=.55}ctx.stroke()}
function depth(f){return f.p.reduce((a,p)=>a+(p[0]+p[2])*.72+p[1]*.6,0)/f.p.length}
function player(l,x,z,phase){let b=Math.abs(Math.sin(phase))*.10;flat(l,x,z,.9,.7,'#78966d',.047);let stride=Math.sin(phase)*.12;box(l,x-.17,.04,z+stride,.24,.45,.25,'#4f5663');box(l,x+.17,.04,z-stride,.24,.45,.25,'#4f5663');box(l,x,.49+b,z-.3,.5,.56,.22,'#b8392a');box(l,x,.43+b,z,.69,.71,.45,'#2b3d63');box(l,x-.43,.43+b,z,.19,.58,.22,'#26375a');box(l,x+.43,.43+b,z,.19,.58,.22,'#26375a');box(l,x,.74+b,z+.235,.26,.4,.03,'#f2efe6');box(l,x,.7+b,z+.255,.08,.4,.03,'#b8392a');cyl(l,x,1.1+b,z,.36,.33,.43,'#edbc94',10);cyl(l,x,1.4+b,z,.39,.34,.16,'#1d1a1c',10);cyl(l,x,1.56+b,z,.34,.2,.1,'#1d1a1c',10)}
function drawLabel(s,i,t){let p=project([s.x,.05,s.z]);let q=project([s.x,2.35+Math.sin(t/500+i)*.08,s.z]);if(q[0]<-80||q[0]>width+80||q[1]<-50||q[1]>height+50)return;let active=i===state.i&&!state.ending,done=i<state.i||!!state.ending;ctx.save();ctx.beginPath();ctx.ellipse(p[0],p[1],scale*.78,scale*.34,0,0,Math.PI*2);ctx.fillStyle=active?'#f2c25aaa':'#fffaf088';ctx.fill();if(active){ctx.strokeStyle='#b8392a';ctx.lineWidth=2;ctx.stroke()}ctx.font='bold 13px system-ui, sans-serif';let txt=(done?'✓ ':'')+s.name;let w=ctx.measureText(txt).width+22;ctx.fillStyle='#3a2c26';ctx.beginPath();ctx.roundRect(q[0]-w/2+3,q[1]-15,w,28,10);ctx.fill();ctx.fillStyle=active?'#b8392a':'#fffaf0';ctx.strokeStyle='#3a2c26';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(q[0]-w/2,q[1]-18,w,28,10);ctx.fill();ctx.stroke();ctx.fillStyle=active?'#fff':'#2e2622';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,q[0],q[1]-4);let cy=q[1]+27;ctx.beginPath();ctx.arc(q[0],cy,12,0,Math.PI*2);ctx.fillStyle=done?'#2f7a55':active?'#d79a2b':'#fffaf0';ctx.fill();ctx.strokeStyle='#3a2c26';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=done||active?'#fff':'#2e2622';ctx.font='bold 12px system-ui, sans-serif';ctx.fillText(String(i+1),q[0],cy+1);ctx.restore()}
function draw(t){ctx.setTransform(dpr,0,0,dpr,0,0);drawSkyLayer(t);drawTerrain();drawRiver(t);let dynamic=[];player(dynamic,px,pz,walkPhase);if(state.met)jiwooModel(dynamic,jx,jz,jPhase);sceneryDynamic(dynamic,t);drawWorld(dynamic);drawSceneryOverlay(t);drawTimeOverlay();drawKite(t);for(let i=0;i<stages.length;i++)drawLabel(stages[i],i,t);if(state.i===0&&!modal){for(let i=0;i<words.length;i++){if(wordSeen.has(i))continue;let x=-8.4+i*.9,z=8;let q=project([x,1.05+Math.sin(t/350+i)*.17,z]);ctx.fillStyle='#fff5ce';ctx.beginPath();ctx.roundRect(q[0]-24,q[1]-13,48,26,8);ctx.fill();ctx.strokeStyle='#d7a64f';ctx.stroke();ctx.fillStyle='#624a29';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(words[i].n,q[0],q[1]+4)}}drawJiwooBubble(t);let p=project([px,2.05,pz]);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(p[0]-5,p[1]-5);ctx.lineTo(p[0]+5,p[1]-5);ctx.lineTo(p[0],p[1]+2);ctx.fill();drawMini()}
function drawMini(){let w=mini.clientWidth||140,h=mini.clientHeight||100;if(mini.width!==w*dpr||mini.height!==h*dpr){mini.width=w*dpr;mini.height=h*dpr}mc.setTransform(dpr,0,0,dpr,0,0);mc.clearRect(0,0,w,h);let kh=h*.94,kw=kh*.62,kx=w/2-kw/2,ky=h*.03;mc.fillStyle='#4f86c6';mc.globalAlpha=.8;mc.beginPath();KOREA.forEach(([a,b],i)=>{let X=kx+a*kw,Y=ky+b*kh;i?mc.lineTo(X,Y):mc.moveTo(X,Y)});mc.closePath();mc.fill();mc.globalAlpha=1;let m=(x,z)=>[12+(x+10)/36*(w-24),9+(z+10)/20*(h-18)];mc.setLineDash([3,3]);mc.strokeStyle='#3a2c26';mc.lineWidth=1.5;mc.beginPath();stages.forEach((s,i)=>{let p=m(s.x,s.z);i?mc.lineTo(...p):mc.moveTo(...p)});mc.stroke();mc.setLineDash([]);if(state.i>0){mc.strokeStyle='#b8392a';mc.lineWidth=2.5;mc.beginPath();stages.slice(0,state.i+1).forEach((s,i)=>{let q=m(s.x,s.z);i?mc.lineTo(...q):mc.moveTo(...q)});mc.stroke()}mc.textAlign='center';mc.textBaseline='middle';mc.font='bold 8px system-ui, sans-serif';stages.forEach((s,i)=>{let p=m(s.x,s.z);mc.beginPath();mc.arc(...p,6.2,0,Math.PI*2);mc.fillStyle=i<state.i?'#2f7a55':i===state.i?'#b8392a':'#fffaf0';mc.fill();mc.strokeStyle='#3a2c26';mc.lineWidth=1.2;mc.stroke();mc.fillStyle=i<=state.i?'#fff':'#2e2622';mc.fillText(String(i+1),p[0],p[1]+.5)});let p=m(px,pz);mc.fillStyle='#b8392a';mc.strokeStyle='#3a2c26';mc.lineWidth=1.3;mc.beginPath();mc.moveTo(p[0],p[1]);mc.lineTo(p[0]-4.5,p[1]-7);mc.arc(p[0],p[1]-8.5,4.8,Math.PI*.82,Math.PI*.18);mc.closePath();mc.fill();mc.stroke();mc.fillStyle='#fffaf0';mc.beginPath();mc.arc(p[0],p[1]-8.5,1.8,0,Math.PI*2);mc.fill()}
function resize(){dpr=Math.min(devicePixelRatio||1,1.5);width=innerWidth;height=innerHeight;canvas.width=width*dpr;canvas.height=height*dpr;scale=Math.max(17,Math.min(34,Math.min(width/26,height/19)))}addEventListener('resize',resize);resize();
function notice(t,alert=false){clearTimeout(toastTimer);$('#toast').classList.remove('fact');$('#toast').classList.toggle('alert',alert);$('#toast').textContent=t;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),1800)}
function collect(n,d,e,category){if(!state.album.has(n)){state.album.set(n,{n,d,e,category});$('#count').textContent=state.album.size;return true}return false}
function updateMission(){let s=stages[state.i];$('#stageLabel').textContent=state.ending?'JOURNEY COMPLETE':`STOP ${String(state.i+1).padStart(2,'0')} / ${stages.length} · ${s.kind==='story'?'이야기':'문화 체험'}`;$('#stageName').textContent=state.ending?'여행을 마쳤어요!':s.name;$('#stageDesc').textContent=state.ending?'도감과 엔딩을 다시 확인하거나 새로운 여행을 시작할 수 있어요.':s.desc;$('#progress').style.width=(state.ending?100:state.i/stages.length*100)+'%';$('#walkBtn').textContent=state.ending?'엔딩 다시 보기':auto?'이동 중…':'다음 장소로 이동 →';updateFriend()}
function tick(t){let dt=Math.min(.05,(t-(last||t))/1000);last=t;let dx=0,dz=0;if(!modal&&!state.ending){let horizontal=(keys.has('right')?1:0)-(keys.has('left')?1:0),vertical=(keys.has('down')?1:0)-(keys.has('up')?1:0);if(horizontal||vertical){auto=false;dx=(horizontal+vertical)*.707;dz=(vertical-horizontal)*.707}else if(auto){let s=stages[state.i],d=Math.hypot(s.x-px,s.z-pz);if(d>.05){dx=(s.x-px)/d;dz=(s.z-pz)/d;if(d<dt*5.8){px=s.x;pz=s.z;dx=dz=0}}}let norm=Math.hypot(dx,dz);if(norm){let nx=px+dx/norm*dt*5.8,nz=pz+dz/norm*dt*5.8;if(auto||canWalk(nx,nz)||!canWalk(px,pz)){px=nx;pz=nz}else if(canWalk(nx,pz))px=nx;else if(canWalk(px,nz))pz=nz;walkPhase+=dt*12}else walkPhase=0;if(state.i===0){words.forEach((w,i)=>{if(!wordSeen.has(i)&&Math.hypot(px-(-8.4+i*.9),pz-8)<.8){wordSeen.add(i);collect(w.n,w.d,w.art,'북한말');notice(w.n+' = '+w.d+' · 도감 획득!')}})}let s=stages[state.i];if(t>arrivalDelay&&Math.hypot(px-s.x,pz-s.z)<.85){auto=false;openStage()}}updateJiwoo(dt,t);checkScenery();cx+=(px-cx)*Math.min(1,dt*5);cz+=(pz-cz)*Math.min(1,dt*5);draw(t);requestAnimationFrame(tick)}
let mapKey={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};addEventListener('keydown',e=>{if(dialogType==='run'&&[' ','ArrowUp','w','W'].includes(e.key)){e.preventDefault();if(run&&run.on)runJump();else runStart();return}if(!modal&&(e.key==='e'||e.key==='E')){revealBubble();return}if(mapKey[e.key]||mapKey[e.key.toLowerCase()]){if(!modal){e.preventDefault();keys.add(mapKey[e.key]||mapKey[e.key.toLowerCase()])}}if(e.key==='Escape'&&modal&&['album','help'].includes(dialogType))closeModal()});addEventListener('keyup',e=>keys.delete(mapKey[e.key]||mapKey[e.key.toLowerCase()]));addEventListener('blur',()=>keys.clear());document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key)};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key)});
$('#walkBtn').onclick=()=>{if(state.ending){showEnding();return}auto=true;updateMission()};
let dialogType='',step=0,chosen=-1,matched=new Set(),picked=new Set(),selected=-1,feedback='',answerOK=false;
const foodPhotos=["images/food-1.jpg", "images/food-2.jpg", "images/food-3.jpg", "images/food-4.jpg"];
const foods=[{"n": "평양냉면", "d": "메밀 면과 차가운 육수를 곁들인 평양의 대표적인 향토 음식.", "e": "", "taste": "시원하고 담백한 면 요리", "reply": "시원한 면 요리를 좋아하는구나!"}, {"n": "어복쟁반", "d": "넓은 쟁반에 고기와 채소 등을 담아 육수와 함께 즐기는 음식.", "e": "", "taste": "함께 나누기 좋은 푸짐한 요리", "reply": "여럿이 둘러앉아 먹는 음식이 좋구나!"}, {"n": "대동강 숭어국", "d": "대동강의 숭어를 이용해 끓이는 평양의 향토 국 요리.", "e": "", "taste": "따뜻한 생선 국물 요리", "reply": "따뜻한 국물도 좋지!"}, {"n": "평양어죽", "d": "평양의 향토 죽 요리로, 물고기 대신 닭고기를 넣어 끓여요.", "e": "", "taste": "부드럽고 따뜻한 죽 요리", "reply": "부드러운 죽 요리를 골랐네!"}].map((f,i)=>({...f,photo:foodPhotos[i]}));
const holidays=[{n:'연',art:'kite',ok:true},{n:'게임기',art:'console',ok:false},{n:'윷',art:'yut',ok:true},{n:'볼링공',art:'bowling',ok:false},{n:'팽이',art:'top',ok:true},{n:'기타',art:'guitar',ok:false}];
const bag=[{n:'원주필',d:'볼펜',art:'pen'},{n:'손전화',d:'휴대전화',art:'phone'},{n:'닭알',d:'달걀',art:'egg'},{n:'남새',d:'채소',art:'veg'}], bagOrder=[2,0,3,1];
const tours=[{n:'백두산',d:'정상부에 커다란 화산호인 천지가 있어요.',hint:'산 정상에 커다란 화산호인 천지가 있는 곳은?',art:'baek'},{n:'개성',d:'고려의 도읍이었으며 성균관 등 역사 유적이 남아 있어요.',hint:'고려의 옛 도읍이며 성균관 같은 유적이 남은 도시는?',art:'kae'},{n:'금강산',d:'기암괴석과 아름다운 경관으로 유명하며 과거 남북 관광 교류가 이루어졌어요.',hint:'빼어난 바위 봉우리로 유명하고 과거 남북 관광 교류가 이루어진 산은?',art:'geum'}];
const gifts=[{n:'여행 엽서',art:'postcard',d:'다음에는 같이 여행 가면 좋겠다!'},{n:'윷놀이 세트',art:'yut',d:'우리도 윷놀이를 즐겨! 다음에 같이 놀자.'},{n:'음식 조리법',art:'recipe',d:'고마워! 나도 좋아하는 음식의 조리법을 알려줄게.'}];
function art(a){let head='<svg viewBox="0 0 160 115" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">',bg='<rect width="160" height="115" rx="12" fill="#f0f0df"/>';let s='';if(a==='noodle'){s=`<ellipse cx="80" cy="95" rx="58" ry="8" fill="#b3ac9455"/><path d="M19 56 Q23 106 80 106 Q137 106 141 56" fill="#9eb7b8" stroke="#75989b" stroke-width="2"/><ellipse cx="80" cy="56" rx="61" ry="33" fill="#d3e1dd"/><ellipse cx="80" cy="56" rx="54" ry="27" fill="#d9bb85"/><g stroke="#957448" stroke-width="3" fill="none" stroke-linecap="round">${Array.from({length:8},(_,i)=>`<path d="M${47+i*6} 70 q-20 -12 2 -21 t18 -17"/>`).join('')}</g><path d="M49 38 l25 10 -5 6 -27 -10z M55 31 l29 12 -4 6 -30 -12z" fill="#7da671"/><ellipse cx="99" cy="45" rx="16" ry="12" fill="#fff8d8"/><ellipse cx="99" cy="45" rx="8" ry="7" fill="#e9b54c"/><path d="M92 68 l19 -12 7 6 -19 12z" fill="#ae7562"/>`;}else if(a==='tofu'||a==='soy'){let tofu=a==='tofu';s=`<ellipse cx="80" cy="92" rx="65" ry="14" fill="#b3ac9455"/><ellipse cx="80" cy="75" rx="70" ry="32" fill="#fdfbf2" stroke="#b6c6bf" stroke-width="2"/>${[0,1,2].map((i)=>{let x=18+i*42,y=35+(i%2)*14;return tofu?`<path d="M${x} ${y+49} L${x+22} ${y} L${x+48} ${y+49}Z" fill="#c89142" stroke="#a97231" stroke-width="2"/><path d="M${x+9} ${y+42} L${x+23} ${y+11} L${x+40} ${y+42}Z" fill="#fff5d6"/><path d="M${x+13} ${y+32} Q${x+26} ${y+18} ${x+34} ${y+37}" stroke="#b54e39" stroke-width="5" fill="none"/>`:`<rect x="${x+1}" y="${y+9}" width="42" height="42" rx="13" fill="#a87b4e" stroke="#845a3c" stroke-width="2"/><ellipse cx="${x+22}" cy="${y+11}" rx="18" ry="9" fill="#fef4ce"/><path d="M${x+8} ${y+12} q14 -10 27 0" stroke="#b95538" stroke-width="4" fill="none"/>`}).join('')}`;}else if(a==='yut'){s=`<g transform="rotate(-22 80 57)">${[32,51,70,89].map((x,i)=>`<rect x="${x}" y="16" width="15" height="84" rx="7" fill="${i%2?'#d5aa68':'#e5c18b'}" stroke="#a78050" stroke-width="1.5"/><path d="M${x+4} 33 h7 m-7 49 h7" stroke="#a78050" stroke-width="2"/>`).join('')}</g>`;}else if(a==='top'){s='<ellipse cx="80" cy="98" rx="35" ry="6" fill="#b3ac9455"/><path d="M41 42 Q42 66 80 97 Q118 66 119 42Z" fill="#d49b59" stroke="#996638" stroke-width="2"/><ellipse cx="80" cy="42" rx="39" ry="15" fill="#efd39c"/><path d="M44 55 Q80 77 116 55" stroke="#ba6551" stroke-width="7" fill="none"/><rect x="75" y="15" width="10" height="32" rx="4" fill="#a47b4e"/>';}else if(a==='baek'){bg='<rect width="160" height="115" rx="12" fill="#c0e2ed"/>';s='<path d="M0 75 L19 43 39 50 62 16 84 36 109 18 160 66V115H0Z" fill="#788a8f"/><path d="M30 60 L62 16 84 36 109 18 144 56 112 43 93 53 62 39Z" fill="#edf2e8"/><path d="M0 86 Q40 59 80 70 T160 78 V115H0Z" fill="#438eac"/><path d="M14 95 Q60 80 105 91 T154 89" fill="none" stroke="#94cddd" stroke-width="3"/>';}else if(a==='kae'){bg='<rect width="160" height="115" rx="12" fill="#cce4d5"/>';s='<path d="M0 66 L28 34 58 58 95 26 160 63V115H0" fill="#9cb98d"/><rect x="19" y="92" width="123" height="12" rx="2" fill="#c5b49b"/><rect x="37" y="50" width="86" height="43" fill="#efdcc2"/><path d="M12 52 L34 30 126 30 148 52 130 56 30 56Z" fill="#556f72"/><path d="M19 48 Q80 40 141 48" stroke="#799094" stroke-width="3" fill="none"/><g fill="#955e4a"><rect x="40" y="56" width="6" height="36"/><rect x="114" y="56" width="6" height="36"/><rect x="66" y="63" width="28" height="30"/></g><rect x="0" y="104" width="160" height="11" fill="#ddc69c"/>';}else if(a==='geum'){bg='<rect width="160" height="115" rx="12" fill="#c7e3e4"/>';s='<path d="M0 105 L12 74 33 49 42 70 66 18 80 45 95 8 113 54 124 33 160 85V115H0Z" fill="#9ca4a0"/><path d="M19 96 L33 49 42 70 66 18 72 63 95 8 105 65 124 33 139 83" fill="none" stroke="#d7d8ca" stroke-width="7"/><path d="M0 89 Q25 73 48 97 Q75 81 96 99 Q138 77 160 96 V115H0Z" fill="#64917a"/>';}else if(a==='pen'){s='<ellipse cx="80" cy="100" rx="50" ry="6" fill="#b3ac9455"/><g transform="rotate(-32 80 58)"><rect x="26" y="50" width="98" height="16" rx="8" fill="#3f6fa3"/><rect x="26" y="50" width="24" height="16" rx="7" fill="#2b4f7a"/><path d="M124 50 L146 58 L124 66Z" fill="#f2e6cc"/><path d="M139 55.5 L146 58 L139 60.5Z" fill="#2e2622"/><rect x="56" y="45" width="36" height="6" rx="3" fill="#c8c2b6"/></g>';}else if(a==='veg'){s='<ellipse cx="80" cy="100" rx="48" ry="7" fill="#b3ac9455"/><path d="M38 72 Q34 30 80 24 Q126 30 122 72 Q118 100 80 100 Q42 100 38 72Z" fill="#8cbf6a" stroke="#5f8f45" stroke-width="2"/><path d="M52 60 Q56 40 80 36 Q104 40 108 60 Q104 84 80 86 Q56 84 52 60Z" fill="#b6d98e"/><path d="M80 98 V38 M80 70 L60 52 M80 62 L101 46 M80 84 L62 72 M80 80 L99 68" stroke="#eef6df" stroke-width="3" fill="none" stroke-linecap="round"/>';}else if(a==='egg'){s='<ellipse cx="80" cy="98" rx="50" ry="7" fill="#b3ac9455"/><ellipse cx="62" cy="62" rx="23" ry="31" fill="#fbf3e2" stroke="#d8c7a4" stroke-width="2"/><ellipse cx="101" cy="67" rx="21" ry="27" fill="#f1dcb6" stroke="#cdb38a" stroke-width="2"/><ellipse cx="55" cy="49" rx="6" ry="10" fill="#fff"/><ellipse cx="95" cy="56" rx="5" ry="8" fill="#fbeed6"/>';}else if(a==='lunchbox'){s='<ellipse cx="80" cy="100" rx="56" ry="7" fill="#b3ac9455"/><rect x="26" y="30" width="108" height="66" rx="11" fill="#c8874e" stroke="#9b6235" stroke-width="2"/><rect x="34" y="38" width="92" height="50" rx="7" fill="#fdf6e4"/><path d="M84 38 V88" stroke="#c8874e" stroke-width="3"/>'+[0,1,2,3,4,5].map(i=>`<circle cx="${46+(i%3)*14}" cy="${54+Math.floor(i/3)*17}" r="6" fill="#ffffff" stroke="#e7dcc4"/>`).join('')+'<rect x="92" y="46" width="26" height="12" rx="4" fill="#f2c25a"/><rect x="92" y="64" width="26" height="14" rx="5" fill="#7fae62"/>';}else if(a==='phone'){s='<ellipse cx="80" cy="104" rx="30" ry="5" fill="#b3ac9455"/><rect x="56" y="12" width="48" height="88" rx="10" fill="#3d4a57"/><rect x="61" y="22" width="38" height="64" rx="4" fill="#9fd0e0"/><circle cx="80" cy="93" r="3.5" fill="#c9d3da"/><path d="M68 38 h24 M68 49 h18 M68 60 h22 M68 71 h14" stroke="#e8f6fa" stroke-width="4" stroke-linecap="round"/>';}else if(a==='kite'){s='<path d="M80 92 q14 6 2 11 q-12 5 2 10" stroke="#c95b4a" stroke-width="3" fill="none"/><path d="M112 14 q22 -6 34 8" stroke="#a78050" stroke-width="1.5" fill="none"/><rect x="48" y="12" width="64" height="80" rx="3" fill="#f7efe0" stroke="#a78050" stroke-width="2"/><rect x="48" y="12" width="64" height="14" fill="#c95b4a"/><path d="M48 12 L112 92 M112 12 L48 92 M80 12 V92 M48 52 H112" stroke="#a78050" stroke-width="1.3"/><circle cx="80" cy="52" r="12" fill="#f0f0df" stroke="#a78050" stroke-width="2"/>';}else if(a==='console'){s='<ellipse cx="80" cy="98" rx="52" ry="6" fill="#b3ac9455"/><path d="M30 58 Q30 38 52 38 H108 Q130 38 130 58 L134 78 Q136 94 120 92 L104 78 H56 L40 92 Q24 94 26 78Z" fill="#5b6672"/><path d="M44 58 h18 M53 49 v18" stroke="#dfe6ec" stroke-width="5" stroke-linecap="round"/><circle cx="104" cy="52" r="6" fill="#e0785d"/><circle cx="116" cy="62" r="6" fill="#7fb8d4"/><circle cx="96" cy="64" r="6" fill="#f2c25a"/>';}else if(a==='bowling'){s='<ellipse cx="80" cy="100" rx="52" ry="6" fill="#b3ac9455"/><path d="M110 18 q-9 10 -6 24 q-11 14 -8 34 q2 18 14 20 q12 -2 14 -20 q3 -20 -8 -34 q3 -14 -6 -24z" fill="#f7f3ea" stroke="#c9c1b0" stroke-width="2"/><path d="M103 40 h14" stroke="#c95b4a" stroke-width="4"/><circle cx="60" cy="72" r="27" fill="#3f5a78"/><circle cx="52" cy="62" r="4" fill="#22344a"/><circle cx="63" cy="58" r="4" fill="#22344a"/><circle cx="58" cy="71" r="4" fill="#22344a"/>';}else if(a==='guitar'){s='<ellipse cx="80" cy="104" rx="46" ry="5" fill="#b3ac9455"/><g transform="translate(14 6) scale(.82) rotate(-35 80 60)"><rect x="74" y="0" width="12" height="62" rx="3" fill="#7a5233"/><rect x="71" y="-6" width="18" height="12" rx="3" fill="#5e3d27"/><circle cx="80" cy="72" r="22" fill="#d49b59" stroke="#996638" stroke-width="2"/><circle cx="80" cy="96" r="26" fill="#d49b59" stroke="#996638" stroke-width="2"/><circle cx="80" cy="80" r="8" fill="#5e3d27"/><rect x="70" y="100" width="20" height="5" rx="2" fill="#5e3d27"/></g>';}else if(a==='postcard'){s='<ellipse cx="80" cy="100" rx="58" ry="6" fill="#b3ac9455"/><rect x="22" y="20" width="116" height="76" rx="6" fill="#fffaf0" stroke="#c9b48e" stroke-width="2"/><rect x="30" y="28" width="52" height="46" rx="3" fill="#c0e2ed"/><path d="M30 64 L46 44 58 56 70 40 82 58 V74 H30Z" fill="#788a8f"/><path d="M90 28 V88" stroke="#e2d6bd" stroke-width="2"/><rect x="108" y="28" width="22" height="26" rx="2" fill="#e3a07a"/><path d="M96 66 h34 M96 76 h34 M96 86 h24" stroke="#c9b48e" stroke-width="2.5" stroke-linecap="round"/>';}else if(a==='recipe'){s='<ellipse cx="80" cy="100" rx="60" ry="6" fill="#b3ac9455"/><path d="M80 30 Q56 20 22 26 V94 Q56 88 80 98Z" fill="#fffaf0" stroke="#c9b48e" stroke-width="2"/><path d="M80 30 Q104 20 138 26 V94 Q104 88 80 98Z" fill="#f7efdf" stroke="#c9b48e" stroke-width="2"/><path d="M34 44 h34 M34 56 h30 M34 68 h34 M34 80 h24" stroke="#d2b98d" stroke-width="3" stroke-linecap="round"/><circle cx="109" cy="56" r="16" fill="#d3e1dd"/><ellipse cx="109" cy="56" rx="11" ry="7" fill="#d9bb85"/><path d="M94 82 h30" stroke="#d2b98d" stroke-width="3" stroke-linecap="round"/>';}else if(a==='volley'){s='<ellipse cx="80" cy="100" rx="40" ry="6" fill="#b3ac9455"/><circle cx="80" cy="56" r="36" fill="#fdfaf0" stroke="#7b91a9" stroke-width="2.5"/><path d="M80 20 Q62 48 76 92 M46 44 Q80 52 114 38 M50 80 Q86 68 112 80" stroke="#7b91a9" stroke-width="3" fill="none"/>';}return head+bg+s+'</svg>'}
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
function chooseStory3(v){state.choice3=v;state.ending=decide(state.choice1,state.choice2,v);if(!endings.includes(state.ending)){endings.push(state.ending);try{localStorage.setItem('hanbando-endings-v2',JSON.stringify(endings))}catch{}}updateMission();playEndingIntro()}
const endingInfo={apart:{n:'제도는 하나, 마음은 둘',label:'숨은 엔딩 · 닿지 않은 마음',text:'위기가 완화된 이후 평화적인 통일이 이루어졌어요. 하지만 여행 내내 서로의 말과 음식, 명절을 이해하려는 대화가 부족했던 탓에, 한 나라가 된 뒤에도 사람들 사이의 거리는 쉽게 좁혀지지 않았어요. 제도는 하나가 되었지만, 마음은 아직 둘로 남아 있습니다.',msg:'…응, 잘 지내. (지우에게서 짧은 답장만 돌아왔어요)'},unity:{n:'하나의 한반도',label:'평화통일',text:'위기가 완화된 이후, 오랜 협의와 주민들의 동의를 거쳐 평화적인 통일이 이루어졌어요. 문화마을의 음식과 놀이, 여행이 일상으로 이어지는 미래입니다.',msg:'우리 다음 설날에는 같이 윷놀이하자! 이번엔 내가 놀러 갈게.'},coexist:{n:'서로의 이웃으로',label:'평화적 두 국가 공존',text:'위기가 완화된 이후, 남과 북은 서로 다른 국가 체제를 유지하며 평화협정과 교류를 이어가는 길을 선택했어요. 사람들은 합의된 교류를 통해 계속 서로를 만나요.',msg:'다음 교류 축제에서 만나자! 내가 맛있는 냉면집을 알려줄게.'},war:{n:'멈춰버린 시간',label:'전쟁',text:'이 가상 이야기에서 양측은 군사 활동을 계속했고, 서로 선조치를 요구해 중재 협상까지 무산됐습니다. 이후 우발적인 충돌이 확대되어 전쟁으로 이어졌어요. 음식점과 문화 행사는 문을 닫고 주민들의 일상과 만남이 어려워졌어요.',msg:'잘 지내고 있어? 다시 만날 수 있으면 좋겠다. — 메시지 전달 실패'}};
function endArt(e){let war=e==='war',co=e==='coexist',ap=e==='apart';return `<svg viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice"><rect width="600" height="150" fill="${war?'#b7bfbe':ap?'#cbd8d6':'#bde0df'}"/><circle cx="480" cy="34" r="24" fill="${war?'#d1d0c6':'#ffe0a0'}"/><path d="M0 100 L75 34 140 78 210 24 290 90 380 32 450 85 540 29 600 65 V150 H0Z" fill="${war?'#929e99':'#8eb398'}"/><path d="M0 102 Q160 72 300 110 T600 95 V150 H0Z" fill="${war?'#a7aaa0':'#a6c88d'}"/>${[55,140,225,375,460,545].map((x,i)=>`<g><rect x="${x-22}" y="86" width="44" height="36" rx="2" fill="${war?'#c9c5b8':'#f2dfbd'}"/><path d="M${x-28} 87 L${x} 65 ${x+28} 87Z" fill="${war?'#7e8b89':['#cd856a','#7199a8','#d0a260'][i%3]}"/><rect x="${x-5}" y="102" width="10" height="20" fill="#957e66"/></g>`).join('')}${ap?'<path d="M45 138 Q170 126 268 132" stroke="#efd9ac" stroke-width="13" fill="none"/><path d="M332 132 Q430 126 555 138" stroke="#efd9ac" stroke-width="13" fill="none"/><circle cx="130" cy="117" r="10" fill="#e6aa53"/><circle cx="470" cy="117" r="10" fill="#5d93a6"/>':co?'<path d="M280 100 Q310 115 292 150 H329 Q345 123 314 100Z" fill="#7eb8c3"/><rect x="265" y="121" width="75" height="8" rx="3" fill="#bc9d72"/>':war?'<path d="M270 137 h22 m17 0 h21" stroke="#c6bba6" stroke-width="10"/><path d="M292 116 L308 150 M308 116 L292 150" stroke="#78827e" stroke-width="4"/>':'<path d="M45 138 Q300 119 555 138" stroke="#efd9ac" stroke-width="13" fill="none"/><circle cx="300" cy="116" r="18" fill="#e8c58c"/>'}</svg>`}
function showEnding(){let e=state.ending,info=endingInfo[e],msg=info.msg;if(e==='coexist'&&state.friend<50)msg='응, 다음에 또 보자. (지우의 답장이 예전보다 짧아졌어요)';show(info.n,'ENDING · '+info.label,`<div class="endart">${endArt(e)}</div><div class="ending ${e}"><b>${info.label}</b><p>${info.text}</p><div class="storytrace"><div>미래 의견 · ${state.choice2==='unity'?'하나의 국가':'두 국가의 평화적 공존'}</div><div>첫 위기 · ${state.choice1==='pause'?'상호 군사 활동 일시 중단':'경계 유지 및 조사'}</div><div>마지막 협상 · ${state.choice3==='mediate'?'중재 협상 참여':'상대 선조치 요구 및 협상 보류'}</div><div>지우와의 우정 · ${state.friend} (${friendTier()})</div>${e==='apart'?'<div>통일은 제도만으로 완성되지 않아요. 지우의 말과 음식, 명절을 이해하는 대답을 고르면 다른 결말을 볼 수 있어요.</div>':''}${e!=='war'?`<div>${state.choice3==='hold'?'앞서 이루어진 잠정 중단 덕분에 충돌을 피하고 이후 다시 협상을 열었습니다.':'중재 과정에서 상호 조치를 확인하며 위기를 완화했습니다.'}</div>`:''}</div><div class="speech">${av(e==='war'?'off':'friend')}<p>${msg}</p></div>${state.gift!==null?`<div class="small">오늘 고른 선물: ${gifts[state.gift].n} · ${e==='war'?'다시 만날 날을 기다립니다.':'친구와 함께한 추억으로 남았어요.'}</div>`:''}</div><p class="small">이 결과는 현실을 예측하는 것이 아니라, 선택에 따라 전개되는 가상의 이야기입니다. 문화 퀴즈 정답 개수는 엔딩과 무관하지만, 지우와의 우정은 결말에 영향을 줘요.</p><div class="dialogfoot">${button('이번 여행 정리','showSummary()','secondary')}${button('도감 확인','showAlbum()','secondary')}${button('마을 돌아보기','closeModal()','secondary')}${button('다시 여행하기','restart()')}</div>`,'ending')}
function showAlbum(){let a=[...state.album.values()];let html=['북한말','음식','명절·놀이','관광','평화','교류'].map(cat=>{let list=a.filter(o=>o.category===cat);return `<h3 style="font-size:15px;margin:18px 0 6px">${cat} · ${list.length}개</h3><div class="stampgrid">${list.length?list.map(o=>`<div class="stamp">${cat==='음식'&&foods.find(f=>f.n===o.n)?`<img src="${foods.find(f=>f.n===o.n).photo}" alt="${o.n}">`:picture({art:o.e,n:o.n})}<b>${o.n}</b>${o.d}</div>`).join(''):'<span class="small">아직 수집한 항목이 없어요.</span>'}</div>`}).join('');show('나의 여행 도감','COLLECTION · '+a.length+'개 수집',`<p>점수가 아닌 여행의 기록이에요. 도감 수집률은 엔딩에 영향을 주지 않아요.</p>${html}<h3>엔딩 컬렉션 · ${endings.length} / 4</h3><div class="stampgrid" style="grid-template-columns:repeat(2,1fr)">${['unity','coexist','apart','war'].map(e=>`<div class="stamp ${endings.includes(e)?'':'locked'}"><span class="lockbadge">${endings.includes(e)?'발견':'미발견'}</span><b>${endings.includes(e)?endingInfo[e].n:(e==='apart'?'숨은 엔딩':'???')}</b>${endings.includes(e)?endingInfo[e].label:'아직 보지 못한 결말'}</div>`).join('')}</div>${foot('닫기','closeModal()')}`,'album')}
function showHelp(){show('여행을 시작해요!','HOW TO PLAY',`<p><b>방향키 / WASD</b>로 캐릭터를 직접 움직여요. 길과 장소 안에서만 다닐 수 있어요. <b>다음 장소로 이동</b> 버튼을 누르면 자동으로 걸어가요. <b>함께 달리기</b>에서는 스페이스바, 위쪽 방향키 또는 화면 터치로 점프해요. 생명은 3개이고, 퀴즈 문은 정답이 위에 있으면 점프, 아래에 있으면 그대로 달려서 통과해요.</p><p>지우를 만난 뒤에는 지우가 함께 걸으며 북한말을 섞어 말해요. <b>말풍선을 누르거나 E 키</b>를 누르면 뜻을 볼 수 있고, 도감에도 기록돼요.</p><p>큰길에서 갈라지는 흙길을 따라 <b>DMZ 평화공원, 금강산 탐방로, 경의선 철길</b> 같은 장소에 걸어가면 평화와 교류에 관한 실제 이야기가 나타나고 도감의 평화 항목에 모여요. 모두 8곳이에요.</p><p>초록색으로 표시된 장소에 가까이 가면 이벤트가 열려요. 문화 체험은 맞힐 때까지 다시 시도할 수 있고, 건너뛰거나 정답을 확인할 수도 있어요.</p><p>미래의 방향에 대한 의견 한 번과 국가 간 위기 대응 두 번이 엔딩을 바꿔요. 여기에 <b>지우와의 우정</b>이 더해져요. 지우에게 건네는 대답과 함께 달리기 결과에 따라 우정이 오르내리고, 우정이 낮으면 숨은 엔딩이 나올 수도 있어요. 음식 취향과 퀴즈 정답 개수는 결말과 무관해요.</p><div class="notice">이 마을은 실제 북한의 모습을 재현한 것이 아닌 가상의 문화교류 공간이에요. 등장인물과 미래 사건은 허구입니다. 음식 사진은 제공받은 사진을 사용했으며 음식 사진의 원 출처와 실제 재료는 별도로 검증하지 않았어요. 나머지 풍경은 설명용 일러스트입니다.</div><details class="sources"><summary>문화 콘텐츠 참고 자료</summary><ul><li><a href="https://encykorea.aks.ac.kr/Article/E0059956" target="_blank" rel="noopener">한국민족문화대백과사전 · 평양냉면</a></li><li><a href="https://encykorea.aks.ac.kr/Article/E0079945" target="_blank" rel="noopener">한국민족문화대백과사전 · 대동강숭엇국</a></li><li><a href="https://www.korean-culture.org/koreanet/view.do?RN=99&seq=11452" target="_blank" rel="noopener">한국문화원 · 평양 음식</a></li><li><a href="https://www.korea.kr/news/policyNewsView.do?newsId=148853961" target="_blank" rel="noopener">대한민국 정책브리핑 · 흥미로운 북한말 뜻풀이</a></li><li><a href="https://pedia.watcha.com/ko/contents/b9nOYdr" target="_blank" rel="noopener">우리말 통일사전 목차 · 남새, 닭알 등</a></li><li><a href="https://world.kbs.co.kr/service/contents_view.htm?board_seq=376431&id=&lang=k&menu_cate=northkorea" target="_blank" rel="noopener">KBS WORLD · 북한의 길거리 음식</a></li><li><a href="https://www.yna.co.kr/view/AKR20250123031300504" target="_blank" rel="noopener">연합뉴스 · 북한의 설 명절 문화 (2025)</a></li><li><a href="https://www.yna.co.kr/amp/view/AKR20220125126300504" target="_blank" rel="noopener">연합뉴스 · 북한 설 풍경 (2022)</a></li><li><a href="https://nkinfo.unikorea.go.kr/nkp/pge/view.do?menuId=MENU_48" target="_blank" rel="noopener">통일부 북한정보포털 · 관광업</a></li><li><a href="https://encykorea.aks.ac.kr/Article/E0001660" target="_blank" rel="noopener">한국민족문화대백과사전 · 개성특별시</a></li><li>국립국어원 · 『남에서는 이런 말, 북에서는 저런 뜻』 (원주필, 강냉이튀기 등)</li></ul><p class="small">어휘의 사용 빈도나 생활 방식은 지역과 시기에 따라 다를 수 있습니다.</p></details>${foot('여행 계속하기','closeModal()')}`,'help')}
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

// ===== 함께 달리기 (3구간 러닝 · 공중 발판 · 생명 3개 · 퀴즈 문) =====
const runItems=[
  {n:'손전화',m:'휴대전화',d:'휴대전화',c:'북한말',art:'phone'},
  {n:'강냉이튀기',m:'팝콘',d:'팝콘. 강냉이(옥수수)를 튀겼다는 뜻이에요.',c:'북한말'},
  {n:'살까기',m:'다이어트',d:'다이어트. 살을 깎아 낸다는 뜻이에요.',c:'북한말'},
  {n:'과일단물',m:'과일 주스',d:'과일로 만든 단 음료, 과일 주스를 뜻해요.',c:'북한말'},
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
  pre:{labels:['편견'],hw:24,hh:34,me:['거기는 다 못 살지 않아?','북한 사람은 다 무서울 것 같았어.','우리랑은 완전히 다르겠지?'],ji:['…그렇게만 생각했구나.','나도 그냥 평범한 고등학생이야.','궁금하면 직접 물어봐 줘.'],note:'편견 먹구름: 직접 묻지 않고 단정하면 마음의 거리가 멀어져요.'},
  slang:{labels:['갑분싸','얼죽아','킹받네','TMI','스불재','별다줄'],hw:15,hh:32,me:['오늘 완전 킹받네!','나 얼죽아라서… TMI인가?','갑분싸 되면 스불재잖아!'],ji:['…방금 무슨 말이야?','외국어처럼 들려.','조금 풀어서 말해 줄래?'],note:'줄임말 폭탄: 줄임말과 신조어는 처음 듣는 사람에게 벽이 될 수 있어요.'},
  wall:{labels:['고정관념'],hw:15,hh:96,me:['거기 사람들은 다 똑같잖아.','다 그렇게 생각하겠지, 뭐.'],ji:['사람마다 생각은 다 달라.','한 사람씩 만나 보면 알 거야.'],note:'고정관념 벽: "다 그렇다"는 생각은 한 사람 한 사람을 보지 못하게 해요. 2단 점프로 넘어가세요!'}};
// 퀴즈 문: 정답과 그럴듯한 오답
const runQuiz=[
  {q:'손전화',a:'휴대전화',w:'전화번호부'},{q:'강냉이튀기',a:'팝콘',w:'옥수수 국수'},
  {q:'살까기',a:'다이어트',w:'과일 껍질 깎기'},{q:'과일단물',a:'과일 주스',w:'과일 사탕'},
  {q:'원주필',a:'볼펜',w:'둥근 붓'},{q:'남새',a:'채소',w:'새의 이름'},
  {q:'닭알',a:'달걀',w:'닭고기'},{q:'손풍금',a:'아코디언',w:'손부채'},
  {q:'일없다',a:'괜찮다',w:'할 일이 없다'},{q:'강냉이',a:'옥수수',w:'감자'}];
const rpick=a=>a[Math.floor(Math.random()*a.length)];
const RW=640,RH=260,RG=214,RPX=170,RTIME=50,LIVES=3,CEIL=RG-150;
const PHASES=['',
  {name:'1구간 · 몸풀기',speed:280,gap:1.15},
  {name:'2구간 · 속도 UP! 점프맵과 퀴즈 문 등장',speed:330,gap:.95},
  {name:'3구간 · 마지막! 고정관념 벽은 2단 점프로',speed:380,gap:.85}];
let run=null,runRAF=0,runResult=null;
function stopRun(){cancelAnimationFrame(runRAF);runRAF=0;run=null}
function runStage(){
  stopRun();runResult=null;
  show('지우와 함께 달리기','CULTURE 03 · 함께 달리기',`<p>마을 둘레길을 <b>${RTIME}초</b> 동안 지우와 함께 달려요. 구간이 바뀔수록 빨라지고 어려워져요. <b>스페이스바, 위쪽 방향키 또는 화면 터치</b>로 점프, 공중에서 한 번 더 누르면 2단 점프! 생명은 3개예요.</p><div class="runwrap"><canvas id="runCanvas" aria-label="달리기 미니게임 화면"></canvas><div class="runhud"><span id="runTime">남은 시간 ${RTIME}초</span><span id="runScore">카드 0장 · 퀴즈 0</span></div></div><div class="runkeys"><span><b>문화 카드</b> 모으기</span><span><b>퀴즈 문</b> 정답이 위면 점프, 아래면 그대로</span><span><b>편견·줄임말·고정관념</b> 피하기</span></div><div class="notice" id="runNote">부딪히면 생명이 줄고 지우가 서운해해요. 준비되면 시작을 누르세요.</div><div class="dialogfoot" id="runFoot">${button('건너뛰기',"runEnd('skip')",'secondary')}${button('달리기 시작','runStart()')}</div>`,'run');
  runSetup();runDraw();
}
function runSetup(){
  let c=$('#runCanvas'),d=Math.min(devicePixelRatio||1,2);
  c.width=RW*d;c.height=RH*d;c.getContext('2d').setTransform(d,0,0,d,0,0);
  c.onpointerdown=e=>{e.preventDefault();if(run&&run.on)runJump();else runStart()};
  run={on:false,t:0,last:0,y:RG,vy:0,jumps:0,jx:RPX-90,jy:RG,jvy:0,scroll:0,items:[],obs:[],plats:[],gates:[],fx:[],
    got:new Map(),hits:0,lives:LIVES,inv:0,next:1.2,me:null,ji:null,sad:0,phase:1,banner:{t:PHASES[1].name,life:2},
    quizDone:[],quizRight:0,quizCount:0,lastQuiz:-99,failed:false};
}
function runStart(){
  if(!run||run.on)return;
  run.on=true;run.last=0;
  $('#runFoot').innerHTML=button('그만 달리기',"runEnd('quit')",'secondary');
  $('#runNote').textContent='점프! 문화 카드를 모아 보세요.';
  if(document.activeElement)document.activeElement.blur();
  runRAF=requestAnimationFrame(runLoop);
}
function runJump(){if(!run||!run.on)return;if(run.jumps<2){run.vy=run.jumps?-500:-600;run.jumps++}}
function runLoop(t){
  if(!run||!run.on||!$('#runCanvas')){runRAF=0;return}
  let dt=Math.min(.05,(t-(run.last||t))/1000);run.last=t;
  runUpdate(dt);runDraw();
  if(run.failed){runEnd('fail');return}
  if(run.t>=RTIME){runEnd('clear');return}
  runRAF=requestAnimationFrame(runLoop);
}
function runPickItem(){let fresh=runItems.filter(it=>!run.got.has(it.n));return fresh.length&&Math.random()<.7?rpick(fresh):rpick(runItems)}
function runCoin(x,h){run.items.push({it:runPickItem(),x,y:RG-h,ph:Math.random()*6})}
function runAddObs(x,type){run.obs.push({type,x,label:rpick(runObs[type].labels)})}
function runSpawn(){
  let r=run,ph=r.phase,X=RW+40,dur=1;
  let opts=['coin','obs','obs'];
  if(ph>=2)opts.push('double','plat','plat');
  if(ph===3)opts.push('wall','wall','plat');
  if(ph>=2&&r.quizCount<3&&r.t-r.lastQuiz>9&&r.t<RTIME-6)opts=['quiz'];
  let p=rpick(opts);
  if(p==='coin'){runCoin(X,rpick([26,80,80,130]));dur=.7}
  else if(p==='obs'){runAddObs(X,rpick(['pre','slang']));if(Math.random()<.5)runCoin(X,85);dur=1.1}
  else if(p==='double'){runAddObs(X,rpick(['pre','slang']));runAddObs(X+240,rpick(['pre','slang']));runCoin(X+120,30);dur=1.6}
  else if(p==='wall'){runAddObs(X,'wall');runCoin(X,140);dur=1.3}
  else if(p==='plat'){
    let hs=ph===3?[50,85,120]:[50,85];
    hs.forEach((h,k)=>{let x=X+k*170;r.plats.push({x,w:150,h});runCoin(x+75,h+30)});
    if(ph===3)runAddObs(X+190,'pre');
    dur=.6+hs.length*.5;
  }else{
    let pool=runQuiz.filter(q=>!r.quizDone.some(d=>d.q===q.q)),q=rpick(pool.length?pool:runQuiz);
    r.quizCount++;r.lastQuiz=r.t;
    r.gates.push({x:X+520,q,up:Math.random()<.5,done:false});
    r.banner={t:`퀴즈 · '${q.q}'의 뜻은? 정답 문으로 지나가세요`,life:2.6,quiz:true};
    dur=2.4;
  }
  r.next=r.t+dur*PHASES[ph].gap+Math.random()*.35;
}
function runUpdate(dt){
  let r=run;r.t+=dt;
  let ph=r.t<15?1:r.t<32?2:3;
  if(ph!==r.phase){r.phase=ph;r.banner={t:PHASES[ph].name,life:2.2}}
  let sp=PHASES[ph].speed+(r.t%17)*1.5,dx=sp*dt;r.scroll+=dx;
  // 플레이어: 중력, 천장, 발판 착지
  let prevY=r.y;r.vy+=2000*dt;r.y+=r.vy*dt;
  if(r.y<CEIL){r.y=CEIL;if(r.vy<0)r.vy=0}
  if(r.vy>=0)for(let p of r.plats){let top=RG-p.h;if(RPX+8>p.x&&RPX-8<p.x+p.w&&prevY<=top+1&&r.y>=top){r.y=top;r.vy=0;r.jumps=0;break}}
  if(r.y>=RG){r.y=RG;r.vy=0;r.jumps=0}
  // 지우: 우정이 높을수록 가까이에서 함께 달려요
  r.jx=RPX-(46+(1-state.friend/100)*80);
  r.jvy+=2000*dt;r.jy+=r.jvy*dt;
  if(r.jy>=RG){r.jy=RG;r.jvy=0;let o=r.obs.find(o=>o.x>r.jx-10&&o.x-r.jx<62);if(o)r.jvy=o.type==='wall'?-760:-600}
  if(r.t>=r.next&&r.t<RTIME-1.5)runSpawn();
  r.items.forEach(o=>o.x-=dx);r.obs.forEach(o=>o.x-=dx);r.plats.forEach(o=>o.x-=dx);r.gates.forEach(o=>o.x-=dx);
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
  // 퀴즈 문 통과 판정: 위 문은 공중, 아래 문은 땅
  for(let gt of r.gates){
    if(gt.done||gt.x>RPX)continue;
    gt.done=true;
    let ok=(RG-r.y>55)===gt.up;
    r.quizDone.push({q:gt.q.q,a:gt.q.a,ok});
    if(ok)r.quizRight++;
    r.fx.push({x:RPX+30,y:r.y-40,text:(ok?'정답! ':'아쉬워요! ')+gt.q.q+' = '+gt.q.a,life:2,color:ok?'#2f7a5a':'#b0503a'});
    $('#runNote').textContent=(ok?'정답이에요! ':'정답은 이거예요. ')+`'${gt.q.q}'는 '${gt.q.a}'라는 뜻이에요.`;
  }
  r.obs=r.obs.filter(o=>o.x>-70);r.plats=r.plats.filter(p=>p.x+p.w>-20);r.gates=r.gates.filter(g=>g.x>-120);
  if(r.inv>0)r.inv-=dt;
  else for(let o of r.obs){
    let k=runObs[o.type];
    if(o.hit||Math.abs(o.x-RPX)>=k.hw+9||r.y<=RG-k.hh)continue;
    o.hit=true;r.hits++;r.lives--;r.inv=1.2;r.sad=1.6;
    r.me={t:rpick(k.me),life:1.7};r.ji={t:rpick(k.ji),life:1.7};
    $('#runNote').textContent=k.note;
    if(r.lives<=0)r.failed=true;
    break;
  }
  if(r.sad>0)r.sad-=dt;
  if(r.banner&&(r.banner.life-=dt)<=0)r.banner=null;
  for(let b of ['me','ji'])if(r[b]){r[b].life-=dt;if(r[b].life<=0)r[b]=null}
  r.fx=r.fx.filter(f=>(f.life-=dt)>0);r.fx.forEach(f=>f.y-=26*dt);
  $('#runTime').textContent=`${r.phase}구간 · 남은 시간 ${Math.max(0,Math.ceil(RTIME-r.t))}초`;
  $('#runScore').textContent=`카드 ${r.got.size}장 · 퀴즈 ${r.quizRight}`;
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
  let x=o.x;
  if(o.type==='pre'){
    let b=RG;g.fillStyle=o.hit?'#a3aaae':'#6f7a83';
    g.beginPath();g.arc(x-14,b-14,14,0,7);g.arc(x+2,b-24,17,0,7);g.arc(x+17,b-13,13,0,7);g.fill();g.fillRect(x-20,b-14,38,14);
    g.fillStyle='#fff';g.font='bold 12px system-ui, sans-serif';g.fillText(o.label,x+1,b-16);
  }else if(o.type==='slang'){
    let cy=RG-17;
    g.strokeStyle='#5b4a3a';g.lineWidth=2.5;g.beginPath();g.moveTo(x+8,cy-14);g.quadraticCurveTo(x+16,cy-26,x+24,cy-22);g.stroke();
    g.fillStyle=Math.floor(t*10)%2?'#f2c25a':'#e0785d';g.beginPath();g.arc(x+25,cy-23,4,0,7);g.fill();
    g.fillStyle=o.hit?'#a99c95':'#c2563f';g.beginPath();g.arc(x,cy,17,0,7);g.fill();
    g.fillStyle='#fff';g.font='bold 10px system-ui, sans-serif';g.fillText(o.label,x,cy+1);
  }else{
    let h=96,w=34;
    for(let k=0;k<5;k++){g.fillStyle=o.hit?'#b4ada6':k%2?'#7d6f66':'#8d7f74';g.fillRect(x-w/2,RG-(k+1)*19.2,w,18.2)}
    g.fillStyle='#5f544c';g.fillRect(x-w/2-3,RG-h-6,w+6,8);
    g.save();g.translate(x,RG-h/2);g.rotate(-Math.PI/2);g.fillStyle='#fff';g.font='bold 12px system-ui, sans-serif';g.fillText(o.label,0,1);g.restore();
  }
  g.restore();
}
function runPlatform(g,p){
  let y=RG-p.h;
  g.strokeStyle='#b99c72';g.lineWidth=3;
  [p.x+14,p.x+p.w-14].forEach(x=>{g.beginPath();g.moveTo(x,y+10);g.lineTo(x,RG);g.stroke()});
  g.fillStyle='#c9a06a';g.beginPath();g.roundRect(p.x,y,p.w,12,4);g.fill();
  g.fillStyle='#e8c48a';g.fillRect(p.x+3,y+1,p.w-6,4);
}
function runGate(g,gt){
  let x=gt.x,q=gt.q,upText=gt.up?q.a:q.w,downText=gt.up?q.w:q.a,col=gt.done?'#b9b3a8':'#4c87b0';
  g.save();g.textAlign='center';g.textBaseline='middle';
  // 아래 문 (땅)
  g.strokeStyle=col;g.lineWidth=5;g.beginPath();g.moveTo(x-34,RG);g.lineTo(x-34,RG-56);g.lineTo(x+34,RG-56);g.lineTo(x+34,RG);g.stroke();
  g.font='bold 12px system-ui, sans-serif';let w=Math.max(70,g.measureText(downText).width+20);
  g.fillStyle='#fffdf5';g.beginPath();g.roundRect(x-w/2,RG-72,w,24,8);g.fill();g.strokeStyle=col;g.lineWidth=2;g.stroke();
  g.fillStyle='#24384a';g.fillText(downText,x,RG-60);
  // 위 문 (공중)
  let uy=RG-112;w=Math.max(78,g.measureText(upText).width+24);
  g.setLineDash([5,4]);g.strokeStyle=col;g.lineWidth=2.5;g.beginPath();g.roundRect(x-w/2-6,uy-24,w+12,58,12);g.stroke();g.setLineDash([]);
  g.fillStyle='#fffdf5';g.beginPath();g.roundRect(x-w/2,uy-12,w,24,8);g.fill();g.strokeStyle=col;g.lineWidth=2;g.stroke();
  g.fillStyle='#24384a';g.fillText(upText,x,uy);
  g.font='bold 10px system-ui, sans-serif';g.fillStyle=col;g.fillText('위 문 · 점프',x,uy-18);g.fillText('아래 문',x,RG-80);
  g.restore();
}
function runHeart(g,x,y,full){
  g.save();g.translate(x,y);g.fillStyle=full?'#d9584a':'#d8cfc4';
  g.beginPath();g.moveTo(0,7);g.bezierCurveTo(-13,-1,-7,-12,0,-5);g.bezierCurveTo(7,-12,13,-1,0,7);g.fill();g.restore();
}
function runPerson(g,x,y,me,t,air,sad,blink){
  if(blink)return;
  g.save();g.translate(x,y);
  g.fillStyle='rgba(0,0,0,.13)';g.beginPath();g.ellipse(0,RG-y+2,14,4,0,0,7);g.fill();
  let sw=air?.55:Math.sin(t*14)*.7,leg=me?'#4f5663':'#3d4650',body=me?'#2b3d63':'#5d93a6',dark=me?'#22324f':'#477a8c';
  g.lineCap='round';g.strokeStyle=leg;g.lineWidth=6;
  [sw,-sw].forEach(a=>{g.beginPath();g.moveTo(0,-22);g.lineTo(Math.sin(a)*14,-22+Math.cos(a)*20);g.stroke()});
  if(me){g.fillStyle='#b8392a';g.beginPath();g.roundRect(-16,-43,9,19,3);g.fill()}
  g.fillStyle=body;g.beginPath();g.roundRect(-10,-44,20,25,7);g.fill();if(me){g.fillStyle='#f2efe6';g.beginPath();g.moveTo(-4,-44);g.lineTo(4,-44);g.lineTo(0,-36);g.fill();g.fillStyle='#b8392a';g.fillRect(-1.3,-42,2.6,13)}
  g.strokeStyle=dark;g.lineWidth=5;
  [-sw,sw].forEach(a=>{g.beginPath();g.moveTo(0,-39);g.lineTo(Math.sin(a)*13,-39+Math.cos(a)*15);g.stroke()});
  g.fillStyle=me?'#edbc94':'#f3cfaf';g.beginPath();g.arc(0,-53,10,0,7);g.fill();
  if(me){g.fillStyle='#1d1a1c';g.beginPath();g.arc(0,-55,10.5,Math.PI*1.02,Math.PI*1.98);g.fill();g.fillRect(-10,-57,6,5)}
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
  // 구간이 바뀔수록 하늘이 노을빛으로
  let skies=[0,['#b7dce2','#eef0d8'],['#a9d3e8','#f3ecd2'],['#efb796','#f6dfbe']][r.phase];
  let sky=g.createLinearGradient(0,0,0,RG);sky.addColorStop(0,skies[0]);sky.addColorStop(1,skies[1]);g.fillStyle=sky;g.fillRect(0,0,RW,RH);
  g.fillStyle=r.phase===3?'#ffd59a':'#ffe7a6';g.beginPath();g.arc(560,r.phase===3?70:52,22,0,7);g.fill();
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
  r.plats.forEach(p=>runPlatform(g,p));
  r.gates.forEach(gt=>runGate(g,gt));
  r.items.forEach(o=>{o.w=runPill(g,o.x,o.y+Math.sin(r.t*4+o.ph)*3,o.it.n,runColor[o.it.c])});
  r.obs.forEach(o=>runObstacle(g,o,r.t));
  runPerson(g,r.jx,r.jy,false,r.on?r.t:0,r.jy<RG-1,r.sad>0,false);
  runPerson(g,RPX,r.y,true,r.on?r.t:0,r.vy!==0,false,r.inv>0&&Math.floor(r.t*12)%2===0);
  if(r.me)runBubble(g,RPX+10,r.y-70,r.me.t,false);
  if(r.ji)runBubble(g,r.jx-6,r.jy-98,r.ji.t,true);
  r.fx.forEach(f=>{g.globalAlpha=Math.min(1,f.life*1.5);g.font='bold 13px system-ui, sans-serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle='#fffdf5';g.strokeText(f.text,f.x,f.y-20);g.fillStyle=f.color;g.fillText(f.text,f.x,f.y-20);g.globalAlpha=1});
  for(let i=0;i<LIVES;i++)runHeart(g,RW/2-22+i*22,22,i<r.lives);
  if(r.banner&&r.on){
    g.font='bold 14px system-ui, sans-serif';let w=g.measureText(r.banner.t).width+30;
    g.globalAlpha=Math.min(1,r.banner.life*2);g.fillStyle=r.banner.quiz?'#4c87b0':'#36745d';
    g.beginPath();g.roundRect(RW/2-w/2,36,w,26,13);g.fill();
    g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(r.banner.t,RW/2,49);g.textBaseline='alphabetic';g.globalAlpha=1;
  }
  if(!r.on){
    g.fillStyle='rgba(32,58,54,.38)';g.fillRect(0,0,RW,RH);
    g.fillStyle='#fffdf5';g.textAlign='center';g.font='bold 18px system-ui, sans-serif';g.fillText('화면을 누르거나 스페이스바로 시작',RW/2,RH/2-4);
    g.font='13px system-ui, sans-serif';g.fillText('공중에서 한 번 더 누르면 2단 점프',RW/2,RH/2+20);
  }
}
function runEnd(reason){
  if(!run)return;
  cancelAnimationFrame(runRAF);runRAF=0;
  let r=run;run=null;
  if(reason==='skip'&&!r.on){runResult=null;talk('food','finish');return}
  let gain=Math.min(8,r.got.size)+2*r.quizRight-3*Math.min(3,r.hits);
  runResult={got:r.got,quiz:r.quizDone,gain};
  let list=[...r.got.values()];
  let title=reason==='fail'?'생명을 모두 잃었어요':reason==='quit'?'달리기를 멈췄어요':'완주했어요!';
  let msg=reason==='fail'?'편견과 고정관념에 세 번 부딪혔어요. 다시 도전하거나 이대로 마칠 수 있어요.':r.hits?'부딪힐 때마다 지우가 조금씩 서운해했어요.':'한 번도 부딪히지 않았어요! 지우가 정말 즐거워해요.';
  show(title,'CULTURE 03 · 함께 달리기',
    `<div class="notice"><b>문화 카드 ${r.got.size}장 · 퀴즈 ${r.quizRight} / ${r.quizDone.length} · 부딪힘 ${r.hits}회</b><br>${msg}</div>`+
    (r.quizDone.length?`<h3>퀴즈 문 복습</h3><div class="cardlist">${r.quizDone.map(q=>`<div class="chip ${q.ok?'ok':'no'}"><b>${q.q}</b>${q.a} · ${q.ok?'정답':'오답'}</div>`).join('')}</div>`:'')+
    (list.length?`<h3>모은 문화 카드</h3><div class="cardlist">${list.map(it=>`<div class="chip" style="border-left:4px solid ${runColor[it.c]}"><b>${it.n}</b>${it.m}</div>`).join('')}</div>`:'<p class="small">모은 카드가 없어요.</p>')+
    `<p class="small">마치면 지우와의 우정이 ${gain>=0?'+':''}${gain} 바뀌고, 카드와 퀴즈 단어는 도감에 저장돼요. 다시 도전하면 이번 기록은 사라져요.</p><div class="dialogfoot">${button('다시 도전','runStage()','secondary')}${button(reason==='fail'?'이대로 마치기 →':'지우와 이야기하기 →','runFinish()')}</div>`);
}
function runFinish(){
  let res=runResult;runResult=null;
  if(res){
    res.got.forEach(it=>collect(it.n,it.d,it.art||'',it.c));
    res.quiz.forEach(q=>collect(q.q,q.a,'','북한말'));
    state.met=true;addFriend(res.gain);
  }
  talk('food','finish');
}

// ===== 마을에서 함께 걷는 지우와 북한말 말풍선 =====
const jiwooLines=[
  {t:'날씨 좋다! 우리 과일단물 하나씩 사 마실까?',w:'과일단물',m:'과일 주스'},
  {t:'시장에서 본 남새가 정말 싱싱하더라.',w:'남새',m:'채소'},
  {t:'원주필 하나만 빌려줄래? 적어 둘 게 있어.',w:'원주필',m:'볼펜'},
  {t:'아침에 닭알 부침을 먹었어. 너는?',w:'닭알',m:'달걀'},
  {t:'요즘 살까기 중이라 많이 걷고 있어!',w:'살까기',m:'다이어트'},
  {t:'사진 찍어서 손전화로 보내 줄게.',w:'손전화',m:'휴대전화'},
  {t:'영화 볼 때 강냉이튀기 같이 먹자.',w:'강냉이튀기',m:'팝콘'},
  {t:'기분 좋은데, 손풍금이라도 치고 싶다.',w:'손풍금',m:'아코디언'},
  {t:'천천히 가도 일없어. 같이 가자.',w:'일없어',m:'괜찮아'},
  {t:'우리 동네에선 강냉이를 쪄서 많이 먹어.',w:'강냉이',m:'옥수수'}];
let jx=-10.5,jz=8,jPhase=0,bub=null,bubIdx=0,bubNext=0,bubRect=null;
function updateJiwoo(dt,t){
  if(!state.met)return;
  let dx=px-jx,dz=pz-jz,d=Math.hypot(dx,dz);
  if(d>6){jx=px-1;jz=pz;d=1}
  if(d>1.15){let k=(d-1.15)/d*Math.min(1,dt*5);jx+=dx*k;jz+=dz*k;jPhase+=dt*12}else jPhase=0;
  if(state.i>=9){bub=null;return}
  if(modal||state.ending)return;
  if(!bub&&t>bubNext){bub={...jiwooLines[bubIdx%jiwooLines.length],shown:false,until:t+9000};bubIdx++}
  if(bub&&t>bub.until){bub=null;bubNext=t+5000}
}
function jiwooModel(l,x,z,phase){
  let b=Math.abs(Math.sin(phase))*.10,stride=Math.sin(phase)*.12;
  flat(l,x,z,.8,.6,'#78966d',.046);
  box(l,x-.15,.04,z+stride,.22,.42,.23,'#3d4650');box(l,x+.15,.04,z-stride,.22,.42,.23,'#3d4650');
  box(l,x,.4+b,z,.62,.66,.42,'#5d93a6');box(l,x-.39,.4+b,z,.17,.54,.2,'#548aa0');box(l,x+.39,.4+b,z,.17,.54,.2,'#548aa0');
  cyl(l,x,1.02+b,z,.33,.31,.41,'#f3cfaf',10);cyl(l,x,1.3+b,z,.36,.28,.2,'#2d2a2b',10);box(l,x+.05,1.1+b,z+.3,.2,.34,.14,'#2d2a2b');
}
function drawJiwooBubble(t){
  bubRect=null;
  if(!bub||!state.met||modal||state.ending)return;
  let p=project([jx,2.15,jz]),i=bub.t.indexOf(bub.w),pre=bub.t.slice(0,i),post=bub.t.slice(i+bub.w.length);
  let line2=bub.shown?`${bub.w} = ${bub.m}`:'말풍선을 누르거나 E 키로 뜻 보기';
  ctx.save();ctx.font='bold 13px system-ui, sans-serif';
  let wPre=ctx.measureText(pre).width,wW=ctx.measureText(bub.w).width,wPost=ctx.measureText(post).width;
  ctx.font='12px system-ui, sans-serif';let w2=ctx.measureText(line2).width;
  let w=Math.max(wPre+wW+wPost,w2)+28,h=52,x=Math.max(8,Math.min(width-w-8,p[0]-w/2)),y=p[1]-h-12;
  ctx.fillStyle='#fffdf5';ctx.strokeStyle=bub.shown?'#6ba78a':'#d7a64f';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(p[0]-7,y+h-1);ctx.lineTo(p[0],y+h+9);ctx.lineTo(p[0]+7,y+h-1);ctx.fill();
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='bold 13px system-ui, sans-serif';
  let tx=x+14;ctx.fillStyle='#3d5b4d';ctx.fillText(pre,tx,y+17);
  ctx.fillStyle='#b4572f';ctx.fillText(bub.w,tx+wPre,y+17);ctx.fillRect(tx+wPre,y+26,wW,2);
  ctx.fillStyle='#3d5b4d';ctx.fillText(post,tx+wPre+wW,y+17);
  ctx.font=bub.shown?'bold 12px system-ui, sans-serif':'12px system-ui, sans-serif';ctx.fillStyle=bub.shown?'#2f6b4f':'#8a7a5c';ctx.fillText(line2,tx,y+38);
  ctx.restore();
  bubRect={x,y,w,h};
}
function revealBubble(){
  if(!bub||bub.shown)return;
  bub.shown=true;bub.until=performance.now()+5000;
  let fresh=collect(bub.w,bub.m,'','북한말');
  notice(`${bub.w} = ${bub.m}`+(fresh?' · 도감 기록!':''));
}
canvas.addEventListener('pointerdown',e=>{
  if(!bubRect||modal)return;
  let r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(x>=bubRect.x&&x<=bubRect.x+bubRect.w&&y>=bubRect.y&&y<=bubRect.y+bubRect.h)revealBubble();
});

// ===== 시간 흐름에 따른 하늘, 구름, 강물, 연 =====
let skyNow=null;
function skyTarget(){
  if(state.ending)return {unity:['#f6d9b8','#fdf1dc'],coexist:['#bfe3e6','#eef3dc'],apart:['#c7cfd0','#e3e2d8'],war:['#9ba9ab','#c1c3b9']}[state.ending];
  let i=state.i;
  return i<=2?['#b7dce2','#e6ead0']:i<=4?['#a3d6ea','#eef3da']:i<=6?['#f0d2a6','#f6ecd3']:i<=8?['#e7a58c','#f5d7b4']:['#56637c','#a9abab'];
}
function drawSkyLayer(t){
  let tg=skyTarget().map(rgb);
  if(!skyNow)skyNow=tg.map(c=>c.slice());
  skyNow.forEach((c,k)=>c.forEach((v,j)=>c[j]=v+(tg[k][j]-v)*.03));
  let col=c=>`rgb(${c.map(Math.round).join(',')})`;
  let g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,col(skyNow[0]));g.addColorStop(1,col(skyNow[1]));
  ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  let night=(state.i>=9&&!state.ending)||state.ending==='war';
  if(night){
    ctx.fillStyle='#fff6d6';
    for(let i=0;i<40;i++){ctx.globalAlpha=.35+.35*Math.sin(t/600+i);ctx.fillRect((i*137)%width,(i*71)%(height*.35),2,2)}
    ctx.globalAlpha=1;
  }else{
    let late=state.i>=7&&!state.ending,sx=width*(late?.88:.8),sy=height*(late?.22:.12);
    ctx.fillStyle=late?'#ffcf9a':'#fff0b8';ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(sx,sy,26,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  drawBackdrop(t);
  ctx.fillStyle=night?'rgba(220,226,240,.18)':'rgba(255,255,255,.75)';
  for(let i=0;i<5;i++){
    let x=((i*330+t*.012)%(width+320))-160,y=50+(i*53)%120;
    ctx.beginPath();ctx.arc(x,y,20,0,Math.PI*2);ctx.arc(x+24,y-9,26,0,Math.PI*2);ctx.arc(x+50,y,19,0,Math.PI*2);ctx.fill();
  }
  if(!night){
    ctx.strokeStyle='#4d5f5a';ctx.lineWidth=1.6;
    for(let i=0;i<3;i++){
      let x=((t*.03+i*90)%(width+200))-100,y=height*.18+i*18+Math.sin(t/400+i)*4,f=Math.sin(t/120+i)*3;
      ctx.beginPath();ctx.moveTo(x-7,y-f);ctx.quadraticCurveTo(x-3,y-4,x,y);ctx.quadraticCurveTo(x+3,y-4,x+7,y-f);ctx.stroke();
    }
  }
}
function drawRiver(t){
  ctx.save();ctx.strokeStyle='rgba(236,250,246,.7)';ctx.lineWidth=2;ctx.lineCap='round';
  for(let i=0;i<14;i++){
    let z=-21+i*3,o=Math.sin(t/700+i*1.7)*.6,a=project([30.2+o,0,z]),b=project([31.2+o,0,z+.25]);
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  }
  ctx.restore();
}
function drawKite(t){
  let s=stages[4],base=project([s.x+1.6,0,s.z-1.2]),k=project([s.x+1.6+Math.sin(t/900)*.4,5.4+Math.sin(t/600)*.25,s.z-1.2]);
  if(k[0]<-60||k[0]>width+60||k[1]<-60||k[1]>height+60)return;
  ctx.save();ctx.strokeStyle='rgba(90,70,50,.55)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(base[0],base[1]);ctx.quadraticCurveTo((base[0]+k[0])/2+20,(base[1]+k[1])/2,k[0],k[1]+12);ctx.stroke();
  ctx.translate(k[0],k[1]);ctx.rotate(Math.sin(t/700)*.12);
  ctx.fillStyle='#f7efe0';ctx.strokeStyle='#a78050';ctx.lineWidth=1.5;ctx.fillRect(-10,-12,20,24);ctx.strokeRect(-10,-12,20,24);
  ctx.fillStyle='#c95b4a';ctx.fillRect(-10,-12,20,5);
  ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fillStyle='#e7efe2';ctx.fill();ctx.stroke();
  ctx.strokeStyle='#c95b4a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,12);
  for(let i=1;i<=4;i++)ctx.lineTo(Math.sin(t/250+i)*5,12+i*7);
  ctx.stroke();ctx.restore();
}
function drawTimeOverlay(){
  let i=state.i,c=state.ending==='war'?'#59646566':state.ending==='apart'?'#6b727033':state.ending?'':i===9?'#1d284866':i>=7?'#e3814f2e':i>=5?'#f6c27a1c':'';
  if(c){ctx.fillStyle=c;ctx.fillRect(0,0,width,height)}
}
// 장소마다 상징물: 광장 분수, 달리기 결승 아치, 명절 마을 윷, 안내소 표지판
function props(s,i){
  let x=s.x-2.4,z=s.z+1.8;
  if(i===2){cyl(scene,x,0,z,.85,.8,.28,'#c9d6d3',10);flat(scene,x,z,1.1,1.1,'#9fd0e0',.29);cyl(scene,x,.28,z,.14,.11,.75,'#b7c8c4',8);cyl(scene,x,1.02,z,.34,.05,.12,'#9fd0e0',8)}
  if(i===3){for(let dx of [-.9,.9])cyl(scene,x+dx,0,z,.07,.06,1.6,'#8d6749',6);box(scene,x,1.3,z,2.0,.34,.08,'#e0a05a');flat(scene,s.x,s.z+2.6,4.4,.16,'#ffffff',.04)}
  if(i===4){for(let k=0;k<4;k++)box(scene,x-.3+k*.2,.02,z,.12,.06,.7,k%2?'#d5aa68':'#e5c18b')}
  if(i===6){box(scene,x,0,z,.12,1.2,.12,'#8d6749');box(scene,x,1.0,z,1.0,.6,.1,'#709fc2')}
}

// ===== 타이틀 화면과 엔딩 연출 =====
function titleArt(){
  let person=(x,body,me)=>`<g transform="translate(${x} 0)"><ellipse cx="0" cy="150" rx="15" ry="4" fill="#00000022"/><rect x="-7" y="124" width="5" height="25" rx="2" fill="${me?'#4f5663':'#3d4650'}"/><rect x="2" y="124" width="5" height="25" rx="2" fill="${me?'#4f5663':'#3d4650'}"/>${me?'<rect x="-16" y="100" width="8" height="21" rx="3" fill="#b8392a"/>':''}<rect x="-11" y="98" width="22" height="30" rx="8" fill="${body}"/>${me?'<path d="M-5 98 L5 98 L0 107Z" fill="#f2efe6"/><rect x="-1.4" y="99" width="2.8" height="15" fill="#b8392a"/>':''}<circle cx="0" cy="86" r="12" fill="${me?'#edbc94':'#f3cfaf'}"/>${me?'<path d="M-12 86 Q-12 73 0 73 Q12 73 12 86 Q10 79 2 79 L-6 82 Q-10 82 -12 86Z" fill="#1d1a1c"/>':'<path d="M-12 86 Q-12 72 0 72 Q12 72 12 86 Q8 78 0 78 Q-8 78 -12 86Z" fill="#2d2a2b"/><circle cx="-12" cy="89" r="5" fill="#2d2a2b"/>'}<circle cx="-4" cy="87" r="1.6" fill="#3b2f2a"/><circle cx="4" cy="87" r="1.6" fill="#3b2f2a"/><path d="M-3.5 92 q3.5 3 7 0" stroke="#b5654f" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
  let house=(x,c)=>`<g><rect x="${x}" y="96" width="46" height="34" fill="#f3e4c7"/><path d="M${x-6} 98 L${x+23} 78 L${x+52} 98Z" fill="${c}"/><rect x="${x+18}" y="112" width="10" height="18" fill="#8c6b50"/></g>`;
  return `<svg viewBox="0 0 420 170" aria-hidden="true"><defs><linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7dce2"/><stop offset="1" stop-color="#eef0d8"/></linearGradient></defs><rect width="420" height="170" fill="url(#tsky)"/><circle cx="352" cy="38" r="17" fill="#fff0b8"/><g class="tcloud"><circle cx="70" cy="40" r="11" fill="#fff"/><circle cx="84" cy="34" r="14" fill="#fff"/><circle cx="99" cy="40" r="10" fill="#fff"/></g><path d="M0 118 Q70 72 140 104 T280 92 T420 108 V170 H0Z" fill="#a6c88d"/>${house(24,'#d9826b')}${house(338,'#639aaf')}${house(80,'#dcaa57')}<path d="M0 140 Q110 118 210 136 T420 130 V170 H0Z" fill="#8eb398"/><path d="M150 170 Q205 128 270 170Z" fill="#e8d7b0"/><g class="tkite"><path d="M296 70 Q300 100 262 128" stroke="#7a6a55" stroke-width="1" fill="none"/><rect x="286" y="34" width="20" height="26" fill="#f7efe0" stroke="#a78050" stroke-width="1.5"/><rect x="286" y="34" width="20" height="6" fill="#c95b4a"/><circle cx="296" cy="47" r="4" fill="#e7efe2" stroke="#a78050"/><path d="M296 60 q5 6 0 10 q-5 5 0 10" stroke="#c95b4a" stroke-width="2" fill="none"/></g>${person(190,'#2b3d63',true)}${person(232,'#5d93a6',false)}<path d="M243 104 l12 -12" stroke="#477a8c" stroke-width="5" stroke-linecap="round"/></svg>`;
}
function showTitle(){
  modal=true;keys.clear();
  ['hud','mission','controls'].forEach(id=>document.getElementById(id).inert=true);
  let el=$('#title');
  el.innerHTML=`<div class="title-card"><div class="eyebrow">남북 청년 문화 교류 게임</div><h1>한반도 한 바퀴</h1><p class="title-sub">낯설지만 익숙한 우리들의 문화 여행</p><div class="title-art">${titleArt()}</div><p class="title-story">남한 고등학생인 내가 평양에서 온 친구 <b>지우</b>와 함께 열 곳의 마을을 돌며 북한의 말과 음식, 명절을 만나요. 마을 곳곳에는 평화 이야기도 숨어 있어요. 나의 대답과 선택에 따라 네 가지 결말이 기다립니다.</p><div class="title-meta"><span>발견한 엔딩 <b>${endings.length} / 4</b></span><span>장소 <b>10곳</b></span><span>미니게임 <b>6종</b></span></div><div class="title-actions"><button class="primary" id="tStart">여행 시작하기</button><button class="secondary" id="tHelp">도움말 보기</button></div><p class="small">방향키·WASD로 이동 · 스페이스바로 점프 · E로 지우의 말 뜻 보기</p></div>`;
  el.hidden=false;
  $('#tStart').onclick=()=>{hideTitle();notice('첫 장소인 북한말 거리로 가 볼까요?')};
  $('#tHelp').onclick=()=>{hideTitle();showHelp()};
  setTimeout(()=>$('#tStart')&&$('#tStart').focus(),50);
}
function hideTitle(){
  $('#title').hidden=true;modal=false;
  ['hud','mission','controls'].forEach(id=>document.getElementById(id).inert=false);
}
let fadeTimer=null;
function playEndingIntro(){
  closeModal();modal=true;
  let e=state.ending,info=endingInfo[e],f=$('#fade');
  f.querySelector('.fade-kicker').textContent=e==='war'?'그 후, 소식이 끊겼다':'그리고 시간이 흘러…';
  f.querySelector('.fade-title').textContent=info.n;
  f.querySelector('.fade-label').textContent=info.label;
  f.className=e;f.hidden=false;
  let go=()=>{clearTimeout(fadeTimer);f.hidden=true;f.onclick=null;showEnding()};
  f.onclick=go;fadeTimer=setTimeout(go,3600);
}

// ===== 마을 풍경: DMZ 평화공원, 캠핑장, 놀이마당, 스포츠 존, 축제 무대, 역사 문화관, 금강산, 경의선 =====
// 주의: buildScenery는 마을을 처음 만들 때(스크립트 앞부분) 호출되므로 아래 const 값을 쓰지 않는다.
function inScenery(x,z){return z>10.6||(z<-14.2&&x>-9.5)||(x>6.3&&x<13.7&&z>-4.6&&z<1.2)}
// npcModel(): 아래 world 모듈에서 정의
function buildScenery(){
  const S=scene,T=terrain;
  const SH=['#d9584a','#3f6fa3','#e0a05a','#6ba78a','#b985ab','#f2c25a','#5d93a6','#e7e2d6','#c46a8a'],PA=['#3d4650','#5b6270','#2b3d63','#6b5a4c'],HA=['#1f1b1d','#3b2a22','#2d2a2b','#4a3426'];
  let person=(x,z,k,s)=>npcModel(S,x,z,SH[k%SH.length],PA[(k*3)%PA.length],HA[(k*7)%HA.length],k*.7,s,k);
  // 백두-한라 자전거길
  flat(T,8.5,11.7,37,1.5,'#e6cd9c',.02);
  for(let x=-9;x<27;x+=1.6)flat(T,x,11.7,.7,.12,'#f6efe0',.03);
  // DMZ 평화공원: 잔디, 철조망, 입구 아치, 꽃밭, 평화의 종, 바람개비
  flat(T,-3.8,16,11,6.4,'#b8d69a',.015);
  for(let x=-9.2;x<=1.85;x+=1.1)cyl(S,x,0,19.1,.06,.05,1.3,'#8a8f92',5);
  for(let x=-9.2;x<1.8;x+=1.1){box(S,x+.55,.55,19.1,1.1,.05,.05,'#a3a9ac');box(S,x+.55,1.05,19.1,1.1,.05,.05,'#a3a9ac')}
  for(let z=12.9;z<=19.15;z+=1.03)cyl(S,-9.2,0,z,.06,.05,1.3,'#8a8f92',5);
  for(let z=12.9;z<19.1;z+=1.03){box(S,-9.2,.55,z+.515,.05,.05,1.03,'#a3a9ac');box(S,-9.2,1.05,z+.515,.05,.05,1.03,'#a3a9ac')}
  box(S,-2.4,0,12.9,.42,2.3,.42,'#ece6da');box(S,1.0,0,12.9,.42,2.3,.42,'#ece6da');box(S,-.7,2.3,12.9,3.9,.5,.3,'#3f6fa3');
  [[-7.6,14],[-7.6,17.2],[-4.8,17.9],[-1.8,17.9],[-5.2,14.4]].forEach(([x,z],k)=>{
    box(S,x,0,z,2.2,.18,1,'#8a6a4a');
    for(let j=0;j<10;j++)cyl(S,x-.9+(j%5)*.45,.18,z-.25+Math.floor(j/5)*.5,.13,.05,.14,['#e86a7a','#f2c25a','#f39ac0','#ffffff','#e0785d'][(j+k)%5],5);
  });
  for(let dx of [-.7,.7])for(let dz of [-.7,.7])cyl(S,-6.4+dx,0,15.7+dz,.08,.08,1.7,'#9b3b2c',5);
  roof(S,-6.4,1.7,15.7,2.2,2.2,.7,'#3d4550');cyl(S,-6.4,.8,15.7,.36,.22,.75,'#5e6b70',8);
  for(let k=0;k<8;k++)cyl(S,-3.6+k*.55,0,16.6+(k%2)*.4,.03,.03,1.1,'#c8c2b6',4);
  tree(-.2,15.4,1.9);tree(1.2,17.6,1.6);tree(-8.4,18.2,1.7);
  for(let k=0;k<9;k++)person(-4.8+(k%5)*1.1,13.6+Math.floor(k/5)*1.3+(k%2)*.3,k);
  // 평화 캠핑장: 텐트와 모닥불
  [['#e8892f',4.8,14.2],['#d34f86',6.8,17.6],['#5aa64a',9.8,13.8],['#3f6fa3',11.6,17.4],['#e4c53c',12.8,14.6]].forEach(([c,x,z])=>{roof(S,x,0,z,2.4,2.2,1.7,c);box(S,x,0,z+1.09,.6,.75,.04,'#3a2c26')});
  box(S,8.6,0,15.9,.9,.12,.18,'#7a5233');box(S,8.6,0,15.9,.18,.12,.9,'#7a5233');
  for(let k=0;k<6;k++){let a=k/6*Math.PI*2+.4;person(8.6+Math.cos(a)*1.4,15.9+Math.sin(a)*1.4,k+11,.7)}
  // 전통 놀이마당: 그네와 널뛰기
  for(let dx of [-.9,.9])cyl(S,16.2+dx,0,14.6,.07,.06,2,'#8d6749',5);
  box(S,16.2,1.95,14.6,2,.12,.12,'#7a5233');box(S,16.2,.45,14.6,.7,.08,.3,'#c9a06a');
  box(S,18.6,0,17.2,.25,.25,.25,'#8d6749');box(S,18.6,.25,17.2,2.4,.08,.36,'#d5aa68');
  person(16.2,14.6,21,.6);person(17.5,17.2,22,.6);person(19.7,17.2,23,.6);person(15.2,16.6,24,.62);
  // 평화 스포츠 존: 트랙, 탁구대, 축구 골대
  flat(T,24.2,16.2,5.4,5.6,'#c8553d',.02);
  for(let k=0;k<4;k++)flat(T,24.2,13.9+k*1.5,5.4,.08,'#f4e9da',.025);
  box(S,23.4,0,15.4,.1,.6,.1,'#3a2c26');box(S,24.8,0,15.4,.1,.6,.1,'#3a2c26');
  box(S,24.1,.6,15.4,2,.1,1.1,'#3f6fa3');box(S,24.1,.7,15.4,.04,.16,1.1,'#ffffff');
  for(let dz of [-1,1])cyl(S,26.2,0,18+dz,.07,.07,1.2,'#ffffff',5);
  box(S,26.2,1.15,18,.1,.1,2.1,'#ffffff');
  person(23.2,14.4,31,.72);person(25,16.4,32,.72);person(22.6,17.8,33,.72);person(25.6,13.2,34,.72);
  // 화합의 축제 무대와 장터
  box(S,10,0,-2.6,3.6,.5,2.1,'#b0814f');box(S,10,.5,-3.55,3.6,1.7,.14,'#b8392a');box(S,10,2.2,-3.55,3.8,.2,.2,'#f2c25a');
  [[7.4,-.6,'#3f6fa3'],[12.6,-.6,'#d9584a']].forEach(([x,z,c])=>{
    box(S,x,0,z,1.4,.8,.8,'#c9a06a');
    for(let dx of [-.6,.6])cyl(S,x+dx,0,z-.35,.05,.05,1.6,'#8d6749',4);
    box(S,x,1.55,z,1.6,.12,1.1,c);
  });
  for(let k=0;k<12;k++)person(8.4+(k%6)*.65,-.2+Math.floor(k/6)*.9+(k%2)*.2,k+41);
  // 남북 역사 문화관 (한옥)
  box(S,-3,0,-16.6,6.4,.45,3.8,'#cfc6b6');box(S,-3,.45,-16.6,5.2,1.8,2.9,'#f0e6d2');
  for(let dx of [-2.6,-1.3,0,1.3,2.6])cyl(S,-3+dx,.45,-15.05,.12,.11,1.8,'#7a4b33',6);
  box(S,-3,.45,-15.13,1.2,1.4,.06,'#8a5a3c');
  roof(S,-3,2.25,-16.6,7.2,4.6,1.45,'#3d4550');box(S,-3,3.62,-16.6,7.4,.18,.3,'#2c323a');
  box(S,-3,0,-14.45,2,.2,.4,'#bfb5a3');
  person(-1.2,-13.7,51,.75);for(let k=0;k<5;k++)person(-5+k*1.1,-13.4-(k%2)*.4,k+150,.78);person(-4.6,-13.9,52,.75);
  // 금강산 기암괴석, 소나무, 케이블카 기둥
  [[15,-16.5,4.2],[17.2,-18.4,5.6],[19.6,-16.6,3.6],[21.4,-18.8,6.2],[23.6,-16.9,4.4],[25.4,-19.2,5.2],[18.4,-15.4,2.6],[22.6,-15.2,2.8]].forEach(([x,z,h],k)=>{
    cyl(S,x,0,z,1.1,.28,h,k%2?'#d4c8ae':'#c2b59a',6);cyl(S,x+.2,h*.55,z+.1,.6,.18,h*.4,'#e0d6c0',5);
  });
  for(let k=0;k<10;k++){let x=14+rand()*12,z=-15-rand()*5;cyl(S,x,0,z,.35,0,1.1,'#5f8f55',6)}
  cyl(S,13.4,0,-14.6,.14,.12,2.6,'#6b7372',6);cyl(S,26.6,0,-20.2,.14,.12,7.2,'#6b7372',6);
  // 경의선 철길과 정거장
  for(let x=-10;x<30;x+=.7)flat(T,x,-20.6,.18,1.3,'#8a6a4a',.02);
  flat(T,10,-20.95,40,.09,'#6f6a66',.04);flat(T,10,-20.25,40,.09,'#6f6a66',.04);
  box(S,4,0,-19.3,3.4,.35,.9,'#cfc6b6');
  for(let dx of [-1.3,1.3])cyl(S,4+dx,.35,-19.3,.06,.06,1.4,'#7a4b33',4);
  box(S,4,1.75,-19.3,3.6,.12,1.1,'#b8392a');

  // 먹거리 시장 앞 장터 노점: 차양, 음식, 빨간 의자, 손님
  [[-.5,5.75,'#3f6fa3'],[6.4,6.05,'#c9483a']].forEach(([x,z,c],k)=>{
    box(S,x,0,z,1.8,.85,.9,'#b98a55');
    for(let j=0;j<6;j++)cyl(S,x-.7+j*.28,.85,z+(j%2?.15:-.15),.11,.1,.08,['#e8b04a','#c9483a','#f4e6c8','#7da86a','#d98a3a','#f2c25a'][j],6);
    for(let dx of [-.85,.85])cyl(S,x+dx,0,z-.4,.05,.05,1.9,'#7a5233',4);
    box(S,x,1.85,z,2.1,.12,1.3,c);box(S,x,1.72,z+.66,2.1,.16,.04,'#ffffff');
    for(let j=0;j<3;j++)box(S,x-.6+j*.6,0,z+.95,.26,.32,.26,'#d9443a');
    person(x-.6,z+1.5,70+k*3,.8);person(x+.4,z+1.45,71+k*3,.8);person(x,z-.75,72+k*3,.8);
  });
  // 분수 둘레 벤치와 사람들 (만남의 광장)
  [[6.2,9.6],[7.6,11.0],[9.0,9.6]].forEach(([x,z])=>{box(S,x,.3,z,.9,.08,.35,'#9b6b45');box(S,x-.35,0,z,.08,.3,.3,'#6b4a34');box(S,x+.35,0,z,.08,.3,.3,'#6b4a34')});
  for(let k=0;k<7;k++){let a=k/7*Math.PI*2;person(7.6+Math.cos(a)*1.55,9.8+Math.sin(a)*1.05,k+80,.78)}
  // 북한말 거리 앞 광장의 많은 사람들
  for(let k=0;k<24;k++)person(-7.6+(k%8)*1.2+(Math.floor(k/8)%2)*.5,9.35+Math.floor(k/8)*.55,k+90,(k%5===0)?.62:.82);
  // 길가와 장소 사이 사람들
  [[-1.4,6.6],[1.7,9.9],[4.6,9.9],[13.8,6.2],[15.6,9.6],[19.3,6.4],[20.8,9.8],[22.4,-5.6],[16.2,-9.9],[12.6,-10.2],[5.4,-6],[1.5,-9.8],[-6.6,-9.4],[-1.2,-5.8]].forEach(([x,z],k)=>person(x,z,k+120,.82));
  // 스포츠 존 응원하는 사람들
  for(let k=0;k<6;k++)person(21.4+k*.55,13.0,k+140,.75);
  // 깃대 (깃발은 매 프레임 따로 그림)
  [[13.2,10.7],[14.2,10.7],[1.6,12.6],[-7.4,-6.2],[-8.2,-6.2]].forEach(([x,z])=>cyl(S,x,0,z,.05,.04,3.2,'#d6d0c4',5));
}

const FLAGS=[[13.2,10.7,'tg'],[14.2,10.7,'kr'],[1.6,12.6,'kr'],[-7.4,-6.2,'kr'],[-8.2,-6.2,'tg']];
// 한반도 실루엣 (0~1 정규화, 위쪽이 북쪽)
const KOREA=[[.30,.28],[.42,.18],[.55,.10],[.66,.03],[.78,0],[.86,.06],[.80,.14],[.72,.20],[.66,.30],[.62,.38],[.66,.44],[.70,.52],[.76,.62],[.80,.74],[.80,.84],[.74,.92],[.62,.94],[.50,.95],[.40,.93],[.38,.84],[.42,.76],[.36,.68],[.40,.60],[.32,.54],[.24,.48],[.30,.42],[.22,.38]];
// 가까이 가면 나오는 평화 이야기 (도감 '평화' 항목에 기록)
const SCENERY=[
  {n:'DMZ 평화공원',x:-.7,z:13.2,r:1.4,lx:-.7,ly:3.2,lz:12.9,fact:'DMZ(비무장지대)는 1953년 정전협정에 따라 군사분계선에서 남북으로 2km씩 군대를 두지 않기로 한 땅이에요. 사람의 발길이 드물어 멸종위기 동식물이 사는 생태의 보고가 되었어요.'},
  {n:'평화 캠핑장',x:8.6,z:13.1,r:1.3,lx:8.6,ly:2.6,lz:15.9,fact:'백두산과 한라산은 한반도의 북쪽 끝과 남쪽 끝을 상징하는 산이에요. 언젠가 백두에서 한라까지 자전거로 달리는 날을 상상해 보세요.'},
  {n:'전통 놀이마당',x:17.4,z:13.1,r:1.3,lx:17.4,ly:2.8,lz:15.4,fact:'그네뛰기와 널뛰기는 단오와 설에 남과 북 모두 즐겨 온 민속놀이예요.'},
  {n:'평화 스포츠 존',x:24.2,z:13.1,r:1.3,lx:24.2,ly:2.6,lz:16,fact:'1991년 세계탁구선수권대회에서 남북 단일팀 "코리아"가 한반도기를 함께 들고 여자 단체전 우승을 차지했어요.'},
  {n:'화합의 축제 무대',x:13.5,z:0,r:1.5,lx:10,ly:3.1,lz:-3.4,fact:'2018년 평창 동계올림픽 개회식에서 남과 북의 선수단이 한반도기를 들고 함께 입장했어요.'},
  {n:'남북 역사 문화관',x:-.5,z:-14.6,r:1.5,lx:-3,ly:4.6,lz:-16.6,fact:'고려의 도읍 개성에 있는 궁궐터 만월대는 2007년부터 남북 역사학자들이 함께 발굴 조사를 했어요.'},
  {n:'금강산 탐방로',x:20.5,z:-14.4,r:1.5,lx:19.6,ly:7.2,lz:-17.6,fact:'금강산 관광은 1998년 배를 타고 가는 길로 시작해 2008년까지 이어졌어요. 그동안 많은 남한 사람이 금강산을 다녀왔어요.'},
  {n:'경의선 철길',x:3.4,z:-18.1,r:1.3,lx:4,ly:2.7,lz:-19.3,fact:'경의선은 서울과 신의주를 잇던 철길이에요. 2007년에는 끊겼던 철길 위로 남북 시험 열차가 달렸어요.'}];

// 매 프레임 움직이는 것: 기차, 케이블카, 걷는 사람, 자전거
function sceneryDynamic(l,t){
  let tx=((t/1000*2.4)%60)-14;
  [['#d94a3a',0,1],['#f2c25a',-2.35,0],['#2f8f7a',-4.7,0],['#3f7cc2',-7.05,0]].forEach(([c,o,eng])=>{
    let x=tx+o;if(x<-12||x>31)return;
    box(l,x,.1,-20.6,2.1,.16,.9,'#2e2622');
    for(let dx of [-.65,.65])for(let dz of [-.46,.46])box(l,x+dx,.0,-20.6+dz,.36,.36,.08,'#2e2622');
    box(l,x,.26,-20.6,2.1,1.0,1.0,c);
    box(l,x,.62,-20.08,1.86,.34,.04,'#e9f2f7');for(let wx of [-.47,.15,.77])box(l,x+wx-.15,.62,-20.07,.06,.34,.04,c);
    box(l,x,.32,-20.08,2.1,.08,.04,'#ffffff');
    box(l,x,1.26,-20.6,2.24,.1,1.1,darken(c,.7));
    if(eng){box(l,x+.6,1.36,-20.6,.3,.4,.3,'#2e2622');box(l,x+1.08,.4,-20.6,.06,.4,.6,'#f2c25a')}
  });
  for(let k=0;k<3;k++){
    let u=((t/16000)+k/3)%1,x=13.4+13.2*u,y=2.6+4.6*u,z=-14.6-5.6*u;
    box(l,x,y-.95,z,.55,.6,.5,k%2?'#f2c25a':'#d9584a');box(l,x,y-.35,z,.6,.06,.55,'#3a2c26');
  }
  const W=[[-8,10.4,3,10.4],[0,6.2,8,6.2],[6,-5.2,14,-5.2],[15,-5.5,23,-5.5],[-7.2,-3,-7.2,4],[20,10.2,27,10.2],[-8.5,-11,-8.5,-17]];
  const SH=['#d9584a','#3f6fa3','#e0a05a','#6ba78a','#b985ab','#f2c25a','#5d93a6'];
  W.forEach(([x1,z1,x2,z2],k)=>{
    let d=Math.hypot(x2-x1,z2-z1),u=((t/1000*.8+k*3.1)%(2*d))/d,f=u>1?2-u:u;
    npcModel(l,x1+(x2-x1)*f,z1+(z2-z1)*f,SH[k],['#3d4650','#5b6270','#2b3d63'][k%3],['#1f1b1d','#3b2a22'][k%2],t/90+k,.76,k+3);
  });
  for(let k=0;k<3;k++){
    let u=((t/1000*.12)+k/3)%1,per=2*(4.6+4.8),d=u*per,x,z;
    if(d<4.6){x=21.9+d;z=13.8}else if(d<9.4){x=26.5;z=13.8+(d-4.6)}else if(d<14){x=26.5-(d-9.4);z=18.6}else{x=21.9;z=18.6-(d-14)}
    npcModel(l,x,z,['#3f6fa3','#e0a05a','#d9584a'][k],'#2b3d63','#1f1b1d',t/70+k,.8,k+5);
  }
  for(let k=0;k<2;k++){let u=((t/1000*.22)+k*.5)%2,f=u>1?2-u:u;npcModel(l,14+f*6,11.45+k*.5,['#e8963a','#2f8f7a'][k],'#2b3d63','#1f1b1d',t/65+k,.8,k+8)}
  for(let k=0;k<2;k++){
    let x=((t/1000*3.2+k*18)%38)-10;
    box(l,x,.2,11.7,1.0,.08,.1,'#3a2c26');box(l,x-.42,0,11.7,.08,.42,.42,'#2d2a2b');box(l,x+.42,0,11.7,.08,.42,.42,'#2d2a2b');
    npcModel(l,x,11.7,k?'#d9584a':'#3f6fa3','#3d4650','#1f1b1d',0,.7);
  }
}
function offscreen(p){return p[0]<-80||p[0]>width+80||p[1]<-60||p[1]>height+60}
function bunting(a,b,i){
  if(offscreen(a)&&offscreen(b))return;
  let n=10,pts=[];ctx.strokeStyle='#6b5a4c';ctx.lineWidth=1;ctx.beginPath();
  for(let k=0;k<=n;k++){let u=k/n,x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u+Math.sin(u*Math.PI)*scale*.5;pts.push([x,y]);k?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.stroke();
  const C=['#d9584a','#f2c25a','#3f6fa3','#6ba78a','#b985ab'];
  for(let k=0;k<n;k++){
    let [x1,y1]=pts[k],[x2,y2]=pts[k+1];ctx.fillStyle=C[(k+i)%5];ctx.beginPath();
    ctx.moveTo(x1+(x2-x1)*.15,y1+(y2-y1)*.15);ctx.lineTo(x2-(x2-x1)*.15,y2-(y2-y1)*.15);ctx.lineTo((x1+x2)/2,(y1+y2)/2+scale*.32);ctx.fill();
  }
}
function drawFlag(x,y,ty,t){
  let w=scale*1.05,h=w*.66,wave=k=>Math.sin(t/260+k*2.2)*h*.06;
  ctx.save();ctx.translate(x,y);
  ctx.beginPath();ctx.moveTo(0,0);
  for(let k=0;k<=4;k++)ctx.lineTo(w*k/4,wave(k));
  for(let k=4;k>=0;k--)ctx.lineTo(w*k/4,h+wave(k));
  ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();ctx.strokeStyle='#bdb6aa';ctx.lineWidth=1;ctx.stroke();
  let cx=w/2,cy=h/2+wave(2);
  if(ty==='tg'){
    let r=h*.25;
    ctx.fillStyle='#cd2e3a';ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.fill();
    ctx.fillStyle='#0047a0';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI);ctx.fill();
    ctx.fillStyle='#cd2e3a';ctx.beginPath();ctx.arc(cx-r/2,cy,r/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0047a0';ctx.beginPath();ctx.arc(cx+r/2,cy,r/2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#111';ctx.lineWidth=Math.max(1,h*.05);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{
      ctx.save();ctx.translate(cx+sx*w*.32,cy+sy*h*.3);ctx.rotate(sx*sy>0?Math.PI/4:-Math.PI/4);
      for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(-w*.06,j*h*.07);ctx.lineTo(w*.06,j*h*.07);ctx.stroke()}
      ctx.restore();
    });
  }else{
    ctx.fillStyle='#4f86c6';ctx.beginPath();
    KOREA.forEach(([a,b],i)=>{let X=cx-h*.33+a*h*.66,Y=cy-h*.42+b*h*.84;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)});
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function sceneryLabel(x,y,text,visited){
  ctx.font='bold 12px system-ui, sans-serif';
  let t=(visited?'✓ ':'')+text,w=ctx.measureText(t).width+20;
  ctx.fillStyle='#3a2c26';ctx.beginPath();ctx.roundRect(x-w/2+2,y-12,w,24,12);ctx.fill();
  ctx.fillStyle=visited?'#e8f1df':'#fffaf0';ctx.strokeStyle='#3a2c26';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(x-w/2,y-14,w,24,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#2e2622';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y-2);
}
function drawSceneryOverlay(t){
  ctx.save();
  let A=project([13.4,2.6,-14.6]),B=project([26.6,7.2,-20.2]);
  ctx.strokeStyle='#4a4a4a';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke();
  // 바람개비
  for(let k=0;k<8;k++){
    let p=project([-3.6+k*.55,1.12,16.6+(k%2)*.4]);if(offscreen(p))continue;
    ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(t/180+k);
    for(let j=0;j<4;j++){ctx.rotate(Math.PI/2);ctx.fillStyle=['#e86a7a','#4f86c6','#f2c25a','#6ba78a'][(j+k)%4];ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(scale*.3,-scale*.06);ctx.lineTo(scale*.22,scale*.14);ctx.fill()}
    ctx.restore();
  }
  // 모닥불과 연기
  let f=project([8.6,.15,15.9]);
  if(!offscreen(f)){
    let fl=1+Math.sin(t/90)*.15+Math.sin(t/57)*.1;
    ctx.fillStyle='#f08a2c';ctx.beginPath();ctx.ellipse(f[0],f[1]-scale*.35*fl,scale*.18,scale*.38*fl,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffd25a';ctx.beginPath();ctx.ellipse(f[0],f[1]-scale*.25*fl,scale*.09,scale*.22*fl,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(210,210,210,.35)';
    for(let k=0;k<3;k++){let u=((t/1600)+k/3)%1;ctx.beginPath();ctx.arc(f[0]+Math.sin(u*6+k)*scale*.15,f[1]-scale*(.8+u*1.4),scale*(.1+u*.15),0,Math.PI*2);ctx.fill()}
  }
  // 풍선
  [[22.4,13.0,'#d9584a'],[22.8,12.8,'#4f86c6'],[23.1,13.2,'#f2c25a'],[19.8,10.3,'#d9584a'],[20.1,10.1,'#f2c25a'],[20.4,10.4,'#6ba78a'],[19.9,10.6,'#4f86c6'],[20.3,10.75,'#b985ab']].forEach(([x,z,c],k)=>{
    let base=project([x,.9,z]),p=project([x+Math.sin(t/900+k)*.12,2.3+Math.sin(t/700+k)*.1,z]);if(offscreen(p))return;
    ctx.strokeStyle='#8a7a6a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(base[0],base[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();
    ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(p[0],p[1]-scale*.18,scale*.17,scale*.21,0,0,Math.PI*2);ctx.fill();
  });
  // 장소 가로등 사이 줄 깃발
  for(let i=1;i<stages.length;i++){let a=stages[i-1],b=stages[i];if(a.z!==b.z)continue;bunting(project([a.x+2.4,1.85,a.z+1.75]),project([b.x+2.4,1.85,b.z+1.75]),i)}

  // 분수 위 한반도 조각상
  {let p=project([7.6,1.15,9.8]);if(!offscreen(p)){let hh=scale*2.1,ww=hh*.62;
   ctx.fillStyle='rgba(159,208,224,.8)';for(let k=0;k<5;k++){let u=((t/700)+k/5)%1;ctx.beginPath();ctx.arc(p[0]+Math.cos(k*1.3)*scale*.6*u,p[1]-hh*.2+u*u*scale*.6-u*scale*.4,2,0,Math.PI*2);ctx.fill()}}}
  {let p=project([-6.8,2.6,8]);if(!offscreen(p)){ctx.font='bold '+Math.round(scale*.42)+'px system-ui, sans-serif';ctx.fillStyle='#fffaf0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('평화 통일',p[0],p[1])}}
  // DMZ 입구 기둥 글씨
  [[-2.4,'평화'],[1.0,'통일']].forEach(([x,txt])=>{let p=project([x,1.5,13.12]);if(offscreen(p))return;ctx.fillStyle='#2e2622';ctx.font='bold '+Math.round(scale*.42)+'px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';[...txt].forEach((ch,i)=>ctx.fillText(ch,p[0],p[1]+(i-.5)*scale*.5))});
  // 만국기 줄 (만남의 광장 앞)
  flagString(project([5.4,1.7,10.6]),project([13.0,2.4,10.7]),t);
  flagString(project([-8.6,1.6,10.6]),project([-1.8,1.7,10.6]),t+500);
  // 장터 김
  [[-.5,5.75],[6.4,6.05]].forEach(([x,z],k)=>{let p=project([x,1.0,z]);if(offscreen(p))return;ctx.fillStyle='rgba(240,240,240,.55)';for(let j=0;j<3;j++){let u=((t/1400)+j/3+k*.2)%1;ctx.beginPath();ctx.arc(p[0]+Math.sin(u*5+j)*scale*.18,p[1]-scale*(.3+u*1.3),scale*(.12+u*.16),0,Math.PI*2);ctx.fill()}});
  {let tx=((t/1000*2.4)%60)-14,p=project([tx,2.2,-20.6]);if(tx>-11&&tx<30&&!offscreen(p))sceneryLabel(p[0],p[1],'평화 열차',false)}
  [[-.5,5.75,'평양 온반'],[6.4,6.05,'부산 어묵']].forEach(([x,z,txt])=>{let p=project([x,2.25,z+.6]);if(offscreen(p))return;ctx.font='bold '+Math.round(scale*.34)+'px system-ui, sans-serif';let w=ctx.measureText(txt).width+12;ctx.fillStyle='#fffaf0';ctx.strokeStyle='#3a2c26';ctx.lineWidth=1.2;ctx.beginPath();ctx.roundRect(p[0]-w/2,p[1]-9,w,18,5);ctx.fill();ctx.stroke();ctx.fillStyle='#b8392a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,p[0],p[1])});
  // 태극기와 한반도기
  FLAGS.forEach(([x,z,ty],k)=>{let p=project([x,3.15,z]);if(!offscreen(p))drawFlag(p[0],p[1],ty,t+k*400)});
  // 풍경 이름표
  SCENERY.forEach(z=>{let p=project([z.lx,z.ly,z.lz]);if(!offscreen(p))sceneryLabel(p[0],p[1],z.n,!!(state.peace&&state.peace.has(z.n)))});
  ctx.restore();
}

function flagString(a,b,t){
  if(offscreen(a)&&offscreen(b))return;
  let n=12;ctx.strokeStyle='#5a4a3e';ctx.lineWidth=1;ctx.beginPath();let pts=[];
  for(let k=0;k<=n;k++){let u=k/n,x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u+Math.sin(u*Math.PI)*scale*.45;pts.push([x,y]);k?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.stroke();
  const F=[['#d9443a','#ffffff','#3f6fa3'],['#2f7d43','#ffffff','#d9443a'],['#f2c25a','#3f6fa3','#d9443a'],['#3f6fa3','#f2c25a','#3f6fa3'],['#ffffff','#d9443a','#ffffff'],['#1f1b1d','#d9443a','#f2c25a']];
  let fw=scale*.42,fh=scale*.3;
  for(let k=0;k<n;k++){
    let [x,y]=pts[k],c=F[k%F.length],sw=Math.sin(t/300+k)*1.5;
    for(let j=0;j<3;j++){ctx.fillStyle=c[j];ctx.fillRect(x+j*fw/3+2,y+sw,fw/3,fh)}
    ctx.strokeStyle='#8a7a6a';ctx.lineWidth=.6;ctx.strokeRect(x+2,y+sw,fw,fh);
  }
}
function checkScenery(){
  if(modal||state.ending)return;
  if(!state.peace)state.peace=new Set();
  for(const z of SCENERY){
    if(state.peace.has(z.n)||Math.hypot(px-z.x,pz-z.z)>=z.r)continue;
    state.peace.add(z.n);collect(z.n,z.fact,'','평화');showFact(z);break;
  }
}
function showFact(z){
  clearTimeout(toastTimer);let el=$('#toast');
  el.classList.remove('alert');el.classList.add('fact');
  el.innerHTML=`<b>${z.n}</b> · 평화 이야기 ${state.peace.size} / ${SCENERY.length}<br>${z.fact}`;
  el.classList.add('show');
  toastTimer=setTimeout(()=>el.classList.remove('show'),7000);
}

// ===== 공통 그리기 도우미 (마을을 처음 만들 때 호출되므로 const 값은 쓰지 않음) =====
function darken(c,k){return '#'+rgb(c).map(n=>Math.max(0,Math.min(255,Math.round(n*k))).toString(16).padStart(2,'0')).join('')}
// 땅 위 그림자·얼룩: 길보다 먼저 그려지도록 terrain 앞쪽에 넣는다
function blob(l,x,z,rx,rz,c){
  let pts=[];for(let i=0;i<10;i++){let a=i/10*Math.PI*2;pts.push([x+Math.cos(a)*rx,.008,z+Math.sin(a)*rz])}
  let f={p:pts,c:shade(c,1)};if(l===terrain)terrain.splice(1,0,f);else l.push(f);
}
// 지붕: 금속 줄무늬(세로) 또는 기와(가로) 결이 보이도록 여러 면으로 나눈다
function roofSeam(l,x,y,z,w,d,h,c,tile){
  let a=x-w/2,b=x+w/2,f=z-d/2,g=z+d/2;
  face(l,[[a,y,f],[b,y,f],[b,y+h,z],[a,y+h,z]],c,.8);
  if(tile){
    let m=7;
    for(let i=0;i<m;i++){
      let u1=i/m,u2=(i+1)/m,z1=g+(z-g)*u1,z2=g+(z-g)*u2,y1=y+h*u1,y2=y+h*u2,zm=z1+(z2-z1)*.75,ym=y1+(y2-y1)*.75;
      face(l,[[a,y1,z1],[b,y1,z1],[b,ym,zm],[a,ym,zm]],c,1.08);face(l,[[a,ym,zm],[b,ym,zm],[b,y2,z2],[a,y2,z2]],c,.8);
    }
  }else{
    let n=Math.max(6,Math.round(w/.42));
    for(let i=0;i<n;i++){
      let x1=a+i*w/n,x2=a+(i+1)*w/n,xm=x1+(x2-x1)*.8;
      face(l,[[x1,y,g],[xm,y,g],[xm,y+h,z],[x1,y+h,z]],c,1.06);face(l,[[xm,y,g],[x2,y,g],[x2,y+h,z],[xm,y+h,z]],c,.84);
    }
  }
  face(l,[[a,y,f],[a,y,g],[a,y+h,z]],c,.93);face(l,[[b,y,f],[b,y,g],[b,y+h,z]],c,.72);
  box(l,x,y-.1,g,w,.12,.1,darken(c,.7));box(l,x,y+h-.06,z,w+.06,.14,.26,darken(c,.62));
}
// 장소 집: 크림색 벽, 목재 기둥과 띠, 창틀과 창살이 있는 유리창, 나무 문, 줄무늬 지붕. 0번은 한옥
function house(s,idx){
  if(idx===4)return;let x=s.x,z=s.z-4.3,c=s.color,W=5.0,D=3.0,H=2.2,hanok=idx===0,wood='#7a4f33';
  blob(terrain,x+.5,z+.4,3.4,2.5,'#5d993d');
  box(scene,x,0,z,W+.5,.3,D+.6,hanok?'#c9c0ae':'#b9a98c');
  {let k0=scene.length;box(scene,x,.3,z,W,H,D,hanok?'#f5efe3':'#f2e6cc');scene.splice(k0,1)}
  for(let dx of [-W/2,W/2])for(let dz of [-D/2,D/2])box(scene,x+dx,.3,z+dz,.18,H,.18,wood);
  box(scene,x,.3+H-.16,z+D/2+.02,W,.16,.06,wood);box(scene,x+W/2+.02,.3+H-.16,z,.06,.16,D,wood);
  box(scene,x,.3,z+D/2+.02,W,.14,.06,'#6b4a34');
  if(!hanok){box(scene,x,1.34,z+D/2+.02,W,.07,.05,wood);box(scene,x+W/2+.02,1.34,z,.05,.07,D,wood)}
  let fz=z+D/2+.04;
  let winF=wx=>{box(scene,wx,.89,fz+.02,1.08,.1,.16,'#8a5a3c');box(scene,wx,.95,fz,1.0,.82,.05,'#5e3d27');box(scene,wx,1.01,fz+.03,.84,.7,.03,'#9fd0e0');box(scene,wx-.2,1.01,fz+.045,.2,.7,.015,'#cde9f2');box(scene,wx,1.01,fz+.055,.05,.7,.02,'#5e3d27');box(scene,wx,1.34,fz+.055,.84,.05,.02,'#5e3d27')};
  let winS=wz=>{let sx=x+W/2+.04;box(scene,sx+.02,.89,wz,.16,.1,1.08,'#8a5a3c');box(scene,sx,.95,wz,.05,.82,1.0,'#5e3d27');box(scene,sx+.03,1.01,wz,.03,.7,.84,'#9fd0e0');box(scene,sx+.055,1.01,wz,.02,.7,.05,'#5e3d27');box(scene,sx+.055,1.34,wz,.02,.05,.84,'#5e3d27')};
  if(hanok){
    for(let dx of [-1.6,1.6]){
      box(scene,x+dx,.75,fz,1.2,1.1,.05,wood);box(scene,x+dx,.8,fz+.03,1.06,.98,.03,'#f7f0de');
      for(let k=1;k<4;k++)box(scene,x+dx-.53+k*.265,.8,fz+.05,.03,.98,.02,wood);
      for(let k=1;k<4;k++)box(scene,x+dx,.8+k*.245,fz+.05,1.06,.03,.02,wood);
    }
    for(let dx of [-2.45,-.8,.8,2.45])cyl(scene,x+dx,.3,z+D/2+.5,.1,.09,2.1,wood,6);
    box(scene,x,0,z+D/2+.95,2.4,.18,.6,'#bfb5a3');
  }else for(let dx of [-1.6,1.6])winF(x+dx);
  for(let dz of [-.75,.75])winS(z+dz);
  box(scene,x,.3,fz,1.0,1.6,.06,'#5e3d27');box(scene,x,.34,fz+.03,.84,1.48,.03,hanok?'#a06b45':'#8a5a3c');
  box(scene,x,.34,fz+.05,.04,1.48,.02,'#5e3d27');box(scene,x+.28,1.0,fz+.06,.06,.06,.03,'#f2c25a');
  let r0=scene.length;
  if(hanok){
    roofSeam(scene,x,.3+H,z,W+1.4,D+1.9,1.45,c,true);
    for(let sx of [-1,1])for(let sz of [-1,1])box(scene,x+sx*(W+1.4)/2,.3+H+.04,z+sz*(D+1.9)/2,.34,.2,.34,'#2c323a');
  }else roofSeam(scene,x,.3+H,z,W+.9,D+1.3,1.35,c,false);
  for(let k=r0;k<scene.length;k++)scene[k].bias=1.6;
  if(idx===1||idx===8){for(let j=0;j<7;j++)box(scene,x-2.1+j*.7,2.05,z+D/2+.65,.7,.12,1.1,j%2?c:'#fff1d0');for(let dx of [-2.3,2.3])box(scene,x+dx,.2,z+D/2+1.1,.09,1.9,.09,'#98795b')}
  if(s.kind==='story'){cyl(scene,x-2.6,0,z+2.6,.25,.18,2.2,'#b6a17c',7);box(scene,x-2.6,1.6,z+2.6,.65,.45,.12,'#f4d589')}
}
// 걸을 수 있는 곳: 장소 마당, 장소를 잇는 길, 평화 이야기 장소로 가는 흙길
function pathList(){return [
  [-9.5,11.7,27,11.7,.75],
  [-.7,9.4,-.7,11.2,.7],[8.6,9.4,8.6,11.2,.7],[17.4,9.4,17.4,11.2,.7],[24.2,10.2,24.2,11.2,.7],
  [-.7,12.3,-.7,13.5,.9],[8.6,12.3,8.6,13.3,.9],[17.4,12.3,17.4,13.3,.9],[24.2,12.3,24.2,13.3,.9],
  [13.5,-.4,13.5,6.6,.7],
  [-.5,-9.6,-.5,-18.2,.7],[-.5,-18.2,3.6,-18.2,.7],
  [20.5,-9.6,20.5,-14.8,.7]]}
function onPath(x,z,m){m=m||0;return pathList().some(p=>x>=Math.min(p[0],p[2])-p[4]-m&&x<=Math.max(p[0],p[2])+p[4]+m&&z>=Math.min(p[1],p[3])-p[4]-m&&z<=Math.max(p[1],p[3])+p[4]+m)}
function walkRects(){
  if(walkRects.c)return walkRects.c;
  let R=[[-10,6.45,-4,9.55]];
  stages.forEach((s,i)=>{R.push([s.x-2.45,s.z-2.35,s.x+2.45,s.z+2.35]);if(i){let a=stages[i-1];R.push([Math.min(a.x,s.x)-1.5,Math.min(a.z,s.z)-1.5,Math.max(a.x,s.x)+1.5,Math.max(a.z,s.z)+1.5])}});
  pathList().forEach(p=>R.push([Math.min(p[0],p[2])-p[4],Math.min(p[1],p[3])-p[4],Math.max(p[0],p[2])+p[4],Math.max(p[1],p[3])+p[4]]));
  return walkRects.c=R;
}
function canWalk(x,z){for(const r of walkRects())if(x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3])return true;return false}
// 길·장소·집 자리가 아닌 빈 땅인지
function freeSpot(x,z){
  if(onPath(x,z,.6))return false;
  if(x>-10.3&&x<-3.5&&z>6&&z<10)return false;
  for(let i=0;i<stages.length;i++){
    let s=stages[i];
    if(Math.abs(x-s.x)<3.2&&Math.abs(z-s.z)<3.2)return false;
    if(Math.abs(x-s.x)<3.4&&z<s.z-1.8&&z>s.z-6.8)return false;
    if(i){let a=stages[i-1];if(x>Math.min(a.x,s.x)-2.2&&x<Math.max(a.x,s.x)+2.2&&z>Math.min(a.z,s.z)-2.2&&z<Math.max(a.z,s.z)+2.2)return false}
  }
  return true;
}
// 넓은 땅 꾸미기: 잔디 얼룩, 덤불, 바깥 숲, 산맥
function buildLand(){
  const G=['#74b648','#86c658','#6dac44','#8ecb60','#79ba4c','#68a841'];
  for(let k=0;k<360;k++){let x=-10+rand()*40,z=-21+rand()*39;terrain.splice(1,0,{p:[[x,0,z],[x+1+rand()*2.6,0,z],[x+1+rand()*2.6,0,z+.8+rand()*2],[x,0,z+.8+rand()*2]].map(p=>[p[0],.004,p[2]]),c:shade(G[k%G.length],1)})}
  for(let k=0;k<60;k++){
    let x=-9.5+rand()*37,z=-20+rand()*40;
    if(!freeSpot(x,z)||inScenery(x,z))continue;
    blob(terrain,x+.15,z+.15,.6,.45,'#5d993d');
    cyl(scene,x,0,z,.5,.32,.48,'#3f8f45',7);cyl(scene,x+.25,.08,z+.2,.38,.2,.42,'#55a556',7);cyl(scene,x-.2,.05,z+.25,.3,.16,.34,'#4a9c4e',7);
  }
  for(let k=0;k<0;k++){
    let x=-34+rand()*92,z=-34+rand()*80;
    if(x>-10.6&&x<28&&z>-21.8&&z<20.8)continue;
    if(x>27.4&&x<34.6)continue;
    tree(x,z,2+rand()*1.8);
  }
  for(let k=0;k<0;k++){let x=-40+k*4.2,z=-31-rand()*3,h=5+rand()*5;cyl(scene,x,-.3,z,4,0,h,k%2?'#7d878c':'#8e989c',6);cyl(scene,x,-.3+h*.58,z,4*.42,0,h*.42,'#f3f6f8',6)}
  for(let k=0;k<0;k++){let z=-36+k*4.2,x=-31-rand()*3,h=5+rand()*5;cyl(scene,x,-.3,z,4,0,h,k%2?'#7d878c':'#8e989c',6);cyl(scene,x,-.3+h*.58,z,4*.42,0,h*.42,'#f3f6f8',6)}
  pathList().forEach(p=>{let w=Math.abs(p[2]-p[0])+p[4]*2,d=Math.abs(p[3]-p[1])+p[4]*2,cx2=(p[0]+p[2])/2,cz2=(p[1]+p[3])/2;flat(terrain,cx2,cz2,w+.2,d+.2,'#cfae78',.018);flat(terrain,cx2,cz2,w,d,'#e6cd9c',.022)});
}
// 사람: 신발, 다리(또는 치마), 셔츠와 깃, 소매와 손, 목, 얼굴(눈), 머리 모양(앞머리·긴 머리·올림머리·모자)
function npcModel(l,x,z,shirt,pants,hair,ph,s,v){
  s=s||.78;ph=ph||0;v=v==null?Math.floor(Math.abs(x*7.3+z*3.1)):v;v=Math.abs(v|0);
  let b=Math.abs(Math.sin(ph))*.05*s,st=Math.sin(ph)*.1*s,sk=['#f1c9a5','#e8b98f','#f3d2b4','#d9a47a'][v%4];
  if(v%4===1){box(l,x,0,z,.3*s,.34*s,.18*s,sk);cyl(l,x,.3*s+b,z,.3*s,.22*s,.32*s,pants,7)}
  else{box(l,x-.1*s,0,z+st,.16*s,.46*s,.2*s,pants);box(l,x+.1*s,0,z-st,.16*s,.46*s,.2*s,pants);box(l,x-.1*s,0,z+st+.04*s,.17*s,.09*s,.24*s,'#3a2c26');box(l,x+.1*s,0,z-st+.04*s,.17*s,.09*s,.24*s,'#3a2c26')}
  box(l,x,.44*s+b,z,.5*s,.54*s,.32*s,shirt);
  box(l,x,.9*s+b,z+.13*s,.22*s,.07*s,.08*s,v%3===0?'#ffffff':darken(shirt,.8));
  for(let sd of [-1,1])box(l,x+sd*.31*s,.5*s+b,z-sd*st*.8,.12*s,.46*s,.16*s,darken(shirt,.92));
  cyl(l,x,1.0*s+b,z,.25*s,.24*s,.34*s,sk,8);
  box(l,x-.08*s,1.14*s+b,z+.24*s,.045*s,.06*s,.02*s,'#2e2622');box(l,x+.08*s,1.14*s+b,z+.24*s,.045*s,.06*s,.02*s,'#2e2622');
  let hy=1.27*s+b;
  if(v%6===2){cyl(l,x,hy,z,.29*s,.26*s,.09*s,darken(shirt,.85),8);box(l,x,hy+.01*s,z+.26*s,.38*s,.04*s,.22*s,darken(shirt,.75))}
  else{
    cyl(l,x,hy,z,.27*s,.16*s,.13*s,hair,8);box(l,x,1.21*s+b,z+.2*s,.42*s,.1*s,.07*s,hair);box(l,x+.24*s,1.05*s+b,z,.05*s,.22*s,.36*s,hair);
    if(v%3===1)box(l,x,.88*s+b,z-.2*s,.44*s,.44*s,.1*s,hair);
  }
}
// 화면 밖 물체는 그리지 않기 (정적인 마을은 한 번만 정렬)
let sortedStatic=null;
function prepStatic(){
  for(const f of scene){let sx=0,sy=0,sz=0;for(const p of f.p){sx+=p[0];sy+=p[1];sz+=p[2]}let n=f.p.length;f.d=depth(f)+(f.bias||0);f.cx=sx/n;f.cy=sy/n;f.cz=sz/n}
  sortedStatic=scene.slice().sort((a,b)=>a.d-b.d);
}
function faceVisible(f){
  let a=f.cx-cx,b=f.cz-cz,sx=(a-b)*.866*scale,sy=(a+b)*.43*scale-f.cy*.94*scale;
  return Math.abs(sx)<width*.5+scale*7&&sy>-height*.52-scale*12&&sy<height*.48+scale*5;
}
function drawTerrain(){
  if(!terrain.prepped){for(const f of terrain){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of f.p){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[2]);z1=Math.max(z1,p[2])}f.cx=(x0+x1)/2;f.cz=(z0+z1)/2;f.cy=0;f.big=(x1-x0)>14||(z1-z0)>14}terrain.prepped=true}
  for(const f of terrain)if(f.big||faceVisible(f))drawFace(f);
}
function drawWorld(dynamic){
  if(!sortedStatic)prepStatic();
  for(const f of dynamic)f.d=depth(f);
  dynamic.sort((a,b)=>a.d-b.d);
  let j=0;
  for(const f of sortedStatic){while(j<dynamic.length&&dynamic[j].d<f.d)drawFace(dynamic[j++]);if(faceVisible(f))drawFace(f)}
  while(j<dynamic.length)drawFace(dynamic[j++]);
}

// ===== 구역별 추가 소품 (모두 함수 단위, 마을 생성 시 한 번 호출) =====
function koreaPts(){return [[.30,.28],[.42,.18],[.55,.10],[.66,.03],[.78,0],[.86,.06],[.80,.14],[.72,.20],[.66,.30],[.62,.38],[.66,.44],[.70,.52],[.76,.62],[.80,.74],[.80,.84],[.74,.92],[.62,.94],[.50,.95],[.40,.93],[.38,.84],[.42,.76],[.36,.68],[.40,.60],[.32,.54],[.24,.48],[.30,.42],[.22,.38]]}
// 한반도 모양 입체 조형물: 다각형을 두께만큼 밀어낸 형태
function koreaSculpture(l,x,y,z,h,t,c){
  let w=h*.62,P=koreaPts().map(([a,b])=>[x+(a-.5)*w,y+(1-b)*h]);
  face(l,P.map(([px2,py2])=>[px2,py2,z-t/2]),c,.78);
  for(let i=0;i<P.length;i++){let [x1,y1]=P[i],[x2,y2]=P[(i+1)%P.length];face(l,[[x1,y1,z-t/2],[x2,y2,z-t/2],[x2,y2,z+t/2],[x1,y1,z+t/2]],c,.86)}
  face(l,P.map(([px2,py2])=>[px2,py2,z+t/2]),c,1.08);
}
// 1번 구역 입구: '평화 통일' 환영 아치와 화단
function welcomeArch(S){
  let x=-6.8;
  for(let z of [6.35,9.65]){box(S,x,0,z,.5,.3,.5,'#cfc6b6');box(S,x,.3,z,.36,2.3,.36,'#f2e6cc');box(S,x,2.6,z,.46,.14,.46,'#7a4f33')}
  box(S,x,2.35,8,.32,.5,3.7,'#b8392a');box(S,x,2.85,8,.4,.12,3.9,'#7a4f33');
  for(let z of [5.4,10.6]){box(S,x,0,z,1.4,.2,.8,'#8a6a4a');for(let j=0;j<6;j++)cyl(S,x-.5+(j%3)*.5,.2,z-.2+Math.floor(j/3)*.4,.14,.05,.15,['#e86a7a','#f2c25a','#f39ac0','#ffffff','#e0785d','#b985ab'][j],5)}
}
// 2번 구역: 야외 테이블과 의자
function marketTables(S){
  [[1.6,6.4],[4.5,6.5]].forEach(([x,z],k)=>{
    cyl(S,x,0,z,.08,.08,.6,'#7a5233',5);cyl(S,x,.6,z,.5,.5,.07,'#f2e6cc',8);
    for(let a=0;a<4;a++){let ang=a*Math.PI/2+.4;box(S,x+Math.cos(ang)*.75,0,z+Math.sin(ang)*.75,.28,.32,.28,'#d9443a')}
    cyl(S,x-.15,.67,z,.12,.1,.06,'#f4e6c8',6);cyl(S,x+.18,.67,z+.1,.12,.1,.06,'#e8b04a',6);
  });
}
// 3번 구역: 분수 위 입체 한반도 조형물
function fountainSculpture(S){cyl(S,7.6,.95,9.8,.22,.2,.25,'#b7c8c4',8);koreaSculpture(S,7.6,1.2,9.8,1.7,.22,'#c3cbcf')}
// 4번 구역: 길가의 붉은 육상 트랙과 풍선 기둥
function roadsideTrack(T,S){
  flat(T,17,11.7,7,1.5,'#c8553d',.026);
  for(let k=0;k<3;k++)flat(T,17,11.15+k*.55,7,.05,'#f4e9da',.03);
  flat(T,13.6,11.7,.12,1.5,'#f4e9da',.03);flat(T,20.4,11.7,.12,1.5,'#f4e9da',.03);
  cyl(S,20.1,0,10.45,.05,.04,1,'#c8c2b6',4);
}
function buildExtras(){welcomeArch(scene);marketTables(scene);fountainSculpture(scene);roadsideTrack(terrain,scene)}

// ===== 마을 밖 그림 배경: 눈 덮인 바위산 + 초록 언덕 + 숲 실루엣 (화면에 그리는 평면 그림) =====
function bdRand(i,seed){let r=Math.sin(i*12.9898+seed*78.233)*43758.5453;return r-Math.floor(r)}
function bdPeaks(base,hMin,hMax,spacing,seed,cL,cR,snow,ox){
  let start=Math.floor((-ox)/spacing)-3,end=start+Math.ceil(width/spacing)+7;
  for(let i=start;i<end;i++){
    let r=bdRand(i,seed),x=i*spacing+ox+r*spacing*.35,h=hMin+(hMax-hMin)*r,w=spacing*(1.15+r*.45),y=base;
    ctx.fillStyle=cL;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x,y-h);ctx.lineTo(x+w*.1,y);ctx.closePath();ctx.fill();
    ctx.fillStyle=cR;ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w/2,y);ctx.lineTo(x+w*.1,y);ctx.closePath();ctx.fill();
    if(snow){
      let s=.34;
      ctx.fillStyle='#f4f7f9';ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x-w/2*s,y-h*(1-s));ctx.lineTo(x-w*.08,y-h*(1-s*.7));ctx.lineTo(x+w*.02,y-h*(1-s*.95));ctx.lineTo(x+w*.1*s+w*.05,y-h*(1-s*.75));ctx.lineTo(x+w/2*s,y-h*(1-s));ctx.closePath();ctx.fill();
      ctx.fillStyle='#d9e2e7';ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w/2*s,y-h*(1-s));ctx.lineTo(x+w*.1*s+w*.05,y-h*(1-s*.75));ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle='rgba(52,40,34,.3)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x,y-h);ctx.lineTo(x+w/2,y);ctx.stroke();
  }
}
function bdHill(base,amp,seed,col,ox){
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(-10,height+10);
  for(let x=-10;x<=width+10;x+=12){let X=x-ox;ctx.lineTo(x,base-amp*(.55+.3*Math.sin((X+seed*91)*.006)+.15*Math.sin((X+seed*37)*.019)))}
  ctx.lineTo(width+10,height+10);ctx.closePath();ctx.fill();
  return x=>{let X=x-ox;return base-amp*(.55+.3*Math.sin((X+seed*91)*.006)+.15*Math.sin((X+seed*37)*.019))};
}
function bdForest(top,spacing,seed,c1,c2,ox,size){
  let start=Math.floor((-ox)/spacing)-2,end=start+Math.ceil(width/spacing)+4;
  for(let i=start;i<end;i++){
    let r=bdRand(i,seed),x=i*spacing+ox+r*spacing*.6,y=top(x)+size*.35,h=size*(.8+r*.6),w=h*.55;
    ctx.fillStyle=c1;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x,y-h);ctx.lineTo(x,y);ctx.closePath();ctx.fill();
    ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w/2,y);ctx.lineTo(x,y);ctx.closePath();ctx.fill();
  }
}
function drawBackdrop(t){
  // 카메라를 따라 아주 조금씩 움직여 깊이감 (먼 산일수록 덜 움직임)
  let px0=(cx-cz)*scale;
  bdPeaks(height*.40,height*.16,height*.30,170,3,'#b4c1ca','#9aa8b2',true,-px0*.04);
  bdPeaks(height*.50,height*.18,height*.34,210,7,'#8f999e','#79848a',true,-px0*.08);
  let h1=bdHill(height*.56,height*.08,11,'#7fbd53',px0*.12);
  bdForest(h1,26,13,'#3f9c4a','#2f7d43',-px0*.12,height*.06);
  let h2=bdHill(height*.68,height*.09,17,'#6fb04a',px0*.18);
  bdForest(h2,22,19,'#378a45','#2b7340',-px0*.18,height*.07);
  bdHill(height*.82,height*.08,23,'#63a442',px0*.24);
}

// ===== 이번 여행에서 만난 북한 문화 (발표 마무리용 정리 화면) =====
function showSummary(){
  let a=[...state.album.values()];
  let sec=(cat,title)=>{let l=a.filter(o=>o.category===cat);return l.length?`<h3>${title} · ${l.length}개</h3><div class="sumlist">${l.map(o=>`<div><b>${o.n}</b>${o.d}</div>`).join('')}</div>`:''};
  show('이번 여행에서 만난 북한 문화','SUMMARY · '+a.length+'개 기록',`<p>말은 조금 달라도, 알고 보면 익숙한 것이 많았어요. 이번 여행에서 만난 문화를 정리했어요.</p>${sec('북한말','북한말과 남한말')}${sec('음식','음식')}${sec('명절·놀이','명절과 놀이')}${sec('관광','가 보고 싶은 곳')}${sec('평화','평화와 교류 이야기')}${a.length?'':'<div class="notice">이번 여행에서 기록한 문화가 없어요.</div>'}<div class="ending ${state.ending||''}"><b>지우와의 우정 · ${state.friend} (${friendTier()})</b><p>우리는 같은 설날에 윷을 던지고, 같은 냉면을 좋아합니다. 서로의 말과 음식, 명절을 알아 가는 것에서 통일은 시작됩니다.</p></div><div class="dialogfoot">${button('엔딩으로 돌아가기','showEnding()','secondary')}${button('다시 여행하기','restart()')}</div>`,'ending');
}

function restart(){state.i=0;state.album.clear();state.choice1=state.choice2=state.choice3=state.gift=state.ending=state.favorite=state.friendReply=state.crisisReply=null;stopFoodTimer();stopRun();state.friend=40;state.met=false;state.peace=new Set();wordSeen.clear();px=cx=-9.5;pz=cz=8;jx=-10.5;jz=8;bub=null;bubNext=0;auto=false;$('#count').textContent='0';closeModal();updateMission()}
$('#albumBtn').onclick=()=>showAlbum();$('#helpBtn').onclick=()=>showHelp();$('#resetBtn').onclick=()=>{show('새로운 여행을 시작할까요?','RESTART',`<p>이번 여행의 도감과 선택 기록은 초기화돼요. 발견한 엔딩은 브라우저가 저장을 허용하는 경우 유지됩니다.</p><div class="dialogfoot">${button('취소','closeModal()','secondary')}${button('처음부터','restart()')}</div>`,'help')};
updateMission();showTitle();requestAnimationFrame(tick);
