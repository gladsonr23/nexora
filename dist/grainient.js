/* Grainient shader adapted for Nexora's vanilla-JS fullscreen timer. */
(() => {
  const vertexSource = `#version 300 es
    in vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec3 uColor1, uColor2, uColor3;
    out vec4 fragColor;
    #define S(a,b,t) smoothstep(a,b,t)
    mat2 Rot(float a) { float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
    vec2 hash(vec2 p) { p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37))); return fract(sin(p)*43758.5453); }
    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
      float a=dot(-1.0+2.0*hash(i),f), b=dot(-1.0+2.0*hash(i+vec2(1,0)),f-vec2(1,0));
      float c=dot(-1.0+2.0*hash(i+vec2(0,1)),f-vec2(0,1)), d=dot(-1.0+2.0*hash(i+vec2(1,1)),f-vec2(1,1));
      return 0.5+0.5*mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
    }
    void main() {
      float t=iTime*0.12;
      vec2 uv=gl_FragCoord.xy/iResolution.xy;
      float ratio=iResolution.x/iResolution.y;
      vec2 tuv=(uv-0.5)/1.22;
      float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*1.7);
      tuv.y/=ratio;
      tuv*=Rot(radians((degree-0.5)*230.0+180.0));
      tuv.y*=ratio;
      tuv.x+=sin(tuv.y*3.4+t*0.55)/95.0;
      tuv.y+=sin(tuv.x*5.1+t*0.55)/48.0;
      float blendX=tuv.x;
      float edge0=-0.31, edge1=0.25;
      vec3 layer1=mix(uColor3,uColor2,S(edge0,edge1,blendX));
      vec3 layer2=mix(uColor2,uColor1,S(edge0,edge1,blendX));
      vec3 col=mix(layer1,layer2,S(0.49,-0.31,tuv.y));
      float grain=fract(sin(dot(uv*2.0,vec2(12.9898,78.233)))*43758.5453);
      col+=(grain-0.5)*0.035;
      col=(col-0.5)*1.12+0.5;
      col=pow(max(col,0.0),vec3(1.0/1.05));
      fragColor=vec4(clamp(col,0.0,1.0),1.0);
    }
  `;
  const compile = (gl, type, source) => {
    const shader=gl.createShader(type); if(!shader) return null;
    gl.shaderSource(shader,source); gl.compileShader(shader);
    if(gl.getShaderParameter(shader,gl.COMPILE_STATUS)) return shader;
    console.warn('Nexora Grainient shader failed to compile:',gl.getShaderInfoLog(shader)); gl.deleteShader(shader); return null;
  };
  const hexRgb = value => {
    const match=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
    return match ? [1,2,3].map(i=>parseInt(match[i],16)/255) : [1,1,1];
  };

  window.NexoraGrainient = {
    mount(host, { color1='#e58a6a', color2='#473630', color3='#201b19' } = {}) {
      const canvas=document.createElement('canvas');
      canvas.className='nx-m3-grainient-canvas'; canvas.setAttribute('aria-hidden','true'); host.append(canvas);
      const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false});
      if(!gl) return ()=>canvas.remove();
      const vs=compile(gl,gl.VERTEX_SHADER,vertexSource), fs=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
      if(!vs||!fs) { if(vs)gl.deleteShader(vs); if(fs)gl.deleteShader(fs); return ()=>canvas.remove(); }
      const program=gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) { console.warn('Nexora Grainient program failed to link:',gl.getProgramInfoLog(program)); gl.deleteProgram(program); return ()=>canvas.remove(); }
      const vao=gl.createVertexArray(), buffer=gl.createBuffer(); gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.useProgram(program);
      gl.uniform3fv(gl.getUniformLocation(program,'uColor1'),hexRgb(color1));
      gl.uniform3fv(gl.getUniformLocation(program,'uColor2'),hexRgb(color2));
      gl.uniform3fv(gl.getUniformLocation(program,'uColor3'),hexRgb(color3));
      const resolution=gl.getUniformLocation(program,'iResolution'), time=gl.getUniformLocation(program,'iTime');
      const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
      let raf=0, started=0, alive=true;
      const render=now=>{
        raf=0; if(!alive||document.hidden) return;
        const rect=host.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,1.5);
        const w=Math.max(1,Math.floor(rect.width*dpr)), h=Math.max(1,Math.floor(rect.height*dpr));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h); gl.useProgram(program); gl.uniform2f(resolution,w,h);
        gl.uniform1f(time,reduce?0:(now-started)*0.001); gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES,0,3); gl.bindVertexArray(null);
        if(!reduce) raf=requestAnimationFrame(render);
      };
      const wake=()=>{if(!raf&&alive&&!document.hidden)raf=requestAnimationFrame(now=>{if(!started)started=now;render(now);});};
      const resize=new ResizeObserver(wake); resize.observe(host);
      const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();};
      document.addEventListener('visibilitychange',visibility); wake();
      return ()=>{alive=false;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener('visibilitychange',visibility);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(program);canvas.remove();};
    }
  };
})();
