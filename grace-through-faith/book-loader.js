(async function(){
  try {
    const b64=window.GTF_BOOK_B64||"";
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if(typeof DecompressionStream!=="function") throw new Error("DecompressionStream unavailable");
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const text=await new Response(stream).text();
    window.BOOK=JSON.parse(text);
    const s=document.createElement("script");
    s.src="/grace-through-faith/reader.js?v=2";
    document.body.appendChild(s);
  } catch(e) {
    const body=document.getElementById("gtf-body");
    if(body) body.innerHTML='<p>We could not load the book reader. Please refresh the page and try again.</p>';
    console.error("Grace Through Faith reader data error",e);
  }
})();
