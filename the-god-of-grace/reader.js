(function(){
"use strict";
const toc=document.getElementById("gog-toc"),kicker=document.getElementById("gog-kicker"),
title=document.getElementById("gog-title"),body=document.getElementById("gog-body"),
pos=document.getElementById("gog-position"),prev=document.getElementById("gog-prev"),
next=document.getElementById("gog-next"),progress=document.getElementById("gog-progress-fill"),
sidebar=document.getElementById("gog-sidebar"),backdrop=document.getElementById("gog-backdrop"),
openBtn=document.getElementById("gog-toc-open"),closeBtn=document.getElementById("gog-sidebar-close"),
fontDown=document.getElementById("gog-font-down"),fontUp=document.getElementById("gog-font-up"),
themeBtn=document.getElementById("gog-theme");
const FONT_KEY="aos_gog_font_v1",THEME_KEY="aos_gog_theme_v1",
CHAPTER_KEY="aos_gog_chapter_v1",SCROLL_KEY="aos_gog_scroll_v1";
const sizes=[1,1.12,1.24,1.38];let fontIndex=Number(localStorage.getItem(FONT_KEY)||"1");
if(!Number.isFinite(fontIndex)||fontIndex<0||fontIndex>=sizes.length)fontIndex=1;
let current=0,hasShown=false,scrollTimer=null;
function savedScroll(){try{const r=localStorage.getItem(SCROLL_KEY);return r?JSON.parse(r):null}catch(e){return null}}
function saveScroll(){try{localStorage.setItem(SCROLL_KEY,JSON.stringify({index:current,scrollY:window.scrollY,updatedAt:Date.now()}))}catch(e){}}
function applyFont(){document.documentElement.style.setProperty("--gog-reader-size",sizes[fontIndex]+"rem");fontDown.disabled=fontIndex===0;fontUp.disabled=fontIndex===sizes.length-1}
function applyTheme(t){document.body.setAttribute("data-theme",t);themeBtn.textContent=t==="light"?"Dark mode":"Light mode";try{localStorage.setItem(THEME_KEY,t)}catch(e){}}
function buildToc(){toc.innerHTML="";BOOK.forEach((ch,i)=>{const b=document.createElement("button");b.type="button";b.innerHTML="<span>"+ch.kicker+"</span>"+ch.title;b.onclick=()=>{show(i);closeSidebar()};toc.appendChild(b)})}
function active(){[...toc.querySelectorAll("button")].forEach((b,i)=>b.classList.toggle("active",i===current))}
function show(i,scroll=true){if(i<0||i>=BOOK.length)return;if(hasShown)saveScroll();const first=!hasShown;current=i;const ch=BOOK[i];
kicker.textContent=ch.kicker;title.textContent=ch.title;body.innerHTML=ch.body;pos.textContent=(i+1)+" / "+BOOK.length;
prev.disabled=i===0;next.disabled=i===BOOK.length-1;document.title=ch.title+" | The God of Grace";
history.replaceState(null,"","#"+ch.slug);try{localStorage.setItem(CHAPTER_KEY,String(i))}catch(e){}active();
const s=first?savedScroll():null;if(s&&s.index===i&&typeof s.scrollY==="number")window.scrollTo(0,s.scrollY);
else if(scroll)window.scrollTo({top:0,behavior:"smooth"});hasShown=true;updateProgress()}
function initial(){const slug=(location.hash||"").slice(1),i=BOOK.findIndex(c=>c.slug===slug);if(i>=0)return i;const s=Number(localStorage.getItem(CHAPTER_KEY));return Number.isFinite(s)&&s>=0&&s<BOOK.length?s:2}
function updateProgress(){const r=body.getBoundingClientRect(),h=innerHeight,total=Math.max(r.height-h*.4,1),sc=Math.min(Math.max(-r.top,0),total);progress.style.width=Math.max(0,Math.min(100,sc/total*100))+"%"}
function openSidebar(){sidebar.classList.add("is-open");backdrop.classList.add("is-open")}
function closeSidebar(){sidebar.classList.remove("is-open");backdrop.classList.remove("is-open")}
prev.onclick=()=>show(current-1);next.onclick=()=>show(current+1);openBtn.onclick=openSidebar;closeBtn.onclick=closeSidebar;backdrop.onclick=closeSidebar;
fontDown.onclick=()=>{if(fontIndex>0){fontIndex--;applyFont();localStorage.setItem(FONT_KEY,String(fontIndex))}};
fontUp.onclick=()=>{if(fontIndex<sizes.length-1){fontIndex++;applyFont();localStorage.setItem(FONT_KEY,String(fontIndex))}};
themeBtn.onclick=()=>applyTheme(document.body.getAttribute("data-theme")==="light"?"dark":"light");
addEventListener("scroll",()=>{updateProgress();if(!scrollTimer)scrollTimer=setTimeout(()=>{saveScroll();scrollTimer=null},1500)},{passive:true});
addEventListener("beforeunload",saveScroll);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveScroll()});
addEventListener("hashchange",()=>{const i=BOOK.findIndex(c=>c.slug===location.hash.slice(1));if(i>=0)show(i,false)});
buildToc();applyFont();applyTheme(localStorage.getItem(THEME_KEY)||"light");show(initial(),false);
})();