(function(){
  "use strict";
  const toc=document.getElementById("gtf-toc");
  const kicker=document.getElementById("gtf-kicker");
  const title=document.getElementById("gtf-title");
  const body=document.getElementById("gtf-body");
  const pos=document.getElementById("gtf-position");
  const prev=document.getElementById("gtf-prev");
  const next=document.getElementById("gtf-next");
  const progress=document.getElementById("gtf-progress-fill");
  const sidebar=document.getElementById("gtf-sidebar");
  const backdrop=document.getElementById("gtf-backdrop");
  const openBtn=document.getElementById("gtf-toc-open");
  const closeBtn=document.getElementById("gtf-sidebar-close");
  const fontDown=document.getElementById("gtf-font-down");
  const fontUp=document.getElementById("gtf-font-up");
  const themeBtn=document.getElementById("gtf-theme");
  const FONT_KEY="aos_gtf_font_v1", THEME_KEY="aos_gtf_theme_v1", CHAPTER_KEY="aos_gtf_chapter_v1";
  const sizes=[1,1.12,1.24,1.38];
  let fontIndex=Number(localStorage.getItem(FONT_KEY)||"1");
  if(!Number.isFinite(fontIndex)||fontIndex<0||fontIndex>=sizes.length)fontIndex=1;
  let current=0;

  function applyFont(){
    document.documentElement.style.setProperty("--gtf-reader-size",sizes[fontIndex]+"rem");
    fontDown.disabled=fontIndex===0;fontUp.disabled=fontIndex===sizes.length-1;
  }
  function applyTheme(theme){
    document.body.setAttribute("data-theme",theme);
    themeBtn.textContent=theme==="light"?"Dark mode":"Light mode";
    try{localStorage.setItem(THEME_KEY,theme)}catch(e){}
  }
  function buildToc(){
    toc.innerHTML="";
    BOOK.forEach((ch,i)=>{
      const b=document.createElement("button");
      b.type="button";
      b.innerHTML="<span>"+ch.kicker+"</span>"+ch.title;
      b.addEventListener("click",()=>{show(i);closeSidebar()});
      toc.appendChild(b);
    });
  }
  function updateActive(){
    [...toc.querySelectorAll("button")].forEach((b,i)=>b.classList.toggle("active",i===current));
  }
  function show(i,scroll=true){
    if(i<0||i>=BOOK.length)return;
    current=i;const ch=BOOK[i];
    kicker.textContent=ch.kicker;title.textContent=ch.title;body.innerHTML=ch.body;
    pos.textContent=(i+1)+" / "+BOOK.length;
    prev.disabled=i===0;next.disabled=i===BOOK.length-1;
    document.title=ch.title+" | The Assembly of Sons";
    history.replaceState(null,"","#"+ch.slug);
    try{localStorage.setItem(CHAPTER_KEY,String(i))}catch(e){}
    updateActive();
    if(scroll)window.scrollTo({top:0,behavior:"smooth"});
    updateProgress();
  }
  function initial(){
    const slug=(location.hash||"").replace("#","");
    const byHash=BOOK.findIndex(c=>c.slug===slug);
    if(byHash>=0)return byHash;
    const saved=Number(localStorage.getItem(CHAPTER_KEY));
    return Number.isFinite(saved)&&saved>=0&&saved<BOOK.length?saved:1;
  }
  function updateProgress(){
    const r=body.getBoundingClientRect(),h=window.innerHeight;
    const total=Math.max(r.height-h*.4,1),scrolled=Math.min(Math.max(-r.top,0),total);
    progress.style.width=Math.max(0,Math.min(100,scrolled/total*100))+"%";
  }
  function openSidebar(){sidebar.classList.add("is-open");backdrop.classList.add("is-open")}
  function closeSidebar(){sidebar.classList.remove("is-open");backdrop.classList.remove("is-open")}
  prev.addEventListener("click",()=>show(current-1));next.addEventListener("click",()=>show(current+1));
  openBtn.addEventListener("click",openSidebar);closeBtn.addEventListener("click",closeSidebar);backdrop.addEventListener("click",closeSidebar);
  fontDown.addEventListener("click",()=>{if(fontIndex>0){fontIndex--;applyFont();localStorage.setItem(FONT_KEY,String(fontIndex))}});
  fontUp.addEventListener("click",()=>{if(fontIndex<sizes.length-1){fontIndex++;applyFont();localStorage.setItem(FONT_KEY,String(fontIndex))}});
  themeBtn.addEventListener("click",()=>applyTheme(document.body.getAttribute("data-theme")==="light"?"dark":"light"));
  window.addEventListener("scroll",updateProgress,{passive:true});
  window.addEventListener("hashchange",()=>{const i=BOOK.findIndex(c=>c.slug===location.hash.slice(1));if(i>=0)show(i,false)});
  buildToc();applyFont();applyTheme(localStorage.getItem(THEME_KEY)||"dark");show(initial(),false);
})();
