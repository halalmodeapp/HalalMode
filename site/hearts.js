/* Chrome hearts: ambient, tossable. Uses the 4x3 squeeze sprite sheet
   (frame 0 relaxed .. frame 7 fully squeezed). Drag to grab and toss;
   they bounce off the walls and each other and squeeze on impact. */
(function(){
  var SRC='/img/chrome-heart.png',FW=314,FH=313,COLS=4;
  var stage=document.getElementById('stage');
  var cv=document.createElement('canvas');cv.id='hearts';cv.setAttribute('aria-hidden','true');
  stage.appendChild(cv);
  var ctx=cv.getContext('2d');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileMQ=window.matchMedia('(max-width: 860px)');
  var sprite=new Image(),ready=false;
  sprite.onload=function(){ready=true};sprite.src=SRC;
  var W=1,H=1,dpr=1,on=false,raf=0,last=0;
  var hearts=[];
  var SIZES=[1.1,.88];
  var SPOTS=[[.38,.4],[.64,.62]];

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=innerWidth;H=innerHeight;
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  }
  function bounds(){
    var hero=document.querySelector('.hero'),f=hero&&hero.firstElementChild;
    if(mobileMQ.matches){return{x0:0,y0:0,x1:W,y1:Math.max(220,H*.42)}}
    var edge=f?f.getBoundingClientRect().right+40:W*.4;
    return{x0:Math.min(W*.62,Math.max(W*.2,edge)),y0:0,x1:W,y1:H};
  }
  function baseSize(b){return Math.max(44,Math.min(b.x1-b.x0,(b.y1-b.y0)*1.1)*(mobileMQ.matches?.36:.18))}
  function seed(){
    var b=bounds(),bs=baseSize(b);hearts=[];
    for(var i=0;i<SIZES.length;i++){
      var s=bs*SIZES[i],sp=SPOTS[i];
      hearts.push({s:s,r:s*.4,x:b.x0+(b.x1-b.x0)*sp[0],y:b.y0+(b.y1-b.y0)*sp[1],vx:0,vy:0,a0:(i?.14:-.14),a:(i?.14:-.14),ph:i*2.3,d:0,dv:0,dir:0,mv:0,w:0,t:1,k:0,hold:false,press:0});
    }
  }
  function separate(){
    for(var i=0;i<hearts.length;i++)for(var j=i+1;j<hearts.length;j++){
      var A=hearts[i],B=hearts[j],dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1,m=A.r+B.r;
      if(d<m){var o=(m-d)/2,nx=dx/d,ny=dy/d;A.x-=nx*o;A.y-=ny*o;B.x+=nx*o;B.y+=ny*o}
    }
  }

  function squeeze(h,k,ang){h.dir=ang||0;h.dv+=Math.min(.1,k*.12)}

  /* dot grid behind the hearts: dots swell where a heart has recently been
     moving, then settle back slowly (a delayed wake). */
  var G={cols:0,rows:0,cell:14,x0:0,y0:0,f:null,g:null};
  function gridInit(){
    var b=bounds();G.cell=W<=860?12:14;
    G.x0=Math.floor(b.x0/G.cell)*G.cell;G.y0=Math.floor(b.y0/G.cell)*G.cell;
    G.cols=Math.ceil((b.x1-G.x0)/G.cell)+1;G.rows=Math.ceil((b.y1-G.y0)/G.cell)+1;
    G.f=new Float32Array(G.cols*G.rows);G.g=new Float32Array(G.cols*G.rows);
  }
  function gridStep(dt){
    if(!G.f)return;var cols=G.cols,rows=G.rows,f=G.f,g=G.g,i,j,k;
    var dec=Math.pow(.972,dt);
    /* soften and decay: the wake spreads a little as it fades */
    for(j=0;j<rows;j++)for(i=0;i<cols;i++){
      k=j*cols+i;
      var l=i>0?f[k-1]:f[k],r=i<cols-1?f[k+1]:f[k],u=j>0?f[k-cols]:f[k],d=j<rows-1?f[k+cols]:f[k];
      g[k]=(f[k]*.6+(l+r+u+d)*.1)*dec;
    }
    var t=G.f;G.f=G.g;G.g=t;f=G.f;
    for(var n=0;n<hearts.length;n++){
      var h=hearts[n],sp=Math.max(Math.hypot(h.vx,h.vy),h.mv*.55);
      var amp=Math.min(1,sp/9)*.85+(h.hold?.18:0)+(h.t<1?.55*Math.sin(h.t*3.1416):0);
      if(amp<.02)continue;
      var sg=h.r*.62,R=sg*2.6,ci=Math.round((h.x-G.x0)/G.cell),cj=Math.round((h.y-G.y0)/G.cell),span=Math.ceil(R/G.cell);
      for(j=Math.max(0,cj-span);j<=Math.min(rows-1,cj+span);j++)for(i=Math.max(0,ci-span);i<=Math.min(cols-1,ci+span);i++){
        var dx=G.x0+i*G.cell-h.x,dy=G.y0+j*G.cell-h.y,v=amp*Math.exp(-(dx*dx+dy*dy)/(2*sg*sg));
        k=j*cols+i;f[k]=Math.min(1,f[k]+v*.6);
      }
    }
  }
  function drawDots(){
    if(!G.f)return;var b=bounds(),cols=G.cols,rows=G.rows,f=G.f,base=G.cell*.07,maxR=G.cell*.46;
    ctx.fillStyle='rgba(138,106,52,.34)';
    ctx.beginPath();
    for(var j=0;j<rows;j++)for(var i=0;i<cols;i++){
      var x=G.x0+i*G.cell,y=G.y0+j*G.cell;
      /* feather towards the text side */
      var fe=Math.min(1,Math.max(0,(x-b.x0)/90));if(b.x0<=2)fe=1;
      var fy=Math.min(1,Math.max(0,(b.y1-y)/60)),m=fe*(W<=860?fy:1);
      if(m<=0)continue;
      /* faint resting halo around each heart */
      var pr=0;
      for(var n=0;n<hearts.length;n++){var h=hearts[n],dx=x-h.x,dy=y-h.y;pr+=.2*Math.exp(-(dx*dx+dy*dy)/(2*h.r*h.r*.75))}
      var r=(base+(f[j*cols+i]+Math.min(.3,pr))*(maxR-base))*m;
      if(r<.35)continue;
      ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,6.2832);
    }
    ctx.fill();
  }

  function step(dt){
    var b=bounds(),i,j,h;
    for(i=0;i<hearts.length;i++){
      h=hearts[i];
      if(!h.hold){
        h.x+=h.vx*dt;h.y+=h.vy*dt;
        var sp=Math.hypot(h.vx,h.vy);
        h.vx*=Math.pow(.985,dt);h.vy*=Math.pow(.985,dt);
        /* friction: hearts only move when you throw them */
        if(sp<.05){h.vx=0;h.vy=0}
        /* walls */
        var imp=0,ia=0;
        if(h.x<b.x0+h.r){if(-h.vx>imp){imp=-h.vx;ia=0}if(h.vx<0)h.vx=-h.vx*.9;h.x+=(b.x0+h.r-h.x)*.3}
        if(h.x>b.x1-h.r){if(h.vx>imp){imp=h.vx;ia=0}if(h.vx>0)h.vx=-h.vx*.9;h.x-=(h.x-(b.x1-h.r))*.3}
        if(h.y<b.y0+h.r){if(-h.vy>imp){imp=-h.vy;ia=1.5708}if(h.vy<0)h.vy=-h.vy*.9;h.y+=(b.y0+h.r-h.y)*.3}
        if(h.y>b.y1-h.r){if(h.vy>imp){imp=h.vy;ia=1.5708}if(h.vy>0)h.vy=-h.vy*.9;h.y-=(h.y-(b.y1-h.r))*.3}
        if(imp>1.2)squeeze(h,imp/9,ia);
      }
      /* pendulum tilt */
      h.w+=(-(h.a-h.a0)*.012-h.w*.03)*dt;h.a+=h.w*dt;
      /* tap sprite animation timeline */
      if(h.t<1)h.t=Math.min(1,h.t+dt*3/38);
      h.press+=(Number(h.hold)-h.press)*Math.min(1,dt*.22);
      h.mv*=Math.pow(.88,dt);
      h.dv+=(-h.d*.12-h.dv*.09)*dt;h.d+=h.dv*dt;if(h.d>.42)h.d=.42;if(h.d<-.42)h.d=-.42;
    }
    for(i=0;i<hearts.length;i++)for(j=i+1;j<hearts.length;j++){
      var A=hearts[i],B=hearts[j],dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1,m=A.r+B.r;
      if(d<m){
        var nx=dx/d,ny=dy/d,o=(m-d);
        var ma=A.hold?1e6:A.r*A.r,mb=B.hold?1e6:B.r*B.r,tot=ma+mb;
        A.x-=nx*o*(mb/tot);A.y-=ny*o*(mb/tot);B.x+=nx*o*(ma/tot);B.y+=ny*o*(ma/tot);
        var rv=(B.vx-A.vx)*nx+(B.vy-A.vy)*ny;
        if(rv<0){
          var jv=-(1+.92)*rv/(1/ma+1/mb);
          if(!A.hold){A.vx-=jv*nx/ma;A.vy-=jv*ny/ma}
          if(!B.hold){B.vx+=jv*nx/mb;B.vy+=jv*ny/mb}
          var k=-rv/9;if(k>.12){var an=Math.atan2(ny,nx);squeeze(A,k,an);squeeze(B,k,an);A.w+=(Math.random()-.5)*.03;B.w+=(Math.random()-.5)*.03}
        }
      }
    }
  }

  function frameIndex(h){if(h.press>.02)return Math.round(6*h.press);if(h.t>=1)return 0;var u=h.t<.5?h.t/.5:1-(h.t-.5)/.5;return Math.round(7*u)}
  var tnow=0;
  function draw(){
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
    if(!ready)return;
    ctx.scale(dpr,dpr);
    drawDots();
    var order=hearts.slice().sort(function(a,b){return a.s-b.s});
    for(var i=0;i<order.length;i++){
      var h=order[i],f=frameIndex(h),sx=(f%COLS)*FW,sy=Math.floor(f/COLS)*FH;
      ctx.save();
      var bx=reduce?0:Math.sin(tnow*.00055+h.ph*1.7)*4,by=reduce?0:Math.sin(tnow*.00085+h.ph)*7,bs=reduce?0:Math.sin(tnow*.0007+h.ph*.9)*.03;
      ctx.translate(h.x+bx,h.y+by);var hs=h.hold?1.07:1;ctx.scale(hs,hs);ctx.rotate(h.dir);ctx.scale(1-h.d,1+h.d*.6);ctx.rotate(-h.dir);ctx.rotate(h.a+bs);
      ctx.shadowColor='rgba(24,34,56,.22)';ctx.shadowBlur=26;ctx.shadowOffsetY=18;
      ctx.drawImage(sprite,sx,sy,FW,FH,-h.s/2,-h.s/2*FH/FW,h.s,h.s*FH/FW);
      ctx.restore();
    }
  }
  function loop(now){
    if(!on)return;
    var dt=Math.min(2.5,(now-last)/16.667||1);last=now;tnow=now;
    step(dt);gridStep(dt);draw();raf=requestAnimationFrame(loop);
  }

  /* pointer: grab, drag, toss */
  var grab=null,trail=[];
  function ui(el){return el&&el.closest&&el.closest('form,a,button,input,select,.store')}
  function pick(x,y){
    var best=null,bd=1e9;
    for(var i=0;i<hearts.length;i++){var h=hearts[i],d=Math.hypot(x-h.x,y-h.y);if(d<h.r*1.25&&d<bd){bd=d;best=h}}
    return best;
  }
  addEventListener('pointerdown',function(e){
    if(!on||ui(e.target))return;
    var h=pick(e.clientX,e.clientY);if(!h)return;
    grab={h:h,dx:h.x-e.clientX,dy:h.y-e.clientY,sx:e.clientX,sy:e.clientY,t0:performance.now(),moved:0};h.hold=true;h.vx=h.vy=0;trail=[{x:e.clientX,y:e.clientY,t:performance.now()}];
    document.body.classList.add('grabbing');
    if(e.pointerType==='mouse')e.preventDefault();
  });
  addEventListener('pointermove',function(e){
    if(!on)return;
    if(grab){
      var h=grab.h,ox=h.x,oy=h.y;h.x+=((e.clientX+grab.dx)-h.x)*.6;h.y+=((e.clientY+grab.dy)-h.y)*.6;h.mv=Math.max(h.mv,Math.hypot(h.x-ox,h.y-oy));
      grab.moved=Math.max(grab.moved,Math.hypot(e.clientX-grab.sx,e.clientY-grab.sy));
      var n=performance.now();trail.push({x:e.clientX,y:e.clientY,t:n});
      while(trail.length>2&&n-trail[0].t>90)trail.shift();
    }else if(e.pointerType==='mouse'){
      document.body.style.cursor=pick(e.clientX,e.clientY)&&!ui(e.target)?'grab':'';
    }
  });
  function release(){
    if(!grab)return;var h=grab.h,tap=grab.moved<8&&performance.now()-grab.t0<500;grab=null;h.hold=false;document.body.classList.remove('grabbing');
    var a=trail[0],z=trail[trail.length-1],dtm=Math.max(16,z.t-a.t);
    var vx=(z.x-a.x)/dtm*16.667,vy=(z.y-a.y)/dtm*16.667,sp=Math.hypot(vx,vy),cap=38;
    if(sp>cap){vx*=cap/sp;vy*=cap/sp}
    if(tap){h.vx=h.vy=0;h.w+=(Math.random()-.5)*.05;trail=[];return}
    h.vx=vx;h.vy=vy;h.dv+=.05;h.w+=vx*.004;
    trail=[];
  }
  addEventListener('pointerup',release);addEventListener('pointercancel',release);

  function start(){
    if(on)return;on=true;cv.style.display='block';
    if(!hearts.length)seed();
    gridInit();
    last=performance.now();raf=requestAnimationFrame(loop);
  }
  function stop(){on=false;cancelAnimationFrame(raf);cv.style.display='none';document.body.style.cursor=''}
  addEventListener('resize',function(){resize();gridInit();if(hearts.length){var b=bounds(),bs=baseSize(b);hearts.forEach(function(h,i){h.s=bs*SIZES[i];h.r=h.s*.4;if(!h.vx&&!h.vy&&!h.hold){h.x=b.x0+(b.x1-b.x0)*SPOTS[i][0];h.y=b.y0+(b.y1-b.y0)*SPOTS[i][1]}})}});
  resize();
  window.halalHearts={start:start,stop:stop};
})();
