export default `#version 300 es
precision highp float;

uniform sampler2D uSampler;

in vec2 vTexcoord;
out vec4 outColor;


void main() {
     
    // TODO: sample from uSampler and output value
    // (A8)
    vec4 tx  = texture(uSampler, vTexcoord);
     float depth = tx.r;
    outColor = vec4(vec3(depth),1);
}   
`;