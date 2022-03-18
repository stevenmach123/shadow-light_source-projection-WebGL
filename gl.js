import layerVertShaderSrc from './layerVert.glsl.js';
import layerFragShaderSrc from './layerFrag.glsl.js';
import shadowFragShaderSrc from './shadowFrag.glsl.js';
import shadowVertShaderSrc from './shadowVert.glsl.js';
import depthFragShaderSrc from './depthFrag.glsl.js';
import depthVertShaderSrc from './depthVert.glsl.js';

var gl;

var layers = null
var renderToScreen = null;
var fbo = null;
var currRotate = 1;
var currLightRotate = 0;
var currLightDirection = null;
var currZoom = 0;
var currProj = 'perspective';
var currResolution = 2048;
var displayShadowmap = false;



var modelMatrix =identityMatrix();
var projectionMatrix= identityMatrix();
var viewMatrix  =identityMatrix()
var lightProjectionMatrix=identityMatrix();
var lightViewMatrix = identityMatrix();


/*
var go1= document.querySelector("#go1");
var go2 =document.querySelector("#go2");
var go3=document.querySelector("#go3");
var go4=document.querySelector("#go4");

var u1=  document.querySelector("#u1");
var u2=  document.querySelector("#u2");
var u3=  document.querySelector("#u3");
var u4=  document.querySelector("#u4");

var v1=0;
var v2 = 0;
var v3 = 0;
var v4=0;   */


var curR= 0; 
var switchR = 0; 
var prev_switchR =0;
var prev_rs =0;
var prev_rl = 0;

/*
    FBO
*/
class FBO{
    constructor(size){
        // (A)
        this.texture = createTexture2D(gl,size ,size, gl.DEPTH_COMPONENT32F, 0, gl.DEPTH_COMPONENT,gl.FLOAT, null,gl.NEAREST,gl.NEAREST,gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE  );
        this.fbo = createFBO(gl,gl.DEPTH_ATTACHMENT, this.texture) 
        this.size =size; 
    }
    start(){    // (A)
        gl.viewport(0, 0,this.size,this.size);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo );
        gl.clear(gl.DEPTH_BUFFER_BIT);
        
    }
    end(){
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
    
    }
}
/*
    Shadow map
*/
class ShadowMapProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, shadowVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shadowFragShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getUniformLocation(this.program, "uColor");
        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.viewLoc = gl.getUniformLocation(this.program, "uView");
        this.lightViewLoc = gl.getUniformLocation(this.program, "uLightView");
        this.lightProjectionLoc = gl.getUniformLocation(this.program, "uLightProjection");
        this.samplerLoc = gl.getUniformLocation(this.program, "uSampler");
        this.hasNormalsAttribLoc = gl.getUniformLocation(this.program, "uHasNormals");
        this.lightDirAttribLoc = gl.getUniformLocation(this.program, "uLightDir");  

        this.normalLoc  = gl.getUniformLocation(this.program, "normal");   
    }

    use() {
        // TODO: use program
        gl.useProgram(this.program);
    }
}

/*
    Render to screen program
*/
class RenderToScreenProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, depthVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, depthFragShaderSrc);
        
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.samplerLoc = gl.getUniformLocation(this.program, "uSampler");

        // TODO: Create quad VBO and VAO
        this.vert = [-1, -1, 0, 1, -1, 0, 1, 1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0];
      //(A7)  
        this.vertexBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vert));
        this.vao = createVAO(gl, this.posAttribLoc, this.vertexBuffer);
    }

    draw(texture) {
        // TODO: Render quad and display texture
        gl.useProgram(this.program);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.samplerLoc, 0);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

    }

}

/*
    Layer program
*/
class LayerProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, layerVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, layerFragShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getUniformLocation(this.program, "uColor");
        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.viewLoc = gl.getUniformLocation(this.program, "uView");

        
    }

    use() {
        gl.useProgram(this.program);
        
    }
}


