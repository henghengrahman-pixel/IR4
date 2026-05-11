(function(){
  const y=document.getElementById("y"); if(y) y.textContent = new Date().getFullYear();
  document.querySelectorAll('[data-slider]').forEach(slider=>{
    const track=slider.querySelector('[data-slider-track]'); if(!track) return;
    let slides=[...track.children]; if(slides.length<2) return;
    const prev=slider.querySelector('[data-slider-prev]'), next=slider.querySelector('[data-slider-next]'), dots=slider.querySelector('[data-slider-dots]');
    let i=0, startX=0, dx=0, timer=null;
    const drawDots=()=>{ if(!dots) return; dots.innerHTML=slides.map((_,n)=>`<button aria-label="Slide ${n+1}" class="${n===i?'on':''}"></button>`).join(''); [...dots.children].forEach((b,n)=>b.onclick=()=>go(n)); };
    const go=n=>{ i=(n+slides.length)%slides.length; track.style.transform=`translateX(${-i*100}%)`; drawDots(); };
    const play=()=>{ stop(); timer=setInterval(()=>go(i+1),4500); }; const stop=()=>timer&&clearInterval(timer);
    prev&&prev.addEventListener('click',()=>{go(i-1);play();}); next&&next.addEventListener('click',()=>{go(i+1);play();});
    slider.addEventListener('pointerdown',e=>{startX=e.clientX;dx=0;stop();}); slider.addEventListener('pointermove',e=>{dx=e.clientX-startX;}); slider.addEventListener('pointerup',()=>{ if(Math.abs(dx)>45) go(i+(dx<0?1:-1)); play(); });
    drawDots(); play();
  });
  const fab=document.getElementById('mcFab'), sheet=document.getElementById('mcSheet'), closeBtn=document.getElementById('mcClose');
  if(fab&&sheet){ const open=()=>{sheet.classList.add('show');fab.setAttribute('aria-expanded','true');sheet.setAttribute('aria-hidden','false')}; const close=()=>{sheet.classList.remove('show');fab.setAttribute('aria-expanded','false');sheet.setAttribute('aria-hidden','true')}; fab.addEventListener('click',()=>sheet.classList.contains('show')?close():open()); closeBtn&&closeBtn.addEventListener('click',close); sheet.querySelectorAll('a').forEach(a=>a.addEventListener('click',close)); document.addEventListener('keydown',e=>{if(e.key==='Escape')close()}); }
})();
