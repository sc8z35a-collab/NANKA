// 空を周回する白い鳥の群れ (簡易ボイド, InstancedMesh, 羽ばたきは頂点シェーダ)
export function createBirds({ app, world, scene, THREE }) {
  const N = 36;
  const R = (world?.bounds?.radius || 60) * 1.25;
  // くの字の鳥形 (翼端は x=±1)
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0.5,   -1.1, 0.0, -0.1,   0, 0, -0.35,
    0, 0, 0.5,    0, 0, -0.35,      1.1, 0.0, -0.1,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', side: THREE.DoubleSide, roughness: 0.8 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = { value: 0 }; mat.userData.sh = sh;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float ph = float(gl_InstanceID) * 1.7;
      transformed.y += abs(position.x) * sin(uTime * 9.0 + ph) * 0.55;`);
  };
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false; mesh.castShadow = true;
  scene.add(mesh);
  const B = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    B.push({ p: new THREE.Vector3(Math.cos(a) * R, 30 + Math.random() * 12, Math.sin(a) * R),
      v: new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(8) });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.1, 1.1, 1.1);
  const acc = new THREE.Vector3(), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), z = new THREE.Vector3(0, 0, 1);
  const leader = new THREE.Vector3();
  return {
    update(dt, t) {
      if (mat.userData.sh) mat.userData.sh.uniforms.uTime.value = t;
      // 群れの目標点: 島の周りを大きく8の字に
      leader.set(Math.cos(t * 0.07) * R, 34 + Math.sin(t * 0.21) * 8, Math.sin(t * 0.14) * R * 0.8);
      for (let i = 0; i < N; i++) {
        const b = B[i]; acc.set(0, 0, 0);
        tmp.copy(leader).sub(b.p).multiplyScalar(0.02); acc.add(tmp);           // 目標へ
        for (let j = 0; j < N; j++) { if (i === j) continue;                    // 分離 + 整列
          tmp.copy(b.p).sub(B[j].p); const d2 = tmp.lengthSq();
          if (d2 < 9) acc.addScaledVector(tmp, 0.9 / (d2 + 0.1));
          else if (d2 < 100) acc.addScaledVector(B[j].v, 0.004);
        }
        b.v.addScaledVector(acc, dt * 3);
        const sp = b.v.length(); if (sp > 11) b.v.multiplyScalar(11 / sp); if (sp < 6) b.v.multiplyScalar(6 / sp);
        b.p.addScaledVector(b.v, dt);
        tmp.copy(b.v).normalize(); q.setFromUnitVectors(z, tmp);
        m.compose(b.p, q, s); mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