/*
    Collection of layers
*/
class Layers {
    constructor() {
        this.layers = {};
        this.centroid = [0,0,0];
    }

    addLayer(name, vertices, indices, color, normals) {
        if(normals == undefined)
            normals = null;
        var layer = new Layer(vertices, indices, color, normals);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    removeLayer(name) {
        delete this.layers[name];
    }

    draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix = null, lightProjectionMatrix = null, shadowPass = false, texture = null) {
        for(var layer in this.layers) {
            if(layer == 'surface') {
                gl.polygonOffset(1, 1);
            }
            else {
                gl.polygonOffset(0, 0);
            }
            this.layers[layer].draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix, lightProjectionMatrix, shadowPass, texture);
        }
    }

    
    getCentroid() {
        var sum = [0,0,0];
        var numpts = 0;
        for(var layer in this.layers) {
            numpts += this.layers[layer].vertices.length/3;
            for(var i=0; i<this.layers[layer].vertices.length; i+=3) {
                var x = this.layers[layer].vertices[i];
                var y = this.layers[layer].vertices[i+1];
                var z = this.layers[layer].vertices[i+2];
    
                sum[0]+=x;
                sum[1]+=y;
                sum[2]+=z;
            }
        }
        return [sum[0]/numpts,sum[1]/numpts,sum[2]/numpts];
    }
}

/*
    Layers without normals (water, parks, surface)
*/

class Layer {
    constructor(vertices, indices, color, normals = null) {
        this.vertices = vertices;
        this.indices = indices;
        this.color = color;
        this.normals = normals;

        this.hasNormals = false;
        if(this.normals) {
            this.hasNormals = true;
        }
  
  
    }

    init() {
        this.layerProgram = new LayerProgram();
        this.shadowProgram = new ShadowMapProgram();

        this.vertexBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));
      

        if(this.normals) {
            console.log('has normal');
            this.normalBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.normals));
          
           this.vao = createVAO(gl, 0, this.vertexBuffer, 1, this.normalBuffer);
        }
        else {
       
         this.vao =createVAO(gl, 0, this.vertexBuffer);
        
        }

     
    }

    draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix, lightProjectionMatrix, shadowPass = false, texture = null) {
        // TODO: Handle shadow pass (using ShadowMapProgram) and regular pass (using LayerProgram)
       
        //(A3)
        if(shadowPass==false){
            //this.vao = createVAO(gl, this.layerProgram.posAttribLoc, this.vertexBuffer);
            this.layerProgram.use(); 
            gl.uniformMatrix4fv(this.layerProgram.modelLoc, false, new Float32Array(modelMatrix)) 
           // gl.uniformMatrix4fv(this.layerProgram.projectionLoc,false, new Float32Array(projectionMatrix))
           // gl.uniformMatrix4fv(this.layerProgram.viewLoc,false, new Float32Array(viewMatrix));

            gl.uniformMatrix4fv(this.layerProgram.projectionLoc , false, new Float32Array(lightProjectionMatrix))  ;
            gl.uniformMatrix4fv(this.layerProgram.viewLoc, false, new Float32Array(lightViewMatrix)) ;
            gl.uniform4fv(this.layerProgram.colorAttribLoc, this.color);
        }
        else{
           // this.vao = createVAO(gl, this.shadowProgram.posAttribLoc, this.vertexBuffer, this.shadowProgram.normalLoc, this.normalBuffer);
             
           
            //(A4)
            this.shadowProgram.use();
            gl.uniform1i(this.shadowProgram.hasNormalsAttribLoc,this.hasNormals);
            
            gl.uniformMatrix4fv(this.shadowProgram.modelLoc, false, new Float32Array(modelMatrix)) 
            gl.uniformMatrix4fv(this.shadowProgram.projectionLoc,false, new Float32Array(projectionMatrix))
            gl.uniformMatrix4fv(this.shadowProgram.viewLoc,false, new Float32Array(viewMatrix)); 
            gl.uniform4fv(this.shadowProgram.colorAttribLoc, this.color);

            gl.uniformMatrix4fv(this.shadowProgram.lightProjectionLoc , false, new Float32Array(lightProjectionMatrix))  ;
            gl.uniformMatrix4fv(this.shadowProgram.lightViewLoc, false, new Float32Array(lightViewMatrix)) ;

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(this.shadowProgram.samplerLoc, 0);
            

        }

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);


    }
}






