#version 300 es
precision highp float;
uniform sampler2D dataTexture;
uniform vec3 Kd;
uniform float Sigma;
uniform bool TronEffect;
out vec4 fragColor;
in vec2 texCoord;
void main() {
    vec2 tex = texture(dataTexture, texCoord).rg;
    float thickness = abs(tex.r);
    if (thickness <= 0.0) discard;
    float fresnel;
    fresnel = TronEffect? tex.g : (1.0 - 0.5 * tex.g);
    float intensity = fresnel * exp(-Sigma * thickness);    // http://omlc.org/classroom/ece532/class3/muadefinition.html
    fragColor = vec4(intensity * Kd, 1.0);
}