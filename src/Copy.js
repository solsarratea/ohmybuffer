function Copy(screenDimensions,channelIn) {
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
        const copyFrag =` varying vec2 texCoordVarying;
       uniform sampler2D channel0; // Main texture
       void main() {
         vec4 inText = texture2D(channel0,texCoordVarying);
         gl_FragColor = inText;
       }`

    var material = new THREE.ShaderMaterial( {
        uniforms: {
            channel0: { type: "t", value: channelIn },
            resolution : { type : 'v2', value : new THREE.Vector2( width, height) },
        },
        vertexShader: vertex,
        fragmentShader:copyFrag
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
}
