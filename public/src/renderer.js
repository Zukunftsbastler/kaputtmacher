// WebGL2 renderer: voxel meshes, instanced cubes, billboards and the sky.
// Everything is drawn relative to a focus point and bent downwards with distance from it,
// which turns the flat wrapping world into a small planet on screen.

const CURVE = `
uniform float u_curv;
vec3 curve(vec3 rel) { rel.y -= dot(rel.xz, rel.xz) * u_curv; return rel; }
`;

const VOXEL_VS = `#version 300 es
layout(location=0) in vec4 a_pos;
layout(location=1) in vec4 a_col;
uniform mat4 u_vp, u_model;
uniform vec3 u_sun, u_eye, u_origin;
${CURVE}
out vec3 v_col; out float v_light; out float v_dist; out vec2 v_flat; out float v_em; out float v_y; out vec3 v_cell;
const vec3 N[6] = vec3[6](vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1));
const vec3 U[6] = vec3[6](vec3(0,1,0), vec3(0,0,1), vec3(0,0,1), vec3(1,0,0), vec3(1,0,0), vec3(0,1,0));
const vec3 V[6] = vec3[6](vec3(0,0,1), vec3(0,1,0), vec3(1,0,0), vec3(0,0,1), vec3(0,1,0), vec3(1,0,0));
void main() {
  int p = int(a_pos.w);
  float ao = float((p >> 3) & 3);
  // Merged faces of different sizes meet in T-junctions; growing every quad by a hair closes the pin-hole gaps.
  int corner = (p >> 5) & 3;
  vec3 grow = U[p & 7] * (corner == 1 || corner == 2 ? 0.012 : -0.012) + V[p & 7] * (corner >= 2 ? 0.012 : -0.012);
  vec3 rel = (u_model * vec4(a_pos.xyz + grow, 1.0)).xyz;
  vec3 n = normalize(mat3(u_model) * N[p & 7]);
  v_light = (0.5 + 0.18 * n.y + 0.55 * max(dot(n, u_sun), 0.0)) * (0.55 + 0.15 * ao);
  v_col = a_col.rgb; v_em = a_col.a; v_flat = rel.xz; v_y = rel.y;
  v_cell = a_pos.xyz - N[p & 7] * 0.5 + u_origin; // a point inside the voxel this face belongs to
  rel = curve(rel);
  v_dist = length(rel - u_eye);
  gl_Position = u_vp * vec4(rel, 1.0);
}`;

const VOXEL_FS = `#version 300 es
precision highp float;
in vec3 v_col; in float v_light; in float v_dist; in vec2 v_flat; in float v_em; in float v_y; in vec3 v_cell;
uniform vec3 u_fog; uniform float u_fogDist, u_cap2, u_alpha, u_holeY; uniform vec4 u_tint, u_hole;
out vec4 o;
void main() {
  if (dot(v_flat, v_flat) > u_cap2) discard;
  // Peephole: whatever stands between the camera and the monster is cut away around it.
  if (u_hole.z > 0.0 && v_dist < u_hole.w && v_y > u_holeY) {
    // Fully open in the middle, thinning out towards the rim in four dither steps.
    float d = distance(gl_FragCoord.xy, u_hole.xy) / u_hole.z;
    float keep = smoothstep(0.6, 1.0, d);
    if (keep <= fract(dot(floor(gl_FragCoord.xy), vec2(0.5, 0.25))) + 0.12) discard;
  }
  // Every voxel gets a slightly different shade, so merged faces still read as single cubes.
  ivec3 ic = ivec3(floor(v_cell));
  uint n = uint(ic.x) * 374761393u + uint(ic.y) * 668265263u + uint(ic.z) * 1274126177u;
  n = (n ^ (n >> 13u)) * 1103515245u;
  float shade = 0.9 + 0.14 * float((n ^ (n >> 16u)) & 0xffffu) / 65535.0;
  vec3 c = mix(v_col * v_light * shade, v_col * 1.35, v_em);
  c = mix(c, u_tint.rgb, u_tint.a);
  float f = clamp(v_dist / u_fogDist, 0.0, 1.0);
  c = mix(c, u_fog, f * f * 0.85);
  // Towards the edge of the visible cap everything dissolves into the horizon haze, so nothing pops in.
  c = mix(c, u_fog, smoothstep(0.62, 1.0, dot(v_flat, v_flat) / u_cap2));
  o = vec4(c, u_alpha);
}`;

