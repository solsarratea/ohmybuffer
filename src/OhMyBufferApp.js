function OhMyBufferApp(canvas) {
    const clock = new THREE.Clock();

    const screenDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
    }
    const guiData = {
        "savebuffer":false,
        "savebuffer1":false,
        "savebuffer2":false,
        "mix":0.5,
        "mix1":0.,
        "mix2":0.,
        "sliderX":0.00,
        "sliderY":0.00,
        "frequencyBroadcast": 5,
        "sender":false,
        "colorize":false,
        "color1": {
            "r": 255,
            "g": 255,
            "b": 255
        },
        "color2": {
            "r": 0,
            "g": 47.00000000000006,
            "b": 255
        },
        "color3": {
            "r": 20.963541666666668,
            "g": 20.963541666666668,
            "b": 57.49999999999999
        },
    };

    /** Set Up Main Scene**/
    const scene = buildScene(screenDimensions);
    const renderer = buildRender(screenDimensions);
    const camera = buildCamera(screenDimensions);
    const guiControls = addGuiControls();


    /** Initialize Textures and Actions for buffers **/
    const textureA = buildTexture(screenDimensions);
    const textureB = buildTexture(screenDimensions);
    const textureC = buildTexture(screenDimensions);
    const textureD = buildTexture(screenDimensions);
    const actions = createBufferActions(screenDimensions);


    /** Initialize RTC-Connection**/
    var RDdata = actions[1].getguiData();
    const rtc = new RTC(guiData,RDdata);
    rtc.connect();



    /** Initialize Main Scene **/
    const fillMaterial = createQuadMaterial();
    const quad = buildQuad(screenDimensions, scene, fillMaterial);

    /** Methods **/
    function buildScene({ width, height }){
        let scene = new THREE.Scene();
        return scene;
    }

    function buildRender({ width, height }) {
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true,  preserveDrawingBuffer: true  });

        const DPR = (window.devicePixelRatio) ? window.devicePixelRatio : 1;
        renderer.setPixelRatio(DPR);
        renderer.setSize(width,height);

        document.body.appendChild(renderer.domElement);

        return renderer;
    }

    function buildCamera({ width, height }) {
      const camera = new THREE.Camera();
        return camera;
    }

    function createBufferActions(screenDimensions) {

        const buffers = [
            new Copy(screenDimensions,textureA.texture),
            new ReactionDiffusion(screenDimensions, textureA.texture, webcamTexture, guiControls)
        ];
        return buffers;
    }

    function createQuadMaterial(buffers){
      let vertex = `varying vec2 texCoordVarying;
         void main() {
           texCoordVarying = (position.xy +1.)*0.5;
           gl_Position =   projectionMatrix *
                     modelViewMatrix *
                     vec4(position,1.0);
       }`

      let finalFrag =`
        varying vec2 texCoordVarying;
        uniform sampler2D channel0; // Webcam input
        uniform sampler2D channel1; // Backbuffer input
        uniform sampler2D channel2; // BB 1
        uniform sampler2D channel3; // BB 2

        uniform float mix;
        uniform float mix1;
        uniform float mix2;

        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;

        uniform float sliderX;
        uniform float sliderY;

        uniform bool colorize;
        float map(float value, float inMin, float inMax, float outMin, float outMax) {
              return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
        }

       vec4 applyColorMap(float source){
         vec3 black = vec3(0.);
         vec3 targetColor;

         float ramp = min(1.,map(source,0.,0.1,0.,1.));
         float cond = float(source < 0.1);
         targetColor = (black*ramp+(1.-ramp)*color3)*cond;

         ramp = min(1.,map(source,0.1,0.45,0.,1.));
         targetColor += float(source>=0.1 && source<0.45)*(color3*ramp+(1.-ramp)*color2);

         ramp = min(map(source,0.45,1.,0.,1.),1.);
         targetColor += float(source>=0.45)*(color2*ramp+(1.-ramp)*color1);

         return vec4(targetColor,1.);
        }

        void main() {
          vec4 color;
          vec4 webcam = texture2D(channel0,texCoordVarying);
          vec4 prevText = applyColorMap(texture2D(channel1,texCoordVarying).g*3.);
          color = webcam*mix+prevText*(1.-mix);
          vec4 prevText1 = texture2D(channel2,texCoordVarying);
          color = color*(1.-mix1)+prevText1*(mix1);
          vec4 prevText2 = texture2D(channel3,texCoordVarying);
          color = color*(1.-mix2)+prevText2*(mix2);

          if(colorize){
            color = applyColorMap(color.g);
          }

           gl_FragColor = color;
        }`

        return new THREE.ShaderMaterial({
            uniforms : {
                channel0: { type : 't', value : webcamTexture },
                channel1: { type : 't', value : textureB.texture },
                channel2: { type : 't', value : textureC.texture },
                channel3: { type : 't', value : textureD.texture },
                mix: {value: 0.5},
                mix1: {value: 0.},
                mix2: {value: 0.},
                sliderX: {value: 0.001},
                sliderY: {value: 0.001},
                colorize: {value: false},
                color1:{type: 'c', value: new THREE.Color(255, 255, 0)},
                color2:{type: 'c', value: new THREE.Color(255, 0, 0) },
                color3:{type: 'c', value: new THREE.Color(0, 204, 255) }


            },
            vertexShader: vertex,
            fragmentShader: finalFrag
        });
    }

    function buildQuad({ width, height },scene, fillMaterial){
        let geom = new THREE.PlaneBufferGeometry(width, height);
        let quad = new THREE.Mesh( geom, fillMaterial );
        scene.add(quad);
    }

    function buildTexture({width, height}){
        var texture  =new THREE.WebGLRenderTarget( width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearMipMapLinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType});
        return texture;
    }

    function addGuiControls(){
        const datGui  = new dat.GUI({ autoPlace: true });
        window.gd =datGui;
        let folder = datGui.addFolder(`General Controls`);

        folder.add(guiData, 'sender');
        folder.add(guiData, 'savebuffer');
        folder.add(guiData, 'savebuffer1');
        folder.add(guiData, 'savebuffer2');
        folder.add(guiData, 'mix', 0., 1.).step(0.001);
        folder.add(guiData, 'mix1', 0., 1.).step(0.001);
        folder.add(guiData, 'mix2', 0., 1.).step(0.001);
        folder.add(guiData, 'sliderX', -1., 1.).step(0.001);
        folder.add(guiData, 'sliderY', -1., 1.).step(0.001);
//      folder.add(guiData, 'frequencyBroadcast', 1, 100 ).step(1);

        folder.add(guiData, 'colorize');
        folder.addColor(guiData, 'color1');
        folder.addColor(guiData, 'color2');
        folder.addColor(guiData, 'color3');

        return datGui;
    }


    function applyAction(ping,pong,quadchannel,action){
        const actionScene = action.getScene();

        renderer.setRenderTarget(ping);
        renderer.render(scene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        renderer.setRenderTarget(pong);
        renderer.render(actionScene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        quadchannel.value = pong.texture;
        action.updateChannel(ping.texture);

    }
    function applyActionNtimes(ping,pong,quadchannel,action,n){
        const actionScene = action.getScene();
        for (var i = 0; i < n; i++) {
            renderer.setRenderTarget(ping);
            renderer.render(scene, camera);

            renderer.setRenderTarget(null);
            renderer.clear();

            renderer.setRenderTarget(pong);
            renderer.render(actionScene, camera);

            renderer.setRenderTarget(null);
            renderer.clear();

            quadchannel.value = pong.texture;
            action.updateChannel(ping.texture);
        }

    }

    this.updateMixes = function(){

        if(fillMaterial.uniforms.mix.value != guiData.mix){
            fillMaterial.uniforms.mix.value = guiData.mix;
            rtc.broadcastSingleMessage('mix', guiData.mix);
        }

        if(fillMaterial.uniforms.mix1.value != guiData.mix1){
            fillMaterial.uniforms.mix1.value = guiData.mix1;
            rtc.broadcastSingleMessage('mix1', guiData.mix1);

        }
        if(fillMaterial.uniforms.mix2.value != guiData.mix2){
            fillMaterial.uniforms.mix2.value = guiData.mix2;
            rtc.broadcastSingleMessage('mix2', guiData.mix2);

        }
    }

    this.updateBuffer = function(ping, pong, controller){
        if(controller){
           let channelIn = fillMaterial.uniforms.channel1;
            applyAction(ping, pong,channelIn, actions[0]);
            controller = false;
        }
    }


    this.update = function() {
     //   var elapsedTime = 0;
     //   if (sceneControls.start){
     //       elapsedTime = clock.getElapsedTime();
     //   }

        /** Update buffers **/
        var channelIn;
        if(guiData.savebuffer){
            channelIn = fillMaterial.uniforms.channel1;
            applyActionNtimes(textureA, textureB, channelIn, actions[1],2);
            rtc.broadcastSingleMessage('savebuffer', guiData.savebuffer);
            guiData.savebuffer = false;

            actions[1].updateMaterial();
            RDdata = actions[1].getguiData();
            rtc.broadcastSingleMessage('reaction-diffusion', RDdata);
        }

        if(guiData.savebuffer1){
            channelIn = fillMaterial.uniforms.channel2;
            applyAction(textureA, textureC,channelIn, actions[0]);
            rtc.broadcastSingleMessage('savebuffer1', guiData.savebuffer1);
            guiData.savebuffer1 = false;
        }
        if(guiData.savebuffer2){
            channelIn = fillMaterial.uniforms.channel3;
            applyAction(textureA, textureD,channelIn, actions[0]);
            rtc.broadcastSingleMessage('savebuffer2', guiData.savebuffer2);
            guiData.savebuffer2 = false;
        }

        /** Update Mixes **/
        this.updateMixes();

        /** Updates Color **/
        fillMaterial.uniforms.colorize.value = guiData.colorize;
        if(fillMaterial.uniforms.color1.value.r != guiData.color1.r/255){
            fillMaterial.uniforms.color1.value.r = guiData.color1.r/255;
            fillMaterial.uniforms.color1.value.g = guiData.color1.g/255;
            fillMaterial.uniforms.color1.value.b = guiData.color1.b/255;
            rtc.broadcastSingleMessage('color1', guiData.color1);
        }

        if(fillMaterial.uniforms.color2.value.r = guiData.color2.r/255){
            fillMaterial.uniforms.color2.value.r = guiData.color2.r/255;
            fillMaterial.uniforms.color2.value.g = guiData.color2.g/255;
            fillMaterial.uniforms.color2.value.b = guiData.color2.b/255;
            rtc.broadcastSingleMessage('color2', guiData.color2);
        }
        if (fillMaterial.uniforms.color3.value.r = guiData.color3.r/255){
            fillMaterial.uniforms.color3.value.r = guiData.color3.r/255;
            fillMaterial.uniforms.color3.value.g = guiData.color3.g/255;
            fillMaterial.uniforms.color3.value.b = guiData.color3.b/255;
            rtc.broadcastSingleMessage('color3', guiData.color3);
        }

        if(guiData.colorize){
            rtc.broadcastSingleMessage('colorize', guiData.colorize);
        }

        window.color1 = fillMaterial.uniforms.color1.value
        window.d = guiData.color1;

        renderer.render(scene, camera);
    }

    this.onWindowResize = function() {
        const { width, height } = canvas;

        screenDimensions.width = width;
        screenDimensions.height = height;

        renderer.setSize(width, height);
    }


  this.bindEventListeners= function(){
      /*** SCREEN SHOT ABILITY ***/
      window.addEventListener("keyup", function(e){
          var imgData;
          //Listen to 'P' key
          if(e.which !== 80) return;
          try {
              imgData = renderer.domElement.toDataURL();
              let link = document.createElement("a");
              link.href = imgData;
              link.download = "img";
              link.click();
          }
          catch(e) {
              console.log("Browser does not support taking screenshot of 3d context",e);
              return;
          }
      });

      /*** KEYBOARD CONTROL  ***/
      document.addEventListener("keydown", onDocumentKeyDown, false);
      function onDocumentKeyDown(event) {
          var keyCode = event.which;

          switch(keyCode){
          case 49: {
              guiData.savebuffer = true;
              break;
          }
          case 50: {
              guiData.savebuffer1 = true;
              break;
          }
          case 51: {
              guiData.savebuffer2 = true;
              break;
          }
          case 219: {
              guiData.mix = Math.max(0.,guiData.mix - 0.05);
              break
          }
          case 221: {
              guiData.mix = Math.min(1.,guiData.mix + 0.05);
              break
          }
          case 219: {
              guiData.mix = Math.max(0.,guiData.mix - 0.05);
              break
          }
          case 221: {
              guiData.mix = Math.min(1.,guiData.mix + 0.05);
              break
          }
          case 186: {
              guiData.mix1 = Math.max(0.,guiData.mix1 - 0.05);
              break
          }
          case 222: {
              guiData.mix1 = Math.min(1.,guiData.mix1 + 0.05);
              break
          };
          case 190: {
              guiData.mix2 = Math.max(0.,guiData.mix2 - 0.05);
              break
          }
          case 191: {
              guiData.mix2 = Math.min(1.,guiData.mix2 + 0.05);
              break
          }
          default:
              break;

          };
      }
  }
}
