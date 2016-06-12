#version 300 es
precision highp float;

in vec3 fragPos;
in vec3 fragNormal;
in vec2 fragTexCoord;

uniform float ExpFresnel;

out vec2 fragColor;

void main() {
    vec3 N = normalize(fragNormal);
    vec3 P = fragPos;
    vec3 I = normalize(P);
    float cosTheta = abs(dot(I, N));
    float fresnel = pow(1.0 - cosTheta, ExpFresnel);
    float depth = gl_FrontFacing ? gl_FragCoord.z : -gl_FragCoord.z;
    fragColor = vec2(depth, fresnel);
}
