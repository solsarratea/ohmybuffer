function ReactionDiffusion(screenDimensions,channelIn,webcamTexture, guiControls) {
    let folder = guiControls.addFolder('Reaction Diffusion');
    const controls = {
        "dA": 0.778,
        "dB": 0.421,
        "timeStep": 0.003,
        "feed": 0.0078000000000000005,
        "kill": 0.051000000000000004,
        "flow": 1,
        "zoom": 0.00,
        "rotate": 0,
        "iterations": 1,
        "centerX": 925,
        "centerY": 490.5,
        "interpolate": 0.00413,
        "applyReactionDiffusion": true,
        "rNeighbour": 1.,
        "tNeighbour": 0.,
    }



    folder.add(controls, "timeStep", 0.0, 0.1).step(0.0001);
    folder.add(controls, "zoom", -0.1, 0.1).step(0.000001);
    folder.add(controls, "rotate", -0.1, 0.1).step(0.000001);
    folder.add(controls, "centerX",0,window.innerWidth);
    folder.add(controls, "centerY",0,window.innerHeight);

    folder.add(controls, "interpolate",0.,1.).step(0.0001);

    folder.add(controls, "applyReactionDiffusion");
    folder.add(controls, "iterations", 0, 100).step(1);
    folder.add(controls, "dA", 0.0, 1.0).step(0.001);
    folder.add(controls, "dB", 0.0, 1.0).step(0.001);
    folder.add(controls, "feed", 0.0, 0.15).step(0.0001);
    folder.add(controls, "kill", 0.0, 0.15).step(0.0001);
    folder.add(controls, "rNeighbour", 0.0, 100.0).step(0.1);
    folder.add(controls, "tNeighbour", -controls.rNeighbour, controls.rNeighbour).step(0.5);


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
        const frag =`uniform vec2 res;
       uniform sampler2D channel0;
       uniform sampler2D start;

       //uniform vec3 brush;
       //uniform float brushSize;
       //uniform bool enableBrush;

       uniform float time;

       uniform float dA;
       uniform float dB;
       uniform float feed;
       uniform float k;
       uniform float zoom;
       uniform float rotate;
       uniform float centerX;
       uniform float centerY;


       uniform float flow;

      uniform int clear;

       uniform float diff1;
       uniform float diff2;
       uniform float t;

       uniform float tNeighbour;
       uniform float rNeighbour;

       int count = 0;

       vec2 rotateP(vec2 uv, vec2 pivot, float rotation) {
           float sine = sin(rotation);
           float cosine = cos(rotation);

           uv -= pivot;
           uv.x = uv.x * cosine - uv.y * sine;
           uv.y = uv.x * sine + uv.y * cosine;
           uv += pivot;

           return uv;
       }

       void main()
      {
          vec4 mixy2;
           vec2 center = vec2(centerX,centerY);

           if (clear==1) {
               gl_FragColor = vec4(0.);
               return;
           }

           vec2 pixelT = gl_FragCoord.xy;
           pixelT = rotateP(pixelT, center, rotate * 0.);

           vec4 currentColor = texture2D(channel0, (pixelT/ res.xy));
           vec4 videoColor= texture2D(start, pixelT/ res.xy);

           float a = currentColor.r;
           float b = currentColor.g;

           vec2 pixel = gl_FragCoord.xy/res.xy;
           vec2 pixelSize = 1./res.xy;

           vec2 dy = (rNeighbour * vec2(1.,-1.) + tNeighbour)*pixelSize.y;
           vec2 dx = (rNeighbour * vec2(1.,-1.) + tNeighbour)*pixelSize.x;

           vec4 N = texture2D(channel0, vec2(pixel.x, pixel.y + dy.y));
           vec4 S = texture2D(channel0, vec2(pixel.x, pixel.y + dy.x));
           vec4 E = texture2D(channel0, vec2(pixel.x + dx.x, pixel.y));
           vec4 W = texture2D(channel0, vec2(pixel.x + dx.y, pixel.y));

           vec4 NE = texture2D(channel0, vec2(pixel.x + dx.x, pixel.y + dy.x));
           vec4 NW = texture2D(channel0, vec2(pixel.x + dx.y, pixel.y + dy.x));
           vec4 SE = texture2D(channel0, vec2(pixel.x + dx.x, pixel.y + dy.y));
           vec4 SW = texture2D(channel0, vec2(pixel.x + dx.y, pixel.y + dy.y));

           // Lapalace A
           float lapA = 0.0;
           lapA += a * -1.0;
           lapA += N.r * diff1;
           lapA += S.r * diff1;
           lapA += E.r * diff1;
           lapA += W.r * diff1;
           lapA += NE.r * diff2;
           lapA += NW.r * diff2;
           lapA += SE.r * diff2;
           lapA += SW.r * diff2;


           // Laplace B
           float lapB = 0.0;
           lapB += b * -1.0;
           lapB += N.g * diff1;
           lapB += S.g * diff1;
           lapB += E.g * diff1;
           lapB += W.g * diff1;
           lapB += NE.g * diff2;
           lapB += NW.g * diff2;
           lapB += SE.g * diff2;
           lapB += SW.g * diff2;


           // calculate diffusion reaction
           a += ((dA * lapA) - (a*b*b) + (feed * (1.0-a))) * 1.0;
           b += ((dB * lapB) + (a*b*b) - ((k + feed) * b)) * 1.0;


           a = clamp(a, 0.0, 1.0);
           b = clamp(b, 0.0, 1.0);

           vec4 newColor = vec4(a, b, 1.0, 1.0);
           mixy2 =  mix(currentColor, newColor,t);

           gl_FragColor = mixy2;
       }`

    var material = new THREE.ShaderMaterial( {
        uniforms: {
           channel0: { type: "t", value: channelIn },
           res : { type : 'v2', value : new THREE.Vector2( width, height) },
           start: { type: "t", value: webcamTexture, minFilter : THREE.NearestFilter },

           time: {type:'f', value:0.0},
           dA: {type:'f', value: controls.dA},
            dB: {type:'f', value: controls.dB},
            feed: {type:'f', value: controls.feed},
            k: {type:'f', value: controls.kill},
            clear: {type:'i', value: controls.clear},
            toggle: {type:'i', value: 0},
            flow: {type:'f', value: controls.flow},
            diff1:  {type:'f', value: 0.2*controls.flow},
            diff2:  {type:'f', value: 0.05*controls.flow},
            zoom:  {type:'f', value: controls.zoom},
            rotate:  {type:'f', value: controls.rotate},
            centerX:  {type:'f', value: controls.centerX},
            centerY:  {type:'f', value: controls.centerY},
            t:  {type:'f', value: controls.interpolate},
            tNeighbour:  {type:'f', value: controls.tNeighbour},
            rNeighbour:  {type:'f', value: controls.rNeighbour},

        },
        vertexShader: vertex,
        fragmentShader: frag
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
        material.uniforms.channel0.value = newtexture;

    }

    this.updateMaterial = function(){
        material.uniforms.time.value += controls.timeStep;
        material.uniforms.zoom.value = controls.zoom;
        material.uniforms.dA.value = controls.dA;
        material.uniforms.dB.value = controls.dB;
        material.uniforms.feed.value = controls.feed;
        material.uniforms.k.value = controls.kill;
        material.uniforms.clear.value = controls.clear;
        material.uniforms.toggle.value = controls.toggle;
        material.uniforms.flow.value = controls.flow;
        material.uniforms.rotate.value = controls.rotate;
        material.uniforms.centerX.value = controls.centerX;
        material.uniforms.centerY.value = controls.centerY;
        material.uniforms.t.value = controls.interpolate;
        
        material.uniforms.rNeighbour.value = controls.rNeighbour;
        
        material.uniforms.tNeighbour.value = controls.tNeighbour;

    }

    this.getguiData=function(){
        return controls;
    }

}
