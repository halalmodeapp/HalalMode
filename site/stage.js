/* Halftone-dots photo stage. One image, one dot lattice. Swiping / dragging /
   arrow keys move between shader "looks" (round <-> square dots, square <-> hex stagger). Nothing warps: sizes only step on a fixed nested grid. */
(function(){
  var IMG='/img/hero.webp';
  var hex=function(h){return [parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]};
  /* back, front, size (dot pitch multiplier), radius, contrast, inverted, stagger (0 square .. 1 hex) */
  var LOOKS=[{shape:0,stag:0}];
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas=document.getElementById('gl'),stage=document.getElementById('stage');
  var gl=canvas.getContext('webgl',{antialias:false,alpha:false});
  var dotsEl=document.getElementById('dots'),hint=document.querySelector('.hint');
  var cur=0;
  LOOKS.forEach(function(s,i){
    var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Look '+(i+1));b.appendChild(document.createElement('i'));
    b.onclick=function(){goTo(i)};dotsEl.appendChild(b);
  });
  function paintDots(){[].forEach.call(dotsEl.children,function(b,i){b.classList.toggle('on',i===cur)})}
  paintDots();
  dotsEl.style.display='none';if(hint)hint.style.display='none';
  function fail(){dotsEl.style.display='none';if(hint)hint.style.display='none'}
  if(!gl)return fail();
  canvas.style.opacity='0';setTimeout(function(){canvas.style.opacity='1'},4500);

  var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS=[
  'precision highp float;',
  'uniform sampler2D uT;uniform vec2 uRes,uImg,uFoc,uMouse;',
  'uniform float uP,uDir,uTime,uAmt,uCell,uZoom,uSize,uWide,uEdge;',
  '',
  'uniform vec4 uA,uB;',            /* radius, contrast, inv, stagger */
  'vec2 cover(vec2 uv){float ra=uRes.x/uRes.y,ri=uImg.x/uImg.y;vec2 s=ra>ri?vec2(1.,ri/ra):vec2(ra/ri,1.);s/=uZoom;return uv*s+(1.-s)*uFoc;}',
  'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
  'float maskAt(vec2 uv){float pos=uDir>0.?uv.x:1.-uv.x;float front=uP*1.6-.3;return smoothstep(0.,.3,front-pos+(noise(uv*vec2(5.,9.))-.5)*.35);}',
  'float bandAt(vec2 uv){float m=maskAt(uv);return m*(1.-m)*4.;}',
  'float fieldAt(vec2 px){',
  '  float d=distance(px,uMouse*uRes);',
  '  float f=uAmt*exp(-pow(d/(.29*uRes.y+40.),2.));',
  '  return f*(.7+.6*noise(px/(uRes.y*.22)+uTime*.15));}',
  'float washAt(vec2 uv){',
  '  if(uWide>.5){',
  '    vec2 q=vec2(uv.x/(uEdge+.04),(uv.y-.5)/.82);',
  '    return .985*(1.-smoothstep(.85,1.32,length(q)));',
  '  }',
  '  float v=1.-uv.y;',
  '  return .985*smoothstep(.35,.52,v);}',
  'void main(){',
  '  vec2 p=gl_FragCoord.xy;',
  /* ambient, gentle grid noise */
  '  vec2 nz=vec2(noise(p*.007+uTime*.12),noise(p*.007+31.7-uTime*.1))-.5;',
  '  vec2 nf=vec2(noise(p*.03-uTime*.2),noise(p*.03+9.1+uTime*.17))-.5;',
  '  float cell=uCell*uSize;',
  '  p+=nz*cell*.75+nf*cell*.26;',
  '  float ca=0.;mat2 R=mat2(cos(ca),-sin(ca),sin(ca),cos(ca));',
  /* size level: large by default, finer where the pointer or the wipe passes */
  '  float use=cell*2.;',
  '  vec2 q0=R*p/use;vec2 g0=floor(q0)+.5;',
  '  vec2 c0=(g0*use)*R;',
  '  float f=fieldAt(c0)+bandAt(c0/uRes);',
  '  if(f>.28+.34*hash(g0*3.1)){use=cell;}',
  '  vec2 q=R*p/use;',
  '  float stag=mix(uA.w,uB.w,maskAt(p/uRes));',
  '  float row=floor(q.y);',
  '  q.x+=stag*.5*mod(row,2.);',
  '  vec2 g=floor(q)+.5;',
  '  vec2 gc=vec2(g.x-stag*.5*mod(row,2.),g.y);',
  '  vec2 cuv=clamp(((gc*use)*R)/uRes,0.,1.);',
  '  float m=maskAt(cuv);',
  '  float shape=mix(uA.x,uB.x,m);',
  '  vec3 rgb=texture2D(uT,cover(cuv)).rgb;',
  '  float wash=washAt(cuv);',
  '  float L=dot(rgb,vec3(.299,.587,.114));',
  '  L=clamp((L-.2)*1.2,0.,1.);',
  '  float Lc=pow(clamp(L,0.,1.),1.8);',
  '  float sL=sqrt(Lc);',
  '  float fld=clamp(fieldAt(cuv*uRes)*1.8,0.,1.);',
  '  float rad=mix(mix(mix(.27,.44,sL),mix(.1,.64,sL),fld),.95,pow(wash,1.15));',
  '  float edge=wash*(1.-wash)*4.;',
  '  rad+=edge*.16*(noise(cuv*vec2(16.,10.)+vec2(uTime*.3,-uTime*.22))+.5*noise(cuv*vec2(38.,24.)-uTime*.45)-.75);',
  '  float wv=sin(dot(cuv,vec2(5.2,2.1))*6.2831-uTime*.55)*.5+sin(dot(cuv,vec2(-2.4,4.6))*6.2831+uTime*.38)*.35+(noise(cuv*vec2(7.,5.)+uTime*.12)-.5)*.9;',
  '  rad+=.045*wv*(1.-wash);',
  '  rad*=mix(1.,.72,shape);',
  '  float aa=1.1/use;',
  '  vec2 dd=abs(q-g);float nn=mix(2.,9.,shape);',
  '  float e=pow(pow(dd.x,nn)+pow(dd.y,nn),1./nn);',
  '  float cov=smoothstep(rad+aa,rad-aa,e);',
  '  vec3 GOLD=vec3(.88,.74,.46),PINK=vec3(.54,.4,.17),PAPER=vec3(.988,.988,.984);',
  '  vec3 front=mix(mix(GOLD,PINK,smoothstep(.25,.6,1.-L)),vec3(.36,.27,.12),fld*.6);',
  '  vec3 col=mix(front,PAPER,cov);',
  '  col*=1.+(hash(gl_FragCoord.xy+fract(uTime*.7)*61.)-.5)*.06;',
  '  gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(o));return null}return o}
  var vs=sh(gl.VERTEX_SHADER,VS),fs=sh(gl.FRAGMENT_SHADER,FS);
  if(!vs||!fs)return fail();
  var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return fail();
  gl.useProgram(pr);
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  var U={};['uT','uRes','uImg','uFoc','uMouse','uP','uDir','uTime','uAmt','uCell','uZoom','uSize','uWide','uEdge','uA','uB'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n)});

  var tex=null,imgW=1,imgH=1;
  var img=new Image();
  img.onload=function(){
    tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    imgW=img.naturalWidth;imgH=img.naturalHeight;
    requestAnimationFrame(frame);
  };
  img.src=IMG;

  var W=1,H=1,dpr=1;
  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=Math.max(1,Math.round(innerWidth*dpr));H=Math.max(1,Math.round(innerHeight*dpr));
    canvas.width=W;canvas.height=H;gl.viewport(0,0,W,H);
  }
  addEventListener('resize',resize);resize();

  var nxt=0,dir=1,p=0,anim=null,drag=null,auto=null;
  var mouse={x:.7,y:.5,tx:.7,ty:.5,amt:0,tamt:1};
  var active=false,idleT=0;
  /* Resting point: midway between the two faces (image x .76, y .30 from top),
     mapped through the same cover/zoom crop the shader uses. */
  function rest(){
    var ra=W/H,ri=imgW/imgH,wide=ra>1.2;
    var sx=ra>ri?1:ra/ri,sy=ra>ri?ri/ra:1,z=wide?1:1;
    sx/=z;sy/=z;
    var fx=wide?.0:.9,fy=wide?.9:.9;
    var ix=.76,iy=.70;
    return [Math.min(.98,Math.max(.02,(ix-(1-sx)*fx)/sx)),Math.min(.98,Math.max(.02,(iy-(1-sy)*fy)/sy))];
  }
  function goRest(){active=false}
  function startAnim(target,onDone){
    var from=p,t0=performance.now(),dur=reduce?1:(1000*Math.abs(target-from)+250);
    anim=function(now){
      var k=Math.min(1,(now-t0)/dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      p=from+(target-from)*e;
      if(k>=1){anim=null;onDone&&onDone()}
    };
  }
  function commit(){cur=nxt;p=0;paintDots();schedule()}
  function goTo(i,d){
    if(anim||drag)return;
    var n=(i+LOOKS.length)%LOOKS.length;if(n===cur)return;
    nxt=n;dir=d||(i>=cur?1:-1);p=0;startAnim(1,commit);
  }
  function step(d){goTo(cur+d,d)}
  function schedule(){clearTimeout(auto);if(reduce)return;auto=setTimeout(function(){if(!document.hidden&&!drag)step(1);else schedule()},8000)}
  schedule();

  function isUI(el){return el&&el.closest&&el.closest('form,a,button,input,select,.store,.below,#dots')}
  addEventListener('pointermove',function(e){
    mouse.tx=e.clientX/innerWidth;mouse.ty=1-e.clientY/innerHeight;mouse.tamt=1;active=true;clearTimeout(idleT);idleT=setTimeout(goRest,2600);
    if(!drag)return;
    var dx=e.clientX-drag.x;
    if(!drag.on&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(e.clientY-drag.y))drag.on=true;
    if(!drag.on)return;
    var d=dx<0?1:-1;
    if(d!==dir||!drag.init){dir=d;nxt=(cur+d+LOOKS.length)%LOOKS.length;drag.init=true}
    p=Math.min(1,Math.abs(dx)/(innerWidth*.55));
  });
  document.addEventListener('mouseleave',function(){clearTimeout(idleT);idleT=setTimeout(goRest,400)});
  addEventListener('pointerdown',function(e){
    return;
    drag={x:e.clientX,y:e.clientY,on:false,init:false};clearTimeout(auto);
  });
  function release(){
    if(!drag)return;var d=drag;drag=null;
    if(d.on&&d.init){
      if(p>.25)startAnim(1,commit);else startAnim(0,function(){p=0;schedule()});
    }else schedule();
  }
  addEventListener('pointerup',release);addEventListener('pointercancel',release);
  var wheelAcc=0,wheelT=0;
  addEventListener('wheel',function(e){
    if(scrollY>10||anim||drag)return;
    var dx=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:0;
    if(!dx)return;
    wheelAcc+=dx;clearTimeout(wheelT);wheelT=setTimeout(function(){wheelAcc=0},180);
    if(Math.abs(wheelAcc)>60){step(wheelAcc>0?1:-1);wheelAcc=0}
  },{passive:true});
  addEventListener('keydown',function(e){
    if(/input|select|textarea/i.test(e.target.tagName))return;
    if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);
  });

  function edge(){var c=document.querySelector('.hero');var f=c&&c.firstElementChild;if(!f)return .4;var r=f.getBoundingClientRect().right;return Math.min(.62,Math.max(.2,(r+36)/innerWidth))}
  var shown=false;
  var t0=performance.now();
  var photoOn=true;
  window.halalPhoto={set:function(v){photoOn=!!v;canvas.style.display=v?'block':'none'}};
  function frame(now){
    if(!photoOn){requestAnimationFrame(frame);return}
    if(anim)anim(now);
    if(!active){var rp=rest(),tt=(now-t0)/1000;mouse.tx=rp[0]+(reduce?0:.018*Math.sin(tt*.35));mouse.ty=rp[1]+(reduce?0:.012*Math.cos(tt*.28))}
    mouse.x+=(mouse.tx-mouse.x)*(active?.14:.035);mouse.y+=(mouse.ty-mouse.y)*(active?.14:.035);
    mouse.amt+=(mouse.tamt-mouse.amt)*.08;
    var a=LOOKS[cur],b=LOOKS[nxt];
    /* dot pitch is global (never per-region), so eased with the wipe as a whole */
    var e=p*p*(3-2*p);
    var size=1;
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(U.uT,0);
    gl.uniform2f(U.uRes,W,H);gl.uniform2f(U.uImg,imgW,imgH);
    var wide=W/H>1.2;
    gl.uniform2f(U.uFoc,wide?.0:.9,wide?.9:.9);
    gl.uniform1f(U.uZoom,1.);
    gl.uniform2f(U.uMouse,mouse.x,mouse.y);
    gl.uniform1f(U.uP,p);gl.uniform1f(U.uDir,dir);
    gl.uniform1f(U.uTime,(now-t0)/1000);gl.uniform1f(U.uAmt,mouse.amt);
    gl.uniform1f(U.uCell,Math.max(2.1,Math.min(3.5,W/dpr/375))*dpr);
    gl.uniform1f(U.uSize,size);gl.uniform1f(U.uEdge,edge());gl.uniform1f(U.uWide,wide?1:0);
    gl.uniform4f(U.uA,a.shape,0,0,a.stag);
    gl.uniform4f(U.uB,b.shape,0,0,b.stag);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(!shown){shown=true;requestAnimationFrame(function(){canvas.style.opacity=1})}
    requestAnimationFrame(frame);
  }
})();
