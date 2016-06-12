#version 300 es
precision mediump float;

layout(location = 0) in vec3 vertPosition;
layout(location = 1) in vec3 vertNormal;
layout(location = 2) in vec2 vertTexCoord;
out vec3 fragPos;
out vec3 fragNormal;
out vec2 fragTexCoord;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main() {
	fragNormal = (transpose(inverse(view * model)) * vec4(vertNormal, 1.0)).xyz;
	fragTexCoord = vertTexCoord;
	fragPos = (view * model * vec4(vertPosition, 1.0)).xyz;
	gl_Position = projection * view * model * vec4(vertPosition, 1.0);

	//gl_Position = vec4(vertPosition, 1.0);
	//fragPos = vertPosition;
    //fragTexCoord = vec2(vertPosition.xy * 0.5) + vec2(0.5);
}