/*
    Event handlers
*/
window.updateRotate = function() {
    currRotate = parseInt(document.querySelector("#rotate").value);
    
  
    if(!displayShadowmap){
    curR =  curR + (currRotate - prev_rs) ; //(B2)  (B3)
    
    prev_rs =  currRotate;
    }
   
}

window.updateLightRotate = function() {
    currLightRotate = parseInt(document.querySelector("#lightRotate").value);
     
   
    curR =  curR + (currLightRotate -prev_rl) ; //(B2)  (B3)
    
    prev_rl =  currLightRotate;

    
}

window.updateZoom = function() {
    currZoom = parseFloat(document.querySelector("#zoom").value);
}

window.updateProjection = function() {
    currProj = document.querySelector("#projection").value;
}

window.displayShadowmap = function(e) {
    displayShadowmap = e.checked;
}

/*
window.updateVar  =function(e){
    if(e.id == "go1"){
        v1  = parseInt(go1.value); 
        u1.textContent =v1; 
    }
    if(e.id == "go2"){
        v2  = parseInt(go2.value); 
        u2.textContent =v2; 
    }
    if(e.id == "go3"){
        v3  = parseInt(go3.value); 
       
        u3.textContent =v3; 
    }
    if(e.id == "go4"){
        v4  = parseInt(go4.value); 
        u4.textContent =v4; 
    }
}   */
/*
    File handler
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        console.log(parsed);
        for(var layer in parsed){
            var aux = parsed[layer];
            console.log("nor ",aux["normals"]);
            layers.addLayer(layer, aux['coordinates'], aux['indices'], aux['color'], aux['normals']);
        }
    }
    reader.readAsText(e.files[0]);
}

/*
    Update transformation matrices
*/


function updateModelMatrix(centroid) {
    
    var rotateZ = rotateZMatrix((currRotate+2*20) * Math.PI / 180.0);
    

    var position = translateMatrix(centroid[0],centroid[1], centroid[2]);
    var scale = translateMatrix(-centroid[0], -centroid[1], -centroid[2]);
    if(!displayShadowmap){
        modelMatrix  = multiplyArrayOfMatrices([
            position, // step 4
            rotateZ,
            scale     // step 1
        ]); 
    }
    else{
        modelMatrix =identityMatrix();
    }
 
}

function updateProjectionMatrix() {
   var aspect = window.innerWidth /  window.innerHeight;
    // TODO: Projection matrix
    // projectionMatrix =  perspectiveMatrix(40* Math.PI /180, aspect,10,50000 );
  
    if(currProj == "perspective"){
        projectionMatrix =  perspectiveMatrix(40* Math.PI /180, aspect,1,50000 );
    }
    else{
       
        var size = 4200 - (currZoom/100.0)*4200*0.99;
        projectionMatrix = orthographicMatrix(-aspect*size, aspect*size, -1*size, 1*size, -1, 50000);
    }
  

  
}

function updateViewMatrix(centroid){
    // TODO: View matrix


    var zoom = 4200 - (currZoom/100.0)*4200*(1+3/7)*0.99;
   
  
    //var camera = lookAt(add(centroid,[-200,-10*200+13*12,6*200]),centroid, [0,1,1]);    
   var camera = lookAt(add(centroid,[-200,-10*200+16*30,6*200-90]),centroid, [0,0,1]);   // tune for a desire view of eye. infront and view down a bit
     
    var position  = translateMatrix(0,0,-zoom);
    var world2view = multiplyArrayOfMatrices([  
        position,
 
        camera
    ]);

    viewMatrix =world2view; 

 

  
}

