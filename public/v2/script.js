(function(){
"use strict";
var doc=document.documentElement, body=document.body;
var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var RTL=doc.dir==='rtl';
/* theme */
var tbtn=document.querySelector('.theme-toggle');
if(tbtn){tbtn.addEventListener('click',function(){var n=doc.getAttribute('data-theme')==='light'?'dark':'light';doc.setAttribute('data-theme',n);try{localStorage.setItem('ordel-theme',n)}catch(e){}});}
/* menu */
var mbtn=document.querySelector('.menu-toggle');
function closeMenu(){body.classList.remove('menu-open');if(mbtn)mbtn.setAttribute('aria-expanded','false')}
if(mbtn){mbtn.addEventListener('click',function(){var o=body.classList.toggle('menu-open');mbtn.setAttribute('aria-expanded',o?'true':'false')});
  document.querySelectorAll('.nav-links a').forEach(function(a){a.addEventListener('click',closeMenu)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});}
/* header + timeline + active nav on scroll */
var head=document.querySelector('.site-head'), tl=document.querySelector('.timeline'), fill=document.querySelector('.tl-fill');
var secs=[].slice.call(document.querySelectorAll('main section[id]')), links={};
document.querySelectorAll('.nav-links a').forEach(function(a){links[a.getAttribute('href').slice(1)]=a});
var ticking=false;
function onScroll(){ticking=false;var y=window.scrollY;head.classList.toggle('scrolled',y>20);
  if(tl&&fill){var r=tl.getBoundingClientRect(),vh=window.innerHeight;var p=Math.min(1,Math.max(0,(vh*0.65-r.top)/r.height));fill.style.setProperty('--tl',(p*100).toFixed(1)+'%');}
  var cur=null;secs.forEach(function(s){if(s.getBoundingClientRect().top<window.innerHeight*0.4)cur=s.id});
  Object.keys(links).forEach(function(k){links[k].classList.toggle('active',k===cur)});}
window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});onScroll();
/* reveal */
var counted=new WeakSet();
function countUp(el){if(counted.has(el))return;counted.add(el);var to=parseFloat(el.getAttribute('data-to'));if(RM){el.textContent=to;return}var t0=null,d=1400;el.textContent='0';
  function step(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/d);var v=Math.round(to*(1-Math.pow(1-p,3)));el.textContent=v;if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');var c=en.target.querySelectorAll('.count');c.forEach(countUp);io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:0.08});
  document.querySelectorAll('.reveal,.job').forEach(function(el){io.observe(el)});
}else{document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in')})}
/* pointer effects */
var fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
if(fine&&!RM){
  document.querySelectorAll('.glow').forEach(function(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();el.style.setProperty('--gx',(e.clientX-r.left)+'px');el.style.setProperty('--gy',(e.clientY-r.top)+'px')})});
  document.querySelectorAll('.magnetic').forEach(function(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();el.style.setProperty('--mx',((e.clientX-r.left-r.width/2)*0.18)+'px');el.style.setProperty('--my',((e.clientY-r.top-r.height/2)*0.3)+'px')});el.addEventListener('pointerleave',function(){el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')})});
  document.querySelectorAll('.tilt').forEach(function(el){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();var x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform='perspective(1200px) rotateX('+(-y*4).toFixed(2)+'deg) rotateY('+(x*5).toFixed(2)+'deg) translateY(-4px)'});el.addEventListener('pointerleave',function(){el.style.transform=''})});
}
/* LeadFlow screens */
var tabs=[].slice.call(document.querySelectorAll('.tab')), screens=[].slice.call(document.querySelectorAll('.screen')), ti=0, timer=null;
function show(i){ti=i;tabs.forEach(function(t,j){var on=j===i;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false')});var k=tabs[i].getAttribute('data-screen');screens.forEach(function(s){s.classList.toggle('on',s.getAttribute('data-screen')===k)})}
function auto(){clearInterval(timer);if(!RM)timer=setInterval(function(){show((ti+1)%tabs.length)},3800)}
tabs.forEach(function(t,i){t.addEventListener('click',function(){show(i);auto()})});
var lv=document.querySelector('.lf-visual');
if(lv&&'IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting)auto();else clearInterval(timer)})}).observe(lv)}
/* Agent Office loop: fetched only near the viewport, paused off-screen, poster only for reduced motion / data saver */
var aoBox=document.querySelector('[data-ao]');
if(aoBox){
  var aov=aoBox.querySelector('video'), aob=aoBox.querySelector('.ao-toggle'), aoLoaded=false, aoHeld=false, aoNear=false;
  var aoRM=window.matchMedia('(prefers-reduced-motion: reduce)'), aoSave=!!(navigator.connection&&navigator.connection.saveData);
  var aoLabel=function(){var p=aov.paused;aoBox.classList.toggle('is-paused',p);aob.setAttribute('aria-label',p?aob.getAttribute('data-play'):aob.getAttribute('data-pause'))};
  var aoLoad=function(){if(aoLoaded)return;aoLoaded=true;
    [['webm','video/webm; codecs="vp9"'],['mp4','video/mp4']].forEach(function(f){var s=document.createElement('source');s.src=aov.getAttribute('data-'+f[0]);s.type=f[1];aov.appendChild(s)});aov.load()};
  var aoPlay=function(){aoLoad();var p=aov.play();if(p&&p.catch)p.catch(function(){})};
  if(aoRM.matches||aoSave){aoHeld=true;aov.removeAttribute('autoplay')}
  aov.addEventListener('play',aoLabel);aov.addEventListener('pause',aoLabel);aoLabel();
  aob.addEventListener('click',function(){if(aov.paused){aoHeld=false;aoPlay()}else{aoHeld=true;aov.pause()}});
  var aoSync=function(){if(aoNear&&!aoHeld&&!document.hidden)aoPlay();else if(!aov.paused)aov.pause()};
  if('IntersectionObserver' in window){new IntersectionObserver(function(es){aoNear=es[es.length-1].isIntersecting;aoSync()},{rootMargin:'160px 0px'}).observe(aoBox)}
  document.addEventListener('visibilitychange',aoSync);
  if(aoRM.addEventListener)aoRM.addEventListener('change',function(e){if(e.matches){aoHeld=true;aov.pause()}});
}
/* hero particles (three.js), loaded after first paint */
var heroBase=(document.currentScript&&document.currentScript.src)||location.href;
function loadHero(){if(!document.querySelector('.hero-gl'))return;var lite=matchMedia('(max-width:760px), (pointer:coarse)').matches||(navigator.connection&&navigator.connection.saveData);if(lite){document.querySelector('.hero').classList.add('no-gl');return}try{import(new URL('hero.js',heroBase).href).catch(function(){document.querySelector('.hero').classList.add('no-gl')})}catch(e){document.querySelector('.hero').classList.add('no-gl')}}
function whenIdle(fn){if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:1200});else setTimeout(fn,200)}
if(document.readyState==='complete')whenIdle(loadHero);else window.addEventListener('load',function(){whenIdle(loadHero)});
})();
