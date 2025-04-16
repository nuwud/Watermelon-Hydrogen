#ifdef GL_ES
precision mediump float;

uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float dist = distance(vUv, vec2(0.5));
  float glow = smoothstep(0.4, 0.2, dist);
  gl_FragColor = vec4(uColor * glow, glow * uOpacity);
}
