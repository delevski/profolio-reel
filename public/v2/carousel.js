/* Work coverflow — progressive enhancement of the project grid. */
(function(){
  'use strict';
  var root=document.querySelector('[data-wcar]');
  if(!root)return;
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches)return;
  var stage=root.querySelector('.wcar-stage'), grid=root.querySelector('.proj-grid');
  var cards=Array.prototype.slice.call(grid.querySelectorAll('.proj'));
  if(cards.length<2)return;
  var rtl=document.documentElement.dir==='rtl', len=cards.length, index=0, timer=null;
  var hovering=false, focusing=false, dragging=false, userPaused=false, inView=false, coolUntil=0;
  var control=root.querySelector('.wcar-ctrl'), toggle=root.querySelector('.wcar-toggle');
  var dots=root.querySelector('.wcar-dots'), format=root.dataset.slide;
  var imageLinks=cards.map(function(card){return card.querySelector('.pimg')});
  var dotsEls=cards.map(function(){var d=document.createElement('i');dots.appendChild(d);return d});
  var resizeObserver;
  function delta(i){var n=(i-index+len)%len;return n>len/2?n-len:n}
  var lastH=0,lastW=0,mq=0;
  function measure(){
    /* Tallest card sets one constant stage height; only rewritten when it really changes, so the page never jumps. */
    var max=0;cards.forEach(function(c){max=Math.max(max,c.scrollHeight)});
    max=Math.ceil(max);
    if(Math.abs(max-lastH)>2){lastH=max;grid.style.setProperty('--ch',max+'px')}
    paint();
  }
  function queueMeasure(){if(mq)return;mq=requestAnimationFrame(function(){mq=0;measure()})}
  var lastSide=cards.map(function(){return 0});
  function paint(){
    var w=cards[0].getBoundingClientRect().width || 520;
    var compact=window.innerWidth<641;
    var side=compact?w*.8:w*.72;
    cards.forEach(function(card,i){
      var d=delta(i),dist=Math.abs(d),sign=Math.sign(d)*(rtl?-1:1);
      var far=dist>2, dd=Math.min(dist,3);
      /* A far card that wraps to the other side jumps there hidden, with no flight across the stage. */
      var jump=far&&lastSide[i]!==0&&sign!==lastSide[i];
      lastSide[i]=sign;
      card.classList.toggle('is-far',far);
      card.style.transition=jump?'none':'';
      var x=dd===0?0:sign*side*(dd===1?1:dd===2?1.72:2.25);
      var z=dd===0?0:dd===1?-195:dd===2?-410:-560;
      var scale=dd===0?1:dd===1?.83:dd===2?.66:.51;
      card.style.transform='translate3d('+x.toFixed(1)+'px,0,'+z+'px) rotateY('+(-sign*(dd===1?43:dd===2?54:62))+'deg) scale('+scale+')';
      card.style.opacity=far?'0':'1';
      card.style.pointerEvents=far?'none':'';
      card.style.setProperty('--shade',dist===0?'0':dist===1?'.22':'.42');
      card.style.zIndex=String(10-dist);
      card.classList.toggle('is-center',dist===0);
      card.setAttribute('aria-hidden',dist===0?'false':'true');
      imageLinks[i].tabIndex=dist===0?0:-1;
      imageLinks[i].setAttribute('aria-hidden',dist===0?'false':'true');
      card.querySelectorAll('.pbody a').forEach(function(a){a.tabIndex=dist===0?0:-1});
      dotsEls[i].classList.toggle('on',dist===0);
    });
    root.setAttribute('aria-label',root.dataset.label+' — '+format.replace('{n}',index+1).replace('{t}',len)+': '+cards[index].querySelector('h3').textContent);
  }
  var scrollingUntil=0;window.addEventListener('scroll',function(){scrollingUntil=Date.now()+700},{passive:true});
  function canRun(){return inView&&!document.hidden&&!hovering&&!focusing&&!dragging&&!userPaused}
  function schedule(){
    clearTimeout(timer);timer=null;
    if(!canRun())return;
    timer=setTimeout(function(){if(!canRun())return;var wait=Math.max(coolUntil,scrollingUntil)-Date.now();if(wait>0){schedule();return}select(index+1,false);schedule()},4800);
  }
  function select(n,manual){
    index=(n%len+len)%len;
    paint();
    if(manual){coolUntil=Date.now()+7000;schedule()}
  }
  root.classList.add('wcar-on');
  root.setAttribute('role','region');
  root.setAttribute('aria-roledescription','carousel');
  stage.tabIndex=0;
  control.hidden=false;
  /* Initial height must be measured before absolutely positioning the cards. */
  grid.style.setProperty('--ch','0px');
  /* Load every card image up front (they are small) so none pops in and changes height mid-rotation. */
  function eagerAll(){cards.forEach(function(c){var im=c.querySelector('img');if(im){im.loading='eager';if(!im.complete)im.addEventListener('load',queueMeasure,{once:true})}})}
  /* ...but only once the carousel is near the viewport, so they don't compete with the first screen on mobile. */
  if('IntersectionObserver' in window){var eio=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting})){eio.disconnect();eagerAll()}},{rootMargin:'900px 0px'});eio.observe(root)}else eagerAll();
  requestAnimationFrame(measure);
  /* Only a width change re-measures: the mobile address bar showing/hiding on scroll changes height only. */
  if('ResizeObserver' in window){resizeObserver=new ResizeObserver(function(en){var w=Math.round(en[0].contentRect.width);if(w!==lastW){lastW=w;queueMeasure()}});resizeObserver.observe(stage)}
  else window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('load',measure,{once:true});
  cards.forEach(function(card,i){
    card.addEventListener('click',function(e){
      if(dragging||Date.now()<suppressClickUntil){e.preventDefault();return}
      if(i!==index){e.preventDefault();select(i,true);stage.focus({preventScroll:true})}
    });
    card.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&i!==index){e.preventDefault();select(i,true)}});
  });
  root.querySelector('.wcar-prev').addEventListener('click',function(){select(index-1,true)});
  root.querySelector('.wcar-next').addEventListener('click',function(){select(index+1,true)});
  toggle.addEventListener('click',function(){userPaused=!userPaused;toggle.setAttribute('aria-pressed',String(userPaused));toggle.setAttribute('aria-label',root.dataset[userPaused?'play':'pause']);schedule()});
  root.addEventListener('keydown',function(e){
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    if(e.target.closest('.wcar-ctrl'))return; /* Control buttons own their focus. */
    e.preventDefault();select(index+(e.key==='ArrowRight'?(rtl?-1:1):(rtl?1:-1)),true)
  });
  root.addEventListener('mouseenter',function(){hovering=true;schedule()});
  root.addEventListener('mouseleave',function(){hovering=false;schedule()});
  root.addEventListener('focusin',function(){focusing=true;schedule()});
  root.addEventListener('focusout',function(){setTimeout(function(){focusing=root.contains(document.activeElement);schedule()},0)});
  var startX=0,startY=0, pointerId=null,moved=false,suppressClickUntil=0;
  stage.addEventListener('pointerdown',function(e){
    if(e.button!==0||e.target.closest('button'))return;
    pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;moved=false;
    dragging=true;schedule();
  });
  stage.addEventListener('pointermove',function(e){
    if(e.pointerId!==pointerId)return;
    if(Math.abs(e.clientX-startX)>10&&Math.abs(e.clientX-startX)>Math.abs(e.clientY-startY)){
      moved=true;stage.classList.add('dragging');if(e.pointerType==='mouse'&&!stage.hasPointerCapture(e.pointerId))stage.setPointerCapture(e.pointerId)
    }
  });
  function finishDrag(e){
    if(e.pointerId!==pointerId)return;
    var dx=e.clientX-startX,dy=e.clientY-startY;
    if(moved&&Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)){
      suppressClickUntil=Date.now()+350;
      select(index+(dx<0?1:-1)*(rtl?-1:1),true)
    }
    pointerId=null;dragging=false;stage.classList.remove('dragging');schedule()
  }
  stage.addEventListener('pointerup',finishDrag);
  stage.addEventListener('pointercancel',finishDrag);
  document.addEventListener('visibilitychange',schedule);
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){inView=entries[0].isIntersecting;schedule()},{threshold:.1}).observe(root);
  }else{inView=true;schedule()}
  reduced.addEventListener('change',function(){location.reload()});
})();
