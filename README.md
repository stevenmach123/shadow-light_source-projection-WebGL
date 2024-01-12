## Computer Graphics I - Shadow maps
## Link
  - https://stevenmach123.github.io/shadow-light_source-projection-WebGL/
### How to run the program 
  1. Download or clone repository.
  2. Load JSON file of cities eg.Chicago.json Manhattan.json on same folder when click Choose File. Then will see building with shadows in perspective view by default. 
  3. Slider Rotate Camera will rotate the model. Change projection with perspective or orthogonal will change our view of model. Not how light source project. Light source by default is orthogonal   
  4. Slider Projection, gonna rotate the light source, so will observe the shadow change direction as response to now light direction project on. Then, you will see as Rotate the Camera, the shadow behind building expect to stick with building in same position as model not rotate. 


#### NOTE: the alphabet , can infer to alphabet on code portion where I want to  place.  

### On draw() + bind FBO + layers.draw()  of view of lightSource
+ (A) We want start to bind (the view of light source to the model)  to FBO, such we need create texture given depth component, then bind to frameBuffer . So,(A2)  our render of (the view of light source to the model) will be transfer to frameBuffer to depth texture. 

+ (A3) to create the view of camera similar to view of light projection, we have shadowPass =false, and texture = null, and its important to send lightViewMatrix and lightProjectionMatrix. So in Layer() of each render object, will have projectionLoc intake projectionLightMatrix , and viewLoc intake viewLightMatrix, and  modelLoc and positionAttribLoc is from the building.  

### On draw() + ShadowProgram +  vLightSpacePos  +  shadowCalculation with depth texture

+ (A4) when shadowPass = true, when want to pass texture of model created earlier, so it can be used in shadowFrag to compute the depth of ortho light projection  on top surface of building. And take account vNormal to give color to upward building fragment. 

+ (A5) in shadowVert, vLightSpacePos have lightProjectionMatrix and lightViewMatrix multiplied with word_Model like (A3), but this time we use this project direction of light source to building is independent from our eye on world_model as gl_Postion = uProjection * uView  *uModel* vec4(position, 1);

+ (A6), in shadowFrag,  shadowCalculation(vec4 lightSpacePos) take this vLightSpacePos and texture from uSampler to compute depth light(in particular direction) to building fragments;  and currentDepth = projCoords.z will be depth of shadow to determine whether fragments behind buildings are in shadow or not. 


### On draw() + First Render + renderToScreenProgram() 

+ (A7)  Create vert to have coordinate   in -1 to 1, and pass to this.posAtribLoc in depthVert.  vTexturecoord need to position itself in center of the screen, so want to have texture coordinate is  vec2(position.xy*0.5+0.5); (around 0 to 1) 
+ (A8) create depth from this.uSampler(this.texture of fbo) and  vTextCoord, have .r to generate the depth color. 


### curR +  updateLightRotate() + updateRotate()   + updateModelMatrix(centroid) +  updateLightViewMatrix(centroid)

+ (B1) Allow shadow staying same direction behind building despite our eye position change(currRotate modified  modelMatrix -change uModel of glPostion  ).  We need  lightViewMatrix to change when either Rotate Camera(change currRotate) and  Rotate Light(change currLightRotate) by assign common curR  instead of currLightRotate to x,y of lookAt(add(centroid,[-x,y,sta])  in updateLightViewMatrix(centroid). 

+ (B2) Such curR change when trigger curR =  curR + (currRotate - prev_rs) in updateRotate() or  curR =  curR + (currLightRotate -prev_rl) in updateLightRotate().  curR change by 1 or  -1 at the time by have (currRotate - prev_rs).  

+ (B3) We agreed that if we start at curR changed by (currRotate - prev_rl), then trigger updateRotate(), curR is last update of  updateLightRotate() before any of (currRotate - prev_rs) modifying curR (vice versa if from updateRotate() to updateLightRotate(). ) .  lookAt(add(centroid,[-x,y,sta])  will guaranteed  viewLightMatrix change view of light as follow same rotational direction  of glPosition = uProjection *uView *uModel* vec4(position,1) during (currRotate - prev_rs) change continuously. Just by personal testing exp, if lookAt(add(centroid,[x,y,sta])  then during  trigger updateRotate(), shadow rotate in opposite direction. 