const CUBE_VS = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec3 i_pos;
layout(location=3) in vec3 i_scale;
layout(location=4) in vec2 i_rot;
layout(location=5) in vec4 i_col;
uniform mat4 u_vp; uniform vec3 u_sun, u_eye; uniform vec2 u_focus; uniform float u_wrap;
${CURVE}
out vec3 v_col; out float v_light; out float v_dist; out float v_em;
vec3 rot(vec3 v) {
  float c = cos(i_rot.y), s = sin(i_rot.y);
  v = vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
  c = cos(i_rot.x); s = sin(i_rot.x);
  return vec3(v.x * c + v.z * s, v.y, v.z * c - v.x * s);
}
void main() {
  vec3 rel = i_pos - vec3(u_focus.x, 0.0, u_focus.y);
  if (u_wrap > 0.0) rel.xz = mod(rel.xz + 0.5 * u_wrap, u_wrap) - 0.5 * u_wrap;
  rel = curve(rel) + rot(a_pos * i_scale);
  vec3 n = rot(a_nrm);
  v_light = 0.55 + 0.18 * n.y + 0.5 * max(dot(n, u_sun), 0.0);
  v_col = i_col.rgb; v_em = i_col.a;
  v_dist = length(rel - u_eye);
  gl_Position = u_vp * vec4(rel, 1.0);
}`;

const CUBE_FS = `#version 300 es
precision highp float;
in vec3 v_col; in float v_light; in float v_dist; in float v_em;
uniform vec3 u_fog; uniform float u_fogDist;
out vec4 o;
void main() {
  vec3 c = mix(v_col * v_light, v_col * 1.4, v_em);
  float f = clamp(v_dist / u_fogDist, 0.0, 1.0);
  o = vec4(mix(c, u_fog, f * f * 0.85), 1.0);
}`;

const BILL_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec4 i_ps;
layout(location=2) in vec4 i_col;
layout(location=3) in float i_add;
uniform mat4 u_vp; uniform vec3 u_right, u_up; uniform vec2 u_focus; uniform float u_wrap;
${CURVE}
out vec2 v_uv; out vec4 v_col; out float v_add;
void main() {
  vec3 rel = i_ps.xyz - vec3(u_focus.x, 0.0, u_focus.y);
  if (u_wrap > 0.0) rel.xz = mod(rel.xz + 0.5 * u_wrap, u_wrap) - 0.5 * u_wrap;
  rel = curve(rel) + (u_right * a_pos.x + u_up * a_pos.y) * i_ps.w;
  v_uv = a_pos; v_col = i_col; v_add = i_add;
  gl_Position = u_vp * vec4(rel, 1.0);
}`;

const BILL_FS = `#version 300 es
precision highp float;
in vec2 v_uv; in vec4 v_col; in float v_add;
out vec4 o;
void main() {
  float a = smoothstep(1.0, 0.25, length(v_uv)) * v_col.a;
  o = vec4(v_col.rgb * a, a * (1.0 - v_add));
}`;

const SKY_VS = `#version 300 es
out float v_y;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  v_y = p.y;
  gl_Position = vec4(p, 0.9999, 1.0);
}`;

const SKY_FS = `#version 300 es
precision highp float;
in float v_y;
uniform vec3 u_top, u_low; uniform float u_horizon;
out vec4 o;
void main() { o = vec4(mix(u_low, u_top, smoothstep(0.0, 1.1, v_y - u_horizon)), 1.0); }`;

