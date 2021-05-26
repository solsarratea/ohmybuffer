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
        "sliderX":0.001,
        "sliderY":0.001,
        "frequencyBroadcast": 5,
        "sender":false
    };

    /** Initialize RTC-Connection**/
    const rtc = new RTC(guiData);
    rtc.connect();


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
            new Copy(screenDimensions,textureA.texture)
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
        uniform sampler2D channel2; //BB 1
         uniform sampler2D channel3; //BB 2

        uniform float mix;
        uniform float mix1;
        uniform float mix2;

       uniform float sliderX;
        uniform float sliderY;
        void main() {
          vec4 color;
          vec4 webcam = texture2D(channel0,texCoordVarying);
          vec4 prevText = texture2D(channel1,texCoordVarying+vec2(sliderX, sliderY));
          color = webcam*mix+prevText*(1.-mix);
          vec4 prevText1 = texture2D(channel2,texCoordVarying+vec2(sliderX, sliderY));
          color = color*(1.-mix1)+prevText1*(mix1);
          vec4 prevText2 = texture2D(channel3,texCoordVarying+vec2(sliderX, sliderY));
          color = color*(1.-mix2)+prevText2*(mix2);

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
                sliderY: {value: 0.001}

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
        folder.add(guiData, 'frequencyBroadcast', 1, 100 ).step(1);

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
            applyAction(textureA, textureB,channelIn, actions[0]);
            rtc.broadcastSingleMessage('savebuffer', guiData.savebuffer);
            guiData.savebuffer = false;
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
            broadcastSingleMessage('savebuffer2', guiData.savebuffer2);
            guiData.savebuffer2 = false;
        }

        /** Update Mixes **/
        this.updateMixes();


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
          if (keyCode == 49) {
              guiData.savebuffer = true;
          } else if (keyCode == 50) {
              guiData.savebuffer1 = true;
          } else if (keyCode == 51) {
              guiData.savebuffer2 = true;
          }
      };
  }
}
