export default `#version 300 es

layout (location = 0) in vec3 position;
out vec2 vTexcoord;

void main() {
    gl_Position = vec4(position, 1);
    
    // TODO: send vTexcoord to fragment shader with texture coordinates
    
    //(A7)
    vTexcoord  = vec2(position.xy*0.5+0.5);
    
}    
`;