const CUBE = (() => {
  const f = [], faces = [[1, 0, 0, 0, 1, 0, 0, 0, 1], [-1, 0, 0, 0, 0, 1, 0, 1, 0], [0, 1, 0, 0, 0, 1, 1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, 0, 1, 0, 1, 0, 0]];
  for (const [nx, ny, nz, ux, uy, uz, vx, vy, vz] of faces)
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]])
      f.push((nx + a * ux + b * vx) / 2, (ny + a * uy + b * vy) / 2, (nz + a * uz + b * vz) / 2, nx, ny, nz);
  return new Float32Array(f);
})();

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.canvas = canvas;
    this.voxel = this.program(VOXEL_VS, VOXEL_FS);
    this.cube = this.program(CUBE_VS, CUBE_FS);
    this.bill = this.program(BILL_VS, BILL_FS);
    this.sky = this.program(SKY_VS, SKY_FS);
    this.pixelScale = 1;

    // One index buffer serves every quad mesh.
    this.ibo = gl.createBuffer();
    this.iboQuads = 0;
    this.ensureQuads(1 << 14);

    this.cubeVao = gl.createVertexArray();
    gl.bindVertexArray(this.cubeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, CUBE, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    this.cubeInst = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeInst);
    const ci = [[2, 3, 0], [3, 3, 12], [4, 2, 24], [5, 4, 32]];
    for (const [loc, n, off] of ci) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 48, off); gl.vertexAttribDivisor(loc, 1); }

    this.billVao = gl.createVertexArray();
    gl.bindVertexArray(this.billVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.billInst = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.billInst);
    const bi = [[1, 4, 0], [2, 4, 16], [3, 1, 32]];
    for (const [loc, n, off] of bi) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 36, off); gl.vertexAttribDivisor(loc, 1); }

    this.skyVao = gl.createVertexArray();
    gl.bindVertexArray(null);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  program(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }

  ensureQuads(n) {
    if (n <= this.iboQuads) return;
    const gl = this.gl;
    let cap = Math.max(this.iboQuads, 1 << 14);
    while (cap < n) cap *= 2;
    const idx = new Uint32Array(cap * 6);
    for (let q = 0; q < cap; q++) idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.iboQuads = cap;
  }

  createMesh(data, quads) {
    const gl = this.gl;
    this.ensureQuads(quads);
    const vao = gl.createVertexArray(), vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.SHORT, false, 12, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 12, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bindVertexArray(null);
    return { vao, vbo, quads };
  }

  deleteMesh(m) {
    if (!m) return;
    this.gl.deleteVertexArray(m.vao);
    this.gl.deleteBuffer(m.vbo);
  }

  resize() {
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2) * this.pixelScale;
    const w = Math.max(2, Math.round(c.clientWidth * dpr)), h = Math.max(2, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.gl.viewport(0, 0, w, h);
  }

  // cam: { vp, eye[3], right[3], up[3], focusX, focusZ, curv, wrap, cap2, top[3], low[3], horizon, fogDist }
  begin(cam) {
    const gl = this.gl;
    this.cam = cam;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.depthMask(false);
    gl.useProgram(this.sky.p);
    gl.uniform3fv(this.sky.u.u_top, cam.top);
    gl.uniform3fv(this.sky.u.u_low, cam.low);
    gl.uniform1f(this.sky.u.u_horizon, cam.horizon);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);

    for (const pr of [this.voxel, this.cube, this.bill]) {
      gl.useProgram(pr.p);
      gl.uniformMatrix4fv(pr.u.u_vp, false, cam.vp);
      gl.uniform1f(pr.u.u_curv, cam.curv);
      if (pr.u.u_sun) gl.uniform3f(pr.u.u_sun, 0.42, 0.82, 0.38);
      if (pr.u.u_eye) gl.uniform3fv(pr.u.u_eye, cam.eye);
      if (pr.u.u_fog) { gl.uniform3fv(pr.u.u_fog, cam.low); gl.uniform1f(pr.u.u_fogDist, cam.fogDist); }
      if (pr.u.u_focus) { gl.uniform2f(pr.u.u_focus, cam.focusX, cam.focusZ); gl.uniform1f(pr.u.u_wrap, cam.wrap); }
    }
    gl.useProgram(this.voxel.p);
    gl.uniform1f(this.voxel.u.u_cap2, cam.cap2);
  }

  // x, y: centre in device pixels; r: radius in pixels (0 = off); dist: only fragments nearer than this are cut; minY: and only above this height.
  setHole(x, y, r, dist, minY) {
    const gl = this.gl;
    gl.useProgram(this.voxel.p);
    gl.uniform4f(this.voxel.u.u_hole, x, y, r, dist);
    gl.uniform1f(this.voxel.u.u_holeY, minY);
  }

  // Draws a voxel mesh. alpha < 1 draws it see-through (used for the demonstration ghost).
  drawMesh(mesh, model, alpha = 1, tint = null, ox = 0, oy = 0, oz = 0) {
    const gl = this.gl, u = this.voxel.u;
    if (!mesh || !mesh.quads) return;
    gl.useProgram(this.voxel.p);
    gl.uniformMatrix4fv(u.u_model, false, model);
    gl.uniform3f(u.u_origin, ox, oy, oz); // world position of the mesh origin, keeps the per-voxel shade stable
    gl.uniform1f(u.u_alpha, alpha);
    if (tint) gl.uniform4fv(u.u_tint, tint); else gl.uniform4f(u.u_tint, 0, 0, 0, 0);
    if (alpha < 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.quads * 6, gl.UNSIGNED_INT, 0);
  }

  drawCubes(data, count) {
    if (!count) return;
    const gl = this.gl;
    gl.useProgram(this.cube.p);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.cubeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeInst);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 12), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);
  }

  drawBillboards(data, count) {
    if (!count) return;
    const gl = this.gl;
    gl.useProgram(this.bill.p);
    gl.uniform3fv(this.bill.u.u_right, this.cam.right);
    gl.uniform3fv(this.bill.u.u_up, this.cam.up);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.billVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.billInst);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 9), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  }
}
