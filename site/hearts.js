/* The halalmo.de hero: a halftone photo made of faint gold dots that swell into
   the picture where a chrome heart has been. Drag a heart to toss it; tap it to
   squeeze. One heart leaves a gold wake, the other a reddish-pink one.
   Based on src/components/auth/heartsEngine.ts (the app's sign-in hero), tuned for
   speed: only the cells a heart has stirred are updated or redrawn, the resting
   dots are painted once, and each heart frame is cached with its shadow baked in. */
(function(){
  var HEART_SRC='/img/chrome-heart.png',PHOTO_SRC='/img/hero.webp';
  var SPRITE={fw:314,fh:313,cols:4};
  var CELL=5,FOCUS={x:.74,y:.33},ZOOM=1.35,DOT_BASE=.12,DOT_FULL=.56;
  var GOLD='138,106,52',MID='200,98,76',PINK='240,80,94';
  var SIZES=[1.02,.92],SPOTS=[[.38,.4],[.64,.62]];

  var stage=document.getElementById('stage');
  var cv=document.createElement('canvas');cv.id='hearts';cv.setAttribute('aria-hidden','true');
  stage.appendChild(cv);
  var ctx=cv.getContext('2d');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileMQ=window.matchMedia('(max-width: 860px)');

  /* ---------- engine ---------- */
  var width=1,height=1,cols=0,rows=0;
  var wake=[null,null],scratch=[null,null],halo=[null,null],haloCells=[[],[]],haloAt=[null,null];
  var seen=new Int32Array(0),frameNo=0;
  var bb={i0:1,i1:0,j0:1,j1:0};      /* box around every cell a wake still touches */
  var hearts=[],grabbed=null,trail=[];
  function baseSize(){return Math.max(44,Math.min(width,height*1.1)*(width<=860?.36:.24))}
  function seat(h,i){
    h.size=baseSize()*(SIZES[i]||1);h.radius=h.size*.4;
    var s=SPOTS[i]||SPOTS[0];h.x=width*s[0];h.y=height*s[1];
  }
  function engineResize(w,h){
    width=w;height=h;cols=Math.ceil(w/CELL);rows=Math.ceil(h/CELL);
    for(var n=0;n<2;n++){
      wake[n]=new Float32Array(cols*rows);scratch[n]=new Float32Array(cols*rows);halo[n]=new Float32Array(cols*rows);
      haloCells[n]=[];haloAt[n]=null;
    }
    seen=new Int32Array(cols*rows);bb={i0:1,i1:0,j0:1,j1:0};
    if(!hearts.length){
      for(var i=0;i<SIZES.length;i++){
        var tilt=i?.14:-.14;
        var o={size:0,radius:0,x:0,y:0,vx:0,vy:0,restAngle:tilt,angle:tilt,spin:0,phase:i*2.3,squash:0,squashVelocity:0,squashAxis:0,moved:0,tap:1,held:false,press:0,cache:{},cacheSize:0};
        seat(o,i);hearts.push(o);
      }
      return;
    }
    hearts.forEach(function(o,i){
      o.size=baseSize()*(SIZES[i]||1);o.radius=o.size*.4;
      if(!o.vx&&!o.vy&&!o.held)seat(o,i);
      o.x=Math.min(width-o.radius,Math.max(o.radius,o.x));o.y=Math.min(height-o.radius,Math.max(o.radius,o.y));
    });
  }
  function squeeze(o,amount,axis){o.squashAxis=axis;o.squashVelocity+=Math.min(.1,amount*.12)}
  function grow(i0,i1,j0,j1){
    if(bb.i0>bb.i1){bb={i0:i0,i1:i1,j0:j0,j1:j1};return}
    if(i0<bb.i0)bb.i0=i0;if(i1>bb.i1)bb.i1=i1;if(j0<bb.j0)bb.j0=j0;if(j1>bb.j1)bb.j1=j1;
  }
  function stepWake(dt){
    var decay=Math.pow(.976,dt),i,j,k,n;
    /* soften and fade only the cells a wake still touches */
    if(bb.i0<=bb.i1){
      var i0=Math.max(0,bb.i0-1),i1=Math.min(cols-1,bb.i1+1),j0=Math.max(0,bb.j0-1),j1=Math.min(rows-1,bb.j1+1);
      var nb={i0:1e9,i1:-1,j0:1e9,j1:-1};
      for(n=0;n<2;n++){
        var src=wake[n],dst=scratch[n];
        for(j=j0;j<=j1;j++)for(i=i0;i<=i1;i++){
          k=j*cols+i;var here=src[k],l=i>0?src[k-1]:here,r=i<cols-1?src[k+1]:here,u=j>0?src[k-cols]:here,d=j<rows-1?src[k+cols]:here;
          var v=(here*.6+(l+r+u+d)*.1)*decay;
          if(v<.003)v=0;else{if(i<nb.i0)nb.i0=i;if(i>nb.i1)nb.i1=i;if(j<nb.j0)nb.j0=j;if(j>nb.j1)nb.j1=j}
          dst[k]=v;
        }
        for(j=j0;j<=j1;j++)for(i=i0;i<=i1;i++)src[j*cols+i]=0;
        wake[n]=dst;scratch[n]=src;
      }
      bb=nb.i1<0?{i0:1,i1:0,j0:1,j1:0}:nb;
    }
    /* deposit: a moving, held or tapped heart stirs the dots around it */
    hearts.forEach(function(o,n){
      var speed=Math.max(Math.hypot(o.vx,o.vy),o.moved*.55);
      var amp=Math.min(1,speed/9)*.85+(o.held?.18:0)+(o.tap<1?.55*Math.sin(o.tap*Math.PI):0);
      if(amp<.02)return;
      var sigma=o.radius*.62,reach=Math.ceil(sigma*2.6/CELL),ci=Math.round(o.x/CELL),cj=Math.round(o.y/CELL);
      var a0=Math.max(0,ci-reach),a1=Math.min(cols-1,ci+reach),b0=Math.max(0,cj-reach),b1=Math.min(rows-1,cj+reach),w=wake[n];
      for(var jj=b0;jj<=b1;jj++)for(var ii=a0;ii<=a1;ii++){
        var dx=ii*CELL+CELL/2-o.x,dy=jj*CELL+CELL/2-o.y,kk=jj*cols+ii;
        w[kk]=Math.min(1,w[kk]+amp*Math.exp(-(dx*dx+dy*dy)/(2*sigma*sigma))*.6);
      }
      grow(a0,a1,b0,b1);
    });
    /* a faint resting halo, recomputed only when a heart has actually moved */
    hearts.forEach(function(o,n){
      var at=haloAt[n];
      if(at&&Math.abs(at.x-o.x)<.4&&Math.abs(at.y-o.y)<.4&&at.s===o.size)return;
      var hl=halo[n],cells=haloCells[n],c;
      for(c=0;c<cells.length;c++)hl[cells[c]]=0;
      cells.length=0;
      var s2=2*o.radius*o.radius*.75,reach=Math.ceil(o.radius*2.6/CELL),ci=Math.round(o.x/CELL),cj=Math.round(o.y/CELL);
      for(var jj=Math.max(0,cj-reach);jj<=Math.min(rows-1,cj+reach);jj++)for(var ii=Math.max(0,ci-reach);ii<=Math.min(cols-1,ci+reach);ii++){
        var dx=ii*CELL+CELL/2-o.x,dy=jj*CELL+CELL/2-o.y,v=.2*Math.exp(-(dx*dx+dy*dy)/s2);
        if(v<.004)continue;
        var kk=jj*cols+ii;hl[kk]=Math.min(.3,v);cells.push(kk);
      }
      haloAt[n]={x:o.x,y:o.y,s:o.size};
    });
  }
  function stepHearts(dt){
    var i,j;
    hearts.forEach(function(h){
      if(!h.held){
        h.x+=h.vx*dt;h.y+=h.vy*dt;
        var speed=Math.hypot(h.vx,h.vy);
        h.vx*=Math.pow(.985,dt);h.vy*=Math.pow(.985,dt);
        if(speed<.05){h.vx=0;h.vy=0}
        var impact=0,axis=0;
        if(h.x<h.radius){if(-h.vx>impact){impact=-h.vx;axis=0}if(h.vx<0)h.vx=-h.vx*.9;h.x+=(h.radius-h.x)*.3}
        if(h.x>width-h.radius){if(h.vx>impact){impact=h.vx;axis=0}if(h.vx>0)h.vx=-h.vx*.9;h.x-=(h.x-(width-h.radius))*.3}
        if(h.y<h.radius){if(-h.vy>impact){impact=-h.vy;axis=Math.PI/2}if(h.vy<0)h.vy=-h.vy*.9;h.y+=(h.radius-h.y)*.3}
        if(h.y>height-h.radius){if(h.vy>impact){impact=h.vy;axis=Math.PI/2}if(h.vy>0)h.vy=-h.vy*.9;h.y-=(h.y-(height-h.radius))*.3}
        if(impact>1.2)squeeze(h,impact/9,axis);
      }
      h.spin+=(-(h.angle-h.restAngle)*.012-h.spin*.03)*dt;h.angle+=h.spin*dt;
      if(h.tap<1)h.tap=Math.min(1,h.tap+dt*3/38);
      h.press+=(Number(h.held)-h.press)*Math.min(1,dt*.22);
      h.moved*=Math.pow(.88,dt);
      h.squashVelocity+=(-h.squash*.12-h.squashVelocity*.09)*dt;
      h.squash=Math.min(.42,Math.max(-.42,h.squash+h.squashVelocity*dt));
    });
    for(i=0;i<hearts.length;i++)for(j=i+1;j<hearts.length;j++){
      var a=hearts[i],b=hearts[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||1,min=a.radius+b.radius;
      if(dist>=min)continue;
      var nx=dx/dist,ny=dy/dist,overlap=min-dist;
      var ma=a.held?1e6:a.radius*a.radius,mb=b.held?1e6:b.radius*b.radius,total=ma+mb;
      a.x-=nx*overlap*(mb/total);a.y-=ny*overlap*(mb/total);b.x+=nx*overlap*(ma/total);b.y+=ny*overlap*(ma/total);
      var approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(approach>=0)continue;
      var impulse=(-(1+.92)*approach)/(1/ma+1/mb);
      if(!a.held){a.vx-=impulse*nx/ma;a.vy-=impulse*ny/ma}
      if(!b.held){b.vx+=impulse*nx/mb;b.vy+=impulse*ny/mb}
      var force=-approach/9;
      if(force>.12){var ax=Math.atan2(ny,nx);squeeze(a,force,ax);squeeze(b,force,ax);a.spin+=(Math.random()-.5)*.03;b.spin+=(Math.random()-.5)*.03}
    }
  }
  function frameOf(h){
    if(h.press>.02)return Math.round(6*h.press);
    if(h.tap>=1)return 0;
    var u=h.tap<.5?h.tap/.5:1-(h.tap-.5)/.5;return Math.round(7*u);
  }
  function pick(x,y){
    var best=null,bd=Infinity;
    hearts.forEach(function(h){var d=Math.hypot(x-h.x,y-h.y);if(d<h.radius*1.25&&d<bd){bd=d;best=h}});
    return best;
  }
  function grab(x,y,now){
    var h=pick(x,y);if(!h)return false;
    h.held=true;h.vx=0;h.vy=0;
    grabbed={heart:h,dx:h.x-x,dy:h.y-y,startX:x,startY:y,startedAt:now,moved:0};trail=[{x:x,y:y,t:now}];return true;
  }
  function drag(x,y,now){
    if(!grabbed)return;var h=grabbed.heart,ox=h.x,oy=h.y;
    h.x+=(x+grabbed.dx-h.x)*.6;h.y+=(y+grabbed.dy-h.y)*.6;
    h.moved=Math.max(h.moved,Math.hypot(h.x-ox,h.y-oy));
    grabbed.moved=Math.max(grabbed.moved,Math.hypot(x-grabbed.startX,y-grabbed.startY));
    trail.push({x:x,y:y,t:now});while(trail.length>2&&now-trail[0].t>90)trail.shift();
  }
  function release(now){
    if(!grabbed)return;var h=grabbed.heart,tap=grabbed.moved<8&&now-grabbed.startedAt<500;
    grabbed=null;h.held=false;
    var a=trail[0],z=trail[trail.length-1],span=Math.max(16,z.t-a.t);
    var vx=(z.x-a.x)/span*16.667,vy=(z.y-a.y)/span*16.667,speed=Math.hypot(vx,vy),cap=38;
    if(speed>cap){vx*=cap/speed;vy*=cap/speed}
    trail=[];
    if(tap){h.vx=0;h.vy=0;h.spin+=(Math.random()-.5)*.05;return}
    h.vx=vx;h.vy=vy;h.squashVelocity+=.05;h.spin+=vx*.004;
  }

  /* ---------- the photo, as dots ---------- */
  var photo=null,sprite=null,ink=new Float32Array(0),still=null;
  function photoFrame(c,r,iw,ih){
    var scale=Math.max(c/iw,r/ih)*ZOOM,w=iw*scale,h=ih*scale;
    var clamp=function(v,min){return Math.min(0,Math.max(min,v))};
    return{left:clamp(c/2-FOCUS.x*w,c-w),top:clamp(r/2-FOCUS.y*h,r-h),width:w,height:h};
  }
  function samplePhoto(){
    if(!photo||!cols)return;
    var s=document.createElement('canvas');s.width=cols;s.height=rows;
    var sc=s.getContext('2d',{willReadFrequently:true});if(!sc)return;
    var f=photoFrame(cols,rows,photo.naturalWidth,photo.naturalHeight);
    sc.drawImage(photo,f.left,f.top,f.width,f.height);
    var px=sc.getImageData(0,0,cols,rows).data;ink=new Float32Array(cols*rows);
    for(var k=0;k<cols*rows;k++){
      var light=(.299*px[k*4]+.587*px[k*4+1]+.114*px[k*4+2])/255;
      ink[k]=Math.min(1,Math.max(0,(1-light-.12)*1.45));
    }
    buildStill();
  }
  function dotRadius(inkv,reveal){
    var base=CELL*DOT_BASE;
    return base+Math.min(1,reveal)*Math.max(0,Math.sqrt(inkv)*CELL*DOT_FULL-base);
  }
  /* the resting dots never change, so they are painted once and reused */
  function buildStill(){
    if(!cols||!ink.length)return;
    still=document.createElement('canvas');still.width=cv.width;still.height=cv.height;
    var sx=still.getContext('2d');sx.setTransform(dpr,0,0,dpr,0,0);
    sx.fillStyle='rgba('+GOLD+',.62)';sx.beginPath();
    for(var j=0;j<rows;j++)for(var i=0;i<cols;i++){
      var r=dotRadius(ink[j*cols+i]||0,0);if(r<.3)continue;
      var x=i*CELL+CELL/2,y=j*CELL+CELL/2;sx.moveTo(x+r,y);sx.arc(x,y,r,0,Math.PI*2);
    }
    sx.fill();
  }
  /* each heart frame is drawn once with its shadow, then reused */
  var PAD=64;
  function heartBitmap(h,f){
    if(h.cacheSize!==h.size){h.cache={};h.cacheSize=h.size}
    var c=h.cache[f];if(c)return c;
    var dh=h.size*SPRITE.fh/SPRITE.fw,w=h.size+PAD*2,hh=dh+PAD*2;
    c=document.createElement('canvas');c.width=Math.ceil(w*dpr);c.height=Math.ceil(hh*dpr);
    var x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
    x.shadowColor='rgba(24,34,56,.22)';x.shadowBlur=26;x.shadowOffsetY=18;
    x.drawImage(sprite,(f%SPRITE.cols)*SPRITE.fw,Math.floor(f/SPRITE.cols)*SPRITE.fh,SPRITE.fw,SPRITE.fh,PAD,PAD,h.size,dh);
    h.cache[f]=c;return c;
  }

  /* ---------- layout: the hearts live beside the text (or above it on phones) ---------- */
  var dpr=1,region={x:0,y:0,w:1,h:1};
  function bounds(){
    var W=innerWidth,H=innerHeight,hero=document.querySelector('.hero'),f=hero&&hero.firstElementChild;
    var rtl=document.documentElement.getAttribute('dir')==='rtl';
    if(mobileMQ.matches)return{x:0,y:0,w:W,h:Math.max(220,H*.42),mode:'top'};
    var rect=f&&f.getBoundingClientRect();
    if(rtl){var right=rect?Math.min(W*.8,Math.max(W*.38,rect.left-40)):W*.6;return{x:0,y:0,w:right,h:H,mode:'left'}}
    var edge=rect?rect.right+40:W*.4,x0=Math.min(W*.62,Math.max(W*.2,edge));
    return{x:x0,y:0,w:W-x0,h:H,mode:'right'};
  }
  function applyMask(mode){
    var m=mode==='top'?'linear-gradient(to bottom,#000 calc(100% - 70px),transparent)':
      mode==='left'?'linear-gradient(to left,transparent 0,#000 90px)':'linear-gradient(to right,transparent 0,#000 90px)';
    cv.style.webkitMaskImage=m;cv.style.maskImage=m;
  }
  function layout(){
    var b=bounds();dpr=Math.min(window.devicePixelRatio||1,2);
    if(Math.abs(b.w-region.w)<1&&Math.abs(b.h-region.h)<1&&Math.abs(b.x-region.x)<1&&Math.abs(b.y-region.y)<1&&cv.width===Math.round(b.w*dpr))return;
    region=b;
    cv.style.left=b.x+'px';cv.style.top=b.y+'px';cv.style.width=b.w+'px';cv.style.height=b.h+'px';
    applyMask(b.mode);
    cv.width=Math.round(b.w*dpr);cv.height=Math.round(b.h*dpr);
    engineResize(b.w,b.h);
    hearts.forEach(function(h){h.cache={};h.cacheSize=0});
    samplePhoto();
  }

  /* ---------- drawing ---------- */
  var lastT=0,shown=false,live=[];
  /* tiers by how much of a cell's wake is the pink heart's: gold, coral, pink */
  var TIERS=[['rgba('+GOLD+',.66)'],['rgba('+MID+',.72)'],['rgba('+PINK+',.76)']];
  function addCell(k){
    if(seen[k]===frameNo)return;seen[k]=frameNo;
    var a=wake[0][k]+halo[0][k],b=wake[1][k]+halo[1][k],v=a+b;
    if(v<.07)return;
    var i=k%cols,j=(k-i)/cols;
    live.push(i,j,v,ink[k]||0,b/v);
  }
  function draw(now){
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
    if(still)ctx.drawImage(still,0,0);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    /* cells the hearts are stirring: erase the resting dot, draw the swollen one */
    live.length=0;frameNo++;var k,i,j,n;
    for(n=0;n<2;n++){var hc=haloCells[n];for(k=0;k<hc.length;k++)addCell(hc[k])}
    if(bb.i0<=bb.i1){
      for(j=bb.j0;j<=bb.j1;j++)for(i=bb.i0;i<=bb.i1;i++){k=j*cols+i;if(wake[0][k]>0||wake[1][k]>0)addCell(k)}
    }
    /* one pass, one path per colour; no per-cell erase (the swollen dot simply covers the resting one) */
    var paths=[new Path2D(),new Path2D(),new Path2D()],used=[false,false,false];
    for(k=0;k<live.length;k+=5){
      var share=live[k+4],tier=share<.3?0:(share<.7?1:2);
      var r=dotRadius(live[k+3],live[k+2]);if(r<CELL*DOT_BASE+.22)continue;
      var x=live[k]*CELL+CELL/2,y=live[k+1]*CELL+CELL/2;
      paths[tier].moveTo(x+r,y);paths[tier].arc(x,y,r,0,Math.PI*2);used[tier]=true;
    }
    for(var t=0;t<3;t++){if(used[t]){ctx.fillStyle=TIERS[t][0];ctx.fill(paths[t])}}
    if(!sprite)return;
    var order=hearts.slice().sort(function(a,b){return a.size-b.size});
    order.forEach(function(h){
      var f=frameOf(h),bmp=heartBitmap(h,f),dh=h.size*SPRITE.fh/SPRITE.fw;
      var bobX=reduce?0:Math.sin(now*.00055+h.phase*1.7)*4,bobY=reduce?0:Math.sin(now*.00085+h.phase)*7,sway=reduce?0:Math.sin(now*.0007+h.phase*.9)*.03;
      ctx.save();ctx.translate(h.x+bobX,h.y+bobY);
      var gr=h.held?1.07:1;ctx.scale(gr,gr);
      ctx.rotate(h.squashAxis);ctx.scale(1-h.squash,1+h.squash*.6);ctx.rotate(-h.squashAxis);
      ctx.rotate(h.angle+sway);
      ctx.drawImage(bmp,-(h.size/2+PAD),-(dh/2+PAD),h.size+PAD*2,dh+PAD*2);
      ctx.restore();
    });
  }
  function loop(now){
    requestAnimationFrame(loop);
    if(document.hidden||!cols)return;
    var dt=Math.min(2.5,(now-lastT)/16.667||1);lastT=now;
    stepHearts(dt);stepWake(dt);draw(now);
    if(!shown&&sprite&&still){shown=true;cv.style.opacity='1'}
  }

  /* ---------- pointer: grab, drag, toss (window-level, so the logo and links laid over the hero don't swallow it) ---------- */
  function ui(el){return el&&el.closest&&el.closest('form,a,button,input,select,textarea,.store,.language-picker')}
  function local(e){var r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  addEventListener('pointerdown',function(e){
    if(ui(e.target))return;
    var p=local(e);if(!grab(p.x,p.y,performance.now()))return;
    document.body.classList.add('grabbing');
    if(e.pointerType==='mouse')e.preventDefault();
  });
  addEventListener('pointermove',function(e){
    var p=local(e);
    if(grabbed)drag(p.x,p.y,performance.now());
    else if(e.pointerType==='mouse')document.body.style.cursor=(!ui(e.target)&&pick(p.x,p.y))?'grab':'';
  });
  function up(){if(!grabbed)return;release(performance.now());document.body.classList.remove('grabbing');document.body.style.cursor=''}
  addEventListener('pointerup',up);addEventListener('pointercancel',up);

  /* ---------- go ---------- */
  function loadImg(src,cb){var im=new Image();im.onload=function(){cb(im)};im.src=src}
  loadImg(PHOTO_SRC,function(im){photo=im;samplePhoto()});
  loadImg(HEART_SRC,function(im){sprite=im});
  layout();
  var relayout=function(){layout()};
  addEventListener('resize',relayout);
  if(window.ResizeObserver){var hero=document.querySelector('.hero');if(hero)new ResizeObserver(relayout).observe(hero)}
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(relayout);
  lastT=performance.now();requestAnimationFrame(loop);
  /* ms per frame for the simulation + drawing, with a heart in motion (for tuning) */
  function bench(n){
    n=n||120;var h=hearts[0],t={a:0,b:0,c:0},p;
    h.vx=6;h.vy=3.5;
    for(var f=0;f<n;f++){
      if(f%40===0){h.vx=6*(f%80?-1:1);h.vy=3.5}
      p=performance.now();stepHearts(1);t.a+=performance.now()-p;
      p=performance.now();stepWake(1);t.b+=performance.now()-p;
      p=performance.now();draw(f*16);t.c+=performance.now()-p;
    }
    return{hearts:+(t.a/n).toFixed(2),wake:+(t.b/n).toFixed(2),draw:+(t.c/n).toFixed(2),liveCells:live.length/5};
  }
  window.halalHearts={relayout:relayout,bench:bench,cells:function(){return cols*rows}};
})();