function updateLightViewMatrix(centroid) {
    // TODO: Light view matrix
   

  // var x = (sta) * Math.cos((currRotate)*Math.PI / 180.0);
  //  var y= sta * Math.sin((currRotate)*Math.PI / 180.0); 

  if(!displayShadowmap){
    
    var sta =2020+(-20)*30;

    var x = (sta) * Math.cos((curR) *Math.PI / 180.0);  //(B1)
   var y = (sta) * Math.sin((curR)*Math.PI / 180.0); 
    var camera =lookAt(add(centroid,[-x,y,sta]),centroid, [0,0,1]); //(B3)
  }
  else{
    var sta =2020; // tune to make sure texture not full black or white 
    var x = (sta+6*500) * Math.cos(curR*Math.PI / 180.0); // change view of light camera  so it our eye is in front and nearly on neck 
    var y = (sta+5*500) * Math.sin(curR*Math.PI / 180.0); 
      var camera = lookAt(add(centroid,[x,y,sta]),centroid, [0,0,1]);  
  }
  
    
    
    lightViewMatrix   =camera ; 
   
   
}

function updateLightProjectionMatrix() {
    // TODO: Light projection matrix
    var aspect = window.innerWidth /  window.innerHeight;
    
    
   // lightProjectionMatrix =  perspectiveMatrix(40* Math.PI /180, aspect,1,5000 );
   
   // var maxzoom =300*11+1000;
   if(!displayShadowmap){
    var maxzoom =2200;
    //far 20*820
    //20*820-4400+(-60+v3)*120  20*820-10000+(-22)*100
    //2700+20*40   4500+v2*15 4200+(v2*23)  4200+((-24)*22) 40000+((-40+v2)*700) 

    // tune far plane to make model not dwell in black and reduce shadow acnes
    lightProjectionMatrix = orthographicMatrix(-aspect*maxzoom, aspect*maxzoom, -1*maxzoom, 1*maxzoom, -1, 820*20 ); 
   }
   else {
    var maxzoom =1000+4*100;   
    // tune far plane to make sure texture not full black or white 
    lightProjectionMatrix = orthographicMatrix(-aspect*maxzoom, aspect*maxzoom, -1*maxzoom, 1*maxzoom, -1, 14*800); 
   }

   
   
}








/*
    Main draw function (should call layers.draw)
*/

function draw() {
      // TODO: First rendering pass, rendering using FBO
    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  fbo.start();
    updateModelMatrix(layers.centroid); 
    updateProjectionMatrix(); 
    updateViewMatrix(layers.centroid); 
    updateLightViewMatrix(layers.centroid);
    updateLightProjectionMatrix();
    //(A2) 
   layers.draw(modelMatrix, viewMatrix, projectionMatrix,lightViewMatrix,lightProjectionMatrix, false ,null);
   
   fbo.end();   



   gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
 //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   if(!displayShadowmap) {

    
        //(A4)
        layers.draw(modelMatrix, viewMatrix, projectionMatrix,lightViewMatrix,lightProjectionMatrix ,true ,fbo.texture);
    }
    else {
        
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        //(A7)
        renderToScreen.draw(fbo.texture);
        // TODO: Render shadowmap texture computed in first pass

    }       

    requestAnimationFrame(draw);

}

/*
    Initialize everything
*/
function initialize() {

    var canvas = document.querySelector("#glcanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl = canvas.getContext("webgl2");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.enable(gl.POLYGON_OFFSET_FILL);

    layers = new Layers();
 
    renderToScreen = new RenderToScreenProgram();
    fbo= new FBO(currResolution); 
    window.requestAnimationFrame(draw);

}


window.onload = initialize;