function Irri(screenDimensions,channelIn,web) {
    const scene = buildScene(screenDimensions);
    const material = createBufferMaterial(screenDimensions);
    const object = buildObject(screenDimensions, scene, material);

    /** Methods **/
    function buildScene({ width, height }){
        let scene = new THREE.Scene();
        return scene;
    }

    function createBufferMaterial({width, height}){
        const vertex = `varying vec2 texCoordVarying;
        void main() {
          texCoordVarying = (position.xy +1.)*0.5;
          gl_Position =   projectionMatrix *
                    modelViewMatrix *
                    vec4(position,1.0);
      }`
        const copyFrag =`  uniform sampler2D webcam;
  uniform sampler2D backbuffer;
   uniform float resoluton;

  varying vec2 texCoordVarying;
  uniform vec2 resolution;
  const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
precision highp float;

#define M_PI 3.1415926535897932384626433832795

  void main() {
  vec2 pixel = texCoordVarying; vec3 finalColor;
  vec3 webcamCapture = texture2D(webcam,pixel).rgb;
  vec3 lastFrame = texture2D(backbuffer,pixel).rgb;
  float step=3.;
  float dx = 1./resolution.x *step;
  float dy = 1./resolution.y *step;

  // OBJECTIVE: update pixel color, from information  of their neighburs from previous frame

  // 1. Get neighbourhood from prev buffer
  vec3 N = texture2D(backbuffer, vec2(pixel.x,pixel.y+dy)).rgb;
  vec3 S = texture2D(backbuffer, vec2(pixel.x,pixel.y-dy)).rgb;
  vec3 E = texture2D(backbuffer, vec2(pixel.x+dx,pixel.y)).rgb;
  vec3 W = texture2D(backbuffer, vec2(pixel.x-dx,pixel.y)).rgb;

  vec3 NE = texture2D(backbuffer, vec2(pixel.x+dx,pixel.y + dy)).rgb;
  vec3 NW = texture2D(backbuffer, vec2(pixel.x-dx,pixel.y + dy)).rgb;
  vec3 SE = texture2D(backbuffer, vec2(pixel.x+dx,pixel.y+dy)).rgb;
  vec3 SW = texture2D(backbuffer, vec2(pixel.x+dx,pixel.y-dy)).rgb;

  //2. DO something with neighbours
  //Rates of diffuson
  float diff1 = .7;
  float diff2 = .7;
  float diff3 = .6;
  float diff4 = .1;

  vec3 new_color = lastFrame*-2.;
  new_color += N * vec3(diff1, diff2, diff3);
  new_color += S * vec3(diff1, diff2, diff3);
  new_color += E * vec3(diff1, diff2, diff3);
  new_color += W * vec3(diff1, diff2, diff3);

  new_color += NE * diff4;
  new_color += SE * diff4;
  new_color += NW * diff4;
  new_color += SW * diff4;

  new_color /= 9.;


  float r = new_color.r;
  float b = new_color.b;

  new_color = 0.2+webcamCapture*100.*(r*r-b);
  new_color = smoothstep(0.,0.1,new_color);


  new_color = hsv2rgb(new_color*vec3(sin(100.*lastFrame.r/new_color.r),0.6,0.5));

  finalColor = mix(new_color,webcamCapture, 0.25);
  gl_FragColor = vec4(finalColor,1.);
}`

     const material = new THREE.ShaderMaterial({
         uniforms : {
             webcam: { type : 't', value : web },
          backbuffer:{ type : 't', value : channelIn},
          resolution : { type : 'v2', value : new THREE.Vector2( window.innerWidth, window.innerHeight) }
      },
         vertexShader:vertex,
         fragmentShader: copyFrag
      });

        return material
    }

    function buildObject({width, height}, scene, material){
        let plane = new THREE.PlaneBufferGeometry( width, height );
        let object = new THREE.Mesh( plane, material );
        scene.add(object);

        return object;
    }

    this.getScene = function(){
        return scene;
    }

    this.updateChannel = function(newtexture) {
        material.uniforms.backbuffer.value = newtexture;
    }
}
