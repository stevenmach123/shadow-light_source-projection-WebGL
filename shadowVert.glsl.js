export default `#version 300 es


uniform mat4 uModel;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uLightView;
uniform mat4 uLightProjection;
uniform vec4 uColor;
uniform vec3 uLightDir;


vec3 lightDir;
uniform bool uHasNormals;

layout (location = 0) in vec3 position;
layout (location = 1)  in vec3 normal;

out vec3 vNormal;
out vec3 vLightDir;
out vec4 vColor;
out vec4 vLightSpacePos;


void main() {
//(A5)
gl_Position =uProjection * uView  *uModel* vec4(position, 1);
  
    // TODO: If has normals, compute color considering it
    // TODO: compute light space position and gl_Position

    
    if(uHasNormals){
       // (A4)
        lightDir  = normalize(vec3(1,0,1)); 
        float dotp = max(dot(lightDir,normal),0.25);
        vColor = vec4(dotp*uColor.rgb,1);
    }
    else{ 
       vColor = uColor;
   
    }
    //(A5) 
    vec4 world_model  =  uModel*vec4(position,1);
    mat4 LightSpaceMatrix =uLightProjection *uLightView ;

    vLightSpacePos = uLightProjection *uLightView * vec4(world_model.xyz,1);     
    vNormal =  normal; 
    vLightDir = lightDir;

}
`;