import assert from "node:assert/strict";
import test from "node:test";
import { daeDoPiso, malhasDoPiso, objDoPiso, tdsDoPiso, zipStore } from "./export3d.ts";
import { defaultProject, setSuperficie } from "./model.ts";

test("o 3D do piso padrão sai em metros, com tablado e textura", () => {
  const dae = daeDoPiso(defaultProject());
  assert.match(dae, /<unit name="meter" meter="1"\/>/);
  assert.match(dae, /<up_axis>Y_UP<\/up_axis>/);
  assert.match(dae, /tablado\.png/);
  const malhas = malhasDoPiso(defaultProject());
  assert.ok(malhas.some((malha) => malha.id === "tablado" && malha.idx.length > 0));
  assert.ok(malhas.every((malha) => malha.pos.every((n) => Number.isFinite(n))));
  const zip = zipStore([{ name: "doc.kml", data: new TextEncoder().encode("<kml/>") }]);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
});

test("KMZ abaixo de 1,00 m não leva cano em X", () => {
  assert.equal(
    malhasDoPiso(defaultProject()).some((malha) => malha.id === "cano"),
    false,
  );
  const alto = malhasDoPiso(setSuperficie(defaultProject(), 1)).find((malha) => malha.id === "cano");
  assert.ok((alto?.idx.length ?? 0) > 0);
});

test("OBJ sai em metros, com a cor de cada peça, e sem cano abaixo de 1,00 m", () => {
  const baixo = objDoPiso(defaultProject());
  assert.match(baixo.obj, /mtllib piso-principal\.mtl/);
  assert.match(baixo.obj, /^v /m);
  assert.match(baixo.obj, /usemtl Tablado/);
  assert.match(baixo.obj, /usemtl Pe/);
  assert.doesNotMatch(baixo.obj, /Cano em X/);
  assert.doesNotMatch(baixo.obj, /Guarda-corpo/);
  assert.match(baixo.mtl, /newmtl Tablado/);
  assert.match(baixo.mtl, /Kd 0\.769 0\.647 0\.455/);
  const face = baixo.obj.match(/^f (\d+)\/\1\/\1 /m);
  assert.ok(face);
  const alto = objDoPiso(setSuperficie(defaultProject(), 1));
  assert.match(alto.obj, /usemtl Cano em X/);
  assert.match(alto.mtl, /newmtl Cano em X/);
});

test("3DS abre no SketchUp, em polegadas, sem cano abaixo de 1,00 m", () => {
  const polegadas = 39.37007874015748;
  const baixo = ler3ds(tdsDoPiso(defaultProject()));
  assert.ok(baixo.nomes.includes("Tablado"));
  assert.ok(baixo.nomes.includes("Pe"));
  assert.ok(baixo.nomes.includes("Frente"));
  assert.ok(baixo.nomes.includes("Fundo"));
  assert.ok(baixo.nomes.includes("Interna"));
  assert.equal(baixo.nomes.includes("Cano"), false);
  assert.equal(baixo.nomes.includes("Guarda"), false);
  assert.ok(baixo.materiais.includes("Tablado"));
  assert.deepEqual(baixo.cor, [196, 165, 116]);
  assert.equal(baixo.escala, 1);
  assert.ok(Math.abs(baixo.zMax - 0.8 * polegadas) < 0.05);
  assert.ok(baixo.xMax > 7.5 * polegadas);
  assert.ok(baixo.yMax > 3.5 * polegadas);
  const alto = ler3ds(tdsDoPiso(setSuperficie(defaultProject(), 1)));
  assert.ok(alto.nomes.includes("Cano"));
  assert.ok(Math.abs(alto.zMax - 1 * polegadas) < 0.05);
});

function ler3ds(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  assert.equal(view.getUint16(0, true), 0x4d4d);
  assert.equal(view.getUint32(2, true), data.length);
  const nomes: string[] = [];
  const materiais: string[] = [];
  let zMax = -Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  let escala = 0;
  let cor: number[] = [];
  const texto = (em: number) => {
    let fim = em;
    let nome = "";
    while (fim < data.length && data[fim] !== 0) {
      nome += String.fromCharCode(data[fim]);
      fim += 1;
    }
    return { nome, depois: fim + 1 };
  };
  const caminhar = (inicio: number, fim: number) => {
    let cursor = inicio;
    while (cursor + 6 <= fim) {
      const id = view.getUint16(cursor, true);
      const tamanho = view.getUint32(cursor + 2, true);
      assert.ok(tamanho >= 6 && cursor + tamanho <= fim);
      const dados = cursor + 6;
      const limite = cursor + tamanho;
      if (id === 0x4d4d || id === 0x3d3d || id === 0xafff || id === 0xa010 || id === 0xa020) caminhar(dados, limite);
      else if (id === 0x0002 || id === 0x3d3e) assert.equal(view.getUint32(dados, true), 3);
      else if (id === 0x0100) escala = view.getFloat32(dados, true);
      else if (id === 0x0011 && cor.length === 0) cor = [data[dados], data[dados + 1], data[dados + 2]];
      else if (id === 0xa000) materiais.push(texto(dados).nome);
      else if (id === 0x4000) {
        const nome = texto(dados);
        assert.ok(nome.nome.length >= 1 && nome.nome.length <= 10);
        nomes.push(nome.nome);
        caminhar(nome.depois, limite);
      } else if (id === 0x4100) {
        let vertices = 0;
        let interno = dados;
        while (interno + 6 <= limite) {
          const filho = view.getUint16(interno, true);
          const faixa = view.getUint32(interno + 2, true);
          assert.ok(faixa >= 6 && interno + faixa <= limite);
          if (filho === 0x4110) {
            vertices = view.getUint16(interno + 6, true);
            assert.ok(vertices > 0 && vertices <= 65535);
            assert.equal(faixa, 6 + 2 + vertices * 12);
            for (let i = 0; i < vertices; i++) {
              const o = interno + 8 + i * 12;
              const x = view.getFloat32(o, true);
              const y = view.getFloat32(o + 4, true);
              const z = view.getFloat32(o + 8, true);
              assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
              xMax = Math.max(xMax, x);
              yMax = Math.max(yMax, y);
              zMax = Math.max(zMax, z);
            }
          } else if (filho === 0x4120) {
            const faces = view.getUint16(interno + 6, true);
            assert.ok(faces > 0 && faces <= 65535);
            for (let f = 0; f < faces; f++) {
              const o = interno + 8 + f * 8;
              for (let k = 0; k < 3; k++) assert.ok(view.getUint16(o + k * 2, true) < vertices);
            }
          }
          interno += faixa;
        }
        assert.equal(interno, limite);
      }
      cursor += tamanho;
    }
    assert.equal(cursor, fim);
  };
  caminhar(0, data.length);
  return { nomes, materiais, zMax, xMax, yMax, escala, cor };
}
