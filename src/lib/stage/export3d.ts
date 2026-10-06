import { escalaDe, estruturaOf, metrics, slugNome, usaCanoX, type Project } from "./model.ts";

type Vec = { x: number; y: number; z: number };
type Malha = { id: string; nome: string; cor: string; arquivo: string; pos: number[]; nor: number[]; uv: number[]; idx: number[] };

function malha(id: string, nome: string, cor: string, arquivo: string): Malha {
  return { id, nome, cor, arquivo, pos: [], nor: [], uv: [], idx: [] };
}

function num(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function addFace(m: Malha, p0: Vec, p1: Vec, p2: Vec, p3: Vec) {
  const ux = p1.x - p0.x;
  const uy = p1.y - p0.y;
  const uz = p1.z - p0.z;
  const vx = p3.x - p0.x;
  const vy = p3.y - p0.y;
  const vz = p3.z - p0.z;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const pts = [p0, p1, p2, p3];
  const uvs = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const base = m.pos.length / 3;
  pts.forEach((p, i) => {
    m.pos.push(num(p.x), num(p.z), num(p.y));
    m.nor.push(num(nx), num(nz), num(ny));
    m.uv.push(uvs[i][0], uvs[i][1]);
  });
  const tri = [0, 1, 2, 0, 2, 3];
  for (const canto of tri) {
    const id = base + canto;
    m.idx.push(id, id, id);
  }
}

function addBox(m: Malha, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  const za = Math.min(z0, z1);
  const zb = Math.max(z0, z1);
  if (xb - xa < 0.004 || yb - ya < 0.004 || zb - za < 0.004) return;
  addFace(m, { x: xa, y: ya, z: zb }, { x: xb, y: ya, z: zb }, { x: xb, y: yb, z: zb }, { x: xa, y: yb, z: zb });
  addFace(m, { x: xa, y: yb, z: za }, { x: xb, y: yb, z: za }, { x: xb, y: ya, z: za }, { x: xa, y: ya, z: za });
  addFace(m, { x: xb, y: ya, z: za }, { x: xb, y: yb, z: za }, { x: xb, y: yb, z: zb }, { x: xb, y: ya, z: zb });
  addFace(m, { x: xa, y: yb, z: za }, { x: xa, y: ya, z: za }, { x: xa, y: ya, z: zb }, { x: xa, y: yb, z: zb });
  addFace(m, { x: xa, y: yb, z: za }, { x: xa, y: yb, z: zb }, { x: xb, y: yb, z: zb }, { x: xb, y: yb, z: za });
  addFace(m, { x: xb, y: ya, z: za }, { x: xb, y: ya, z: zb }, { x: xa, y: ya, z: zb }, { x: xa, y: ya, z: za });
}

function addHaste(m: Malha, a: Vec, b: Vec, raio: number) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.02) return;
  dx /= len;
  dy /= len;
  dz /= len;
  let ux = 0;
  let uy = 0;
  let uz = 1;
  if (Math.abs(dx * ux + dy * uy + dz * uz) > 0.85) {
    ux = 1;
    uz = 0;
  }
  let sx = dy * uz - dz * uy;
  let sy = dz * ux - dx * uz;
  let sz = dx * uy - dy * ux;
  const sl = Math.hypot(sx, sy, sz) || 1;
  sx = (sx / sl) * raio;
  sy = (sy / sl) * raio;
  sz = (sz / sl) * raio;
  const bx = (dy * sz - dz * sy) / raio * raio;
  const by = (dz * sx - dx * sz) / raio * raio;
  const bz = (dx * sy - dy * sx) / raio * raio;
  const quad = [
    { x: sx + bx, y: sy + by, z: sz + bz },
    { x: -sx + bx, y: -sy + by, z: -sz + bz },
    { x: -sx - bx, y: -sy - by, z: -sz - bz },
    { x: sx - bx, y: sy - by, z: sz - bz },
  ];
  const soma = (p: Vec, q: Vec): Vec => ({ x: p.x + q.x, y: p.y + q.y, z: p.z + q.z });
  for (let i = 0; i < 4; i++) {
    const q0 = quad[i];
    const q1 = quad[(i + 1) % 4];
    addFace(m, soma(a, q0), soma(a, q1), soma(b, q1), soma(b, q0));
  }
}

function inset(a: number, b: number, pad: number): [number, number] | null {
  const lo = Math.min(a, b) + pad;
  const hi = Math.max(a, b) - pad;
  if (hi - lo < 0.02) return null;
  return [lo, hi];
}

export function malhasDoPiso(project: Project): Malha[] {
  const est = estruturaOf(project);
  const { espessuraM } = metrics(project);
  const { x: sx, y: sy } = escalaDe(project);
  const secao = Math.min(project.secaoCm / 100, 0.34);
  const half = secao / 2;
  const perfilBase = Math.max(0.02, project.perfilCm / 100);
  const beamW = Math.min(secao * 0.72, 0.22);
  const plate = secao * 1.7;
  const plateH = 0.02;
  const perfilDe = (pe: number) => Math.min(perfilBase, Math.max(0.02, pe * 0.62));
  const deck = malha("tablado", "Tablado", project.colorDeck, "tablado.png");
  const pe = malha("pe", "Pe", project.colorLeg, "pe.png");
  const frente = malha("frente", "Travessa frente", project.colorBeamX, "frente.png");
  const fundo = malha("fundo", "Travessa fundo", project.colorBeamY, "fundo.png");
  const interna = malha("interna", "Travessa interna", project.colorInterna, "interna.png");
  const cano = malha("cano", "Cano em X", project.colorX, "cano.png");
  const guarda = malha("guarda", "Guarda-corpo", project.colorGuarda, "guarda.png");

  for (const perna of est.pernas) {
    const px = perna.x * sx + perna.ox;
    const py = perna.y * sy + perna.oy;
    const sapata = Math.min(plateH, perna.pe * 0.2);
    addBox(pe, px - plate / 2, py - plate / 2, 0, px + plate / 2, py + plate / 2, sapata);
    addBox(pe, px - half, py - half, sapata, px + half, py + half, perna.pe);
  }

  const viga = (m: Malha, dir: "x" | "y", x0: number, y0: number, x1: number, y1: number, altura: number) => {
    const perfil = perfilDe(altura);
    if (dir === "x") {
      const span = inset(x0, x1, half);
      if (!span) return;
      addBox(m, span[0], y0 - beamW / 2, altura - perfil, span[1], y0 + beamW / 2, altura);
    } else {
      const span = inset(y0, y1, half);
      if (!span) return;
      addBox(m, x0 - beamW / 2, span[0], altura - perfil, x0 + beamW / 2, span[1], altura);
    }
  };
  for (const item of est.vigasX) viga(frente, "x", item.x0 * sx, item.y0 * sy, item.x1 * sx, item.y1 * sy, item.pe);
  for (const item of est.vigasY) viga(fundo, "y", item.x0 * sx, item.y0 * sy, item.x1 * sx, item.y1 * sy, item.pe);
  for (const item of est.internas) viga(interna, item.dir, item.x0 * sx, item.y0 * sy, item.x1 * sx, item.y1 * sy, item.pe);

  const cruz = (dir: "x" | "y", x0: number, y0: number, x1: number, y1: number, altura: number) => {
    const span = inset(dir === "x" ? x0 : y0, dir === "x" ? x1 : y1, half);
    if (!span) return;
    const a = dir === "x" ? { x: span[0], y: y0, z: Math.min(plateH, altura * 0.2) } : { x: x0, y: span[0], z: Math.min(plateH, altura * 0.2) };
    const b = dir === "x" ? { x: span[1], y: y0, z: altura } : { x: x0, y: span[1], z: altura };
    const raio = Math.max(0.008, project.canoCm / 200);
    addHaste(cano, a, b, raio);
    addHaste(cano, { x: b.x, y: b.y, z: a.z }, { x: a.x, y: a.y, z: b.z }, raio);
  };
  for (const item of est.vigasX) {
    if (!usaCanoX(item.superficie)) continue;
    cruz("x", item.x0 * sx, item.y0 * sy, item.x1 * sx, item.y1 * sy, item.pe);
  }
  for (const item of est.vigasY) {
    if (!usaCanoX(item.superficie)) continue;
    cruz("y", item.x0 * sx, item.y0 * sy, item.x1 * sx, item.y1 * sy, item.pe);
  }

  const gap = 0.012;
  for (const modulo of est.modulos) {
    addBox(
      deck,
      modulo.x * sx + gap,
      modulo.y * sy + gap,
      modulo.pe,
      (modulo.x + modulo.w) * sx - gap,
      (modulo.y + modulo.h) * sy - gap,
      modulo.pe + espessuraM,
    );
  }

  const post = 0.045;
  const thick = 0.035;
  for (const edge of est.guardas) {
    const out = 0.03;
    let x0 = edge.x0 * sx;
    let y0 = edge.y0 * sy;
    let x1 = edge.x1 * sx;
    let y1 = edge.y1 * sy;
    if (edge.side === "frente") {
      y0 += out;
      y1 += out;
    } else if (edge.side === "fundo") {
      y0 -= out;
      y1 -= out;
    } else if (edge.side === "direita") {
      x0 += out;
      x1 += out;
    } else {
      x0 -= out;
      x1 -= out;
    }
    const baseZ = edge.superficie;
    const zTop = baseZ + project.guardaAltura;
    const rail = (z0: number, z1: number) => {
      addBox(guarda, Math.min(x0, x1) - thick / 2, Math.min(y0, y1) - thick / 2, z0, Math.max(x0, x1) + thick / 2, Math.max(y0, y1) + thick / 2, z1);
    };
    rail(zTop - thick, zTop);
    rail(baseZ + project.guardaAltura * 0.45, baseZ + project.guardaAltura * 0.45 + thick);
    for (const t of [0.14, 0.86]) {
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      addBox(guarda, px - post / 2, py - post / 2, baseZ, px + post / 2, py + post / 2, zTop);
    }
  }

  return [deck, pe, frente, fundo, interna, cano, guarda].filter((item) => item.idx.length > 0);
}

export function objDoPiso(project: Project): { obj: string; mtl: string; nome: string } {
  const malhas = malhasDoPiso(project);
  const nome = slugNome(project.nome);
  const linhas = [
    "# Piso Tablado · Digital Produções e Eventos",
    "# Unidade: metro. Eixo Y para cima.",
    `mtllib ${nome}.mtl`,
  ];
  let offset = 0;
  for (const item of malhas) {
    linhas.push(`o ${item.nome}`, `g ${item.nome}`, `usemtl ${item.nome}`);
    const vertices = item.pos.length / 3;
    for (let i = 0; i < vertices; i++) {
      linhas.push(`v ${item.pos[i * 3]} ${item.pos[i * 3 + 1]} ${item.pos[i * 3 + 2]}`);
    }
    for (let i = 0; i < vertices; i++) {
      linhas.push(`vn ${item.nor[i * 3]} ${item.nor[i * 3 + 1]} ${item.nor[i * 3 + 2]}`);
    }
    for (let i = 0; i < item.uv.length; i += 2) {
      linhas.push(`vt ${item.uv[i]} ${item.uv[i + 1]}`);
    }
    for (let i = 0; i < item.idx.length; i += 9) {
      const canto = (k: number) => {
        const id = item.idx[i + k * 3] + 1 + offset;
        return `${id}/${id}/${id}`;
      };
      linhas.push(`f ${canto(0)} ${canto(1)} ${canto(2)}`);
    }
    offset += vertices;
  }
  const mtl = malhas
    .map((item) => {
      const [r, g, b] = hexRgb(item.cor);
      return [`newmtl ${item.nome}`, `Kd ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`, "illum 1", "d 1.0"].join("\n");
    })
    .join("\n\n");
  return { obj: `${linhas.join("\n")}\n`, mtl: `${mtl}\n`, nome };
}

const POLEGADA = 39.37007874015748;
const NOME_3DS: Record<string, string> = {
  tablado: "Tablado",
  pe: "Pe",
  frente: "Frente",
  fundo: "Fundo",
  interna: "Interna",
  cano: "Cano",
  guarda: "Guarda",
};

function juntar(partes: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const parte of partes) total += parte.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const parte of partes) {
    out.set(parte, cursor);
    cursor += parte.length;
  }
  return out;
}

function pedaco(id: number, corpo: Uint8Array): Uint8Array {
  const out = new Uint8Array(6 + corpo.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, id, true);
  view.setUint32(2, out.length, true);
  out.set(corpo, 6);
  return out;
}

function textoZ(texto: string): Uint8Array {
  const bytes = new TextEncoder().encode(texto);
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes, 0);
  return out;
}

function u16(n: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, n, true);
  return out;
}

function u32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n, true);
  return out;
}

function f32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setFloat32(0, n, true);
  return out;
}

function nome3ds(id: string, parte: number, total: number): string {
  const base = NOME_3DS[id] ?? "Peca";
  if (total <= 1) return base.slice(0, 10);
  const sufixo = String(parte + 1);
  return `${base.slice(0, Math.max(1, 10 - sufixo.length))}${sufixo}`.slice(0, 10);
}

function fatiar(idx: number[]): Array<{ origem: number[]; faces: number[] }> {
  const limite = 60000;
  const saida: Array<{ origem: number[]; faces: number[] }> = [];
  let mapa = new Map<number, number>();
  let faces: number[] = [];
  const fechar = () => {
    if (faces.length === 0) return;
    const origem = new Array<number>(mapa.size);
    for (const [src, dst] of mapa) origem[dst] = src;
    saida.push({ origem, faces });
    mapa = new Map();
    faces = [];
  };
  for (let i = 0; i < idx.length; i += 9) {
    const tri = [idx[i], idx[i + 3], idx[i + 6]];
    let novos = 0;
    for (const vertice of tri) if (!mapa.has(vertice)) novos += 1;
    if (mapa.size > 0 && mapa.size + novos > limite) fechar();
    const local = (vertice: number) => {
      let id = mapa.get(vertice);
      if (id === undefined) {
        id = mapa.size;
        mapa.set(vertice, id);
      }
      return id;
    };
    faces.push(local(tri[0]), local(tri[1]), local(tri[2]));
  }
  fechar();
  return saida;
}

function cor24(hex: string): Uint8Array {
  const [r, g, b] = hexRgb(hex);
  return pedaco(0x0011, Uint8Array.of(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)));
}

function material3ds(nome: string, hex: string): Uint8Array {
  return pedaco(
    0xafff,
    juntar([pedaco(0xa000, textoZ(nome)), pedaco(0xa010, cor24(hex)), pedaco(0xa020, cor24(hex))]),
  );
}

function objeto3ds(nome: string, material: string, pos: number[], uv: number[], origem: number[], faces: number[]): Uint8Array {
  const n = origem.length;
  const verts = new Uint8Array(2 + n * 12);
  const dv = new DataView(verts.buffer);
  dv.setUint16(0, n, true);
  for (let i = 0; i < n; i++) {
    const s = origem[i] * 3;
    const o = 2 + i * 12;
    dv.setFloat32(o, pos[s] * POLEGADA, true);
    dv.setFloat32(o + 4, pos[s + 2] * POLEGADA, true);
    dv.setFloat32(o + 8, pos[s + 1] * POLEGADA, true);
  }
  const uvs = new Uint8Array(2 + n * 8);
  const du = new DataView(uvs.buffer);
  du.setUint16(0, n, true);
  for (let i = 0; i < n; i++) {
    const s = origem[i] * 2;
    du.setFloat32(2 + i * 8, uv[s] ?? 0, true);
    du.setFloat32(2 + i * 8 + 4, uv[s + 1] ?? 0, true);
  }
  const matriz = new Uint8Array(48);
  const dm = new DataView(matriz.buffer);
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0].forEach((valor, i) => dm.setFloat32(i * 4, valor, true));
  const nf = faces.length / 3;
  const corpoFaces = new Uint8Array(2 + nf * 8);
  const df = new DataView(corpoFaces.buffer);
  df.setUint16(0, nf, true);
  const lista = new Uint8Array(2 + nf * 2);
  const dl = new DataView(lista.buffer);
  dl.setUint16(0, nf, true);
  for (let f = 0; f < nf; f++) {
    df.setUint16(2 + f * 8, faces[f * 3], true);
    df.setUint16(4 + f * 8, faces[f * 3 + 1], true);
    df.setUint16(6 + f * 8, faces[f * 3 + 2], true);
    df.setUint16(8 + f * 8, 7, true);
    dl.setUint16(2 + f * 2, f, true);
  }
  const mesh = pedaco(
    0x4100,
    juntar([
      pedaco(0x4110, verts),
      pedaco(0x4140, uvs),
      pedaco(0x4160, matriz),
      pedaco(0x4120, juntar([corpoFaces, pedaco(0x4130, juntar([textoZ(material), lista]))])),
    ]),
  );
  return pedaco(0x4000, juntar([textoZ(nome), mesh]));
}

export function tdsDoPiso(project: Project): Uint8Array {
  const malhas = malhasDoPiso(project);
  const materiais = malhas.map((item) => material3ds((NOME_3DS[item.id] ?? "Peca").slice(0, 16), item.cor));
  const objetos: Uint8Array[] = [];
  for (const item of malhas) {
    const material = (NOME_3DS[item.id] ?? "Peca").slice(0, 16);
    const partes = fatiar(item.idx);
    partes.forEach((parte, indice) => {
      objetos.push(objeto3ds(nome3ds(item.id, indice, partes.length), material, item.pos, item.uv, parte.origem, parte.faces));
    });
  }
  const editor = pedaco(0x3d3d, juntar([pedaco(0x3d3e, u32(3)), pedaco(0x0100, f32(1)), ...materiais, ...objetos]));
  return pedaco(0x4d4d, juntar([pedaco(0x0002, u32(3)), editor]));
}

function xml(texto: string): string {
  return texto.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

function hexRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  const canal = (i: number) => {
    const v = Number.parseInt(n.slice(i, i + 2), 16);
    return Number.isFinite(v) ? v / 255 : 0.6;
  };
  return [canal(0), canal(2), canal(4)];
}

export function daeDoPiso(project: Project): string {
  const malhas = malhasDoPiso(project);
  const imagens = malhas
    .map(
      (m) => `    <image id="img-${m.id}" name="${xml(m.nome)}"><init_from>${m.arquivo}</init_from></image>`,
    )
    .join("\n");
  const efeitos = malhas
    .map((m) => {
      return `    <effect id="eff-${m.id}"><profile_COMMON>
      <newparam sid="${m.id}-surf"><surface type="2D"><init_from>img-${m.id}</init_from></surface></newparam>
      <newparam sid="${m.id}-samp"><sampler2D><source>${m.id}-surf</source></sampler2D></newparam>
      <technique sid="common"><lambert><diffuse><texture texture="${m.id}-samp" texcoord="UVSET0"/></diffuse></lambert></technique>
    </profile_COMMON></effect>`;
    })
    .join("\n");
  const materiais = malhas
    .map((m) => `    <material id="mat-${m.id}" name="${xml(m.nome)}"><instance_effect url="#eff-${m.id}"/></material>`)
    .join("\n");
  const geos = malhas
    .map((m) => {
      const nv = m.pos.length / 3;
      const nt = m.idx.length / 9;
      return `    <geometry id="geo-${m.id}" name="${xml(m.nome)}"><mesh>
      <source id="geo-${m.id}-pos"><float_array id="geo-${m.id}-pos-array" count="${m.pos.length}">${m.pos.join(" ")}</float_array>
        <technique_common><accessor source="#geo-${m.id}-pos-array" count="${nv}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>
      <source id="geo-${m.id}-nor"><float_array id="geo-${m.id}-nor-array" count="${m.nor.length}">${m.nor.join(" ")}</float_array>
        <technique_common><accessor source="#geo-${m.id}-nor-array" count="${nv}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>
      <source id="geo-${m.id}-uv"><float_array id="geo-${m.id}-uv-array" count="${m.uv.length}">${m.uv.join(" ")}</float_array>
        <technique_common><accessor source="#geo-${m.id}-uv-array" count="${nv}" stride="2"><param name="S" type="float"/><param name="T" type="float"/></accessor></technique_common></source>
      <vertices id="geo-${m.id}-vtx"><input semantic="POSITION" source="#geo-${m.id}-pos"/></vertices>
      <triangles material="mat-${m.id}" count="${nt}">
        <input semantic="VERTEX" source="#geo-${m.id}-vtx" offset="0"/>
        <input semantic="NORMAL" source="#geo-${m.id}-nor" offset="1"/>
        <input semantic="TEXCOORD" source="#geo-${m.id}-uv" offset="2" set="0"/>
        <p>${m.idx.join(" ")}</p>
      </triangles>
    </mesh></geometry>`;
    })
    .join("\n");
  const nos = malhas
    .map(
      (m) => `      <node id="no-${m.id}" name="${xml(m.nome)}"><instance_geometry url="#geo-${m.id}"><bind_material><technique_common>
        <instance_material symbol="mat-${m.id}" target="#mat-${m.id}"><bind_vertex_input semantic="UVSET0" input_semantic="TEXCOORD" input_set="0"/></instance_material>
      </technique_common></bind_material></instance_geometry></node>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor><authoring_tool>Piso Tablado · Digital Produções e Eventos</authoring_tool></contributor>
    <unit name="meter" meter="1"/>
    <up_axis>Y_UP</up_axis>
  </asset>
  <library_images>
${imagens}
  </library_images>
  <library_effects>
${efeitos}
  </library_effects>
  <library_materials>
${materiais}
  </library_materials>
  <library_geometries>
${geos}
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="Cena" name="${xml(project.nome || "Piso tablado")}">
${nos}
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Cena"/></scene>
</COLLADA>
`;
}

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name);
    const crc = crc32(file.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, file.data.length, true);
    local.setUint32(22, file.data.length, true);
    local.setUint16(26, name.length, true);
    const localBytes = new Uint8Array(local.buffer);
    parts.push(localBytes, name, file.data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, file.data.length, true);
    cd.setUint32(24, file.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += localBytes.length + name.length + file.data.length;
  }
  let centralSize = 0;
  for (const part of central) centralSize += part.length;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((soma, parte) => soma + parte.length, 0));
  let cursor = 0;
  for (const parte of all) {
    out.set(parte, cursor);
    cursor += parte.length;
  }
  return out;
}

function textura(hex: string, tipo: "madeira" | "metal"): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Não foi possível criar a textura."));
  const [r, g, b] = hexRgb(hex).map((canal) => Math.round(canal * 255));
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 128, 128);
  if (tipo === "madeira") {
    ctx.strokeStyle = "rgba(40, 24, 8, 0.28)";
    ctx.lineWidth = 2;
    for (let y = 10; y < 128; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(32, y - 4, 80, y + 6, 128, y - 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    for (let y = 16; y < 128; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y + 3);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    for (let y = 0; y < 128; y += 5) ctx.fillRect(0, y, 128, 1);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    for (let y = 2; y < 128; y += 5) ctx.fillRect(0, y, 128, 1);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Não foi possível criar a textura."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

function kml(nome: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>${xml(nome)}</name>
    <Model>
      <altitudeMode>relativeToGround</altitudeMode>
      <Link><href>models/piso.dae</href></Link>
    </Model>
  </Placemark>
</kml>
`;
}

export async function baixarModelo3d(project: Project) {
  const malhas = malhasDoPiso(project);
  const dae = new TextEncoder().encode(daeDoPiso(project));
  const arquivos: Array<{ name: string; data: Uint8Array }> = [
    { name: "doc.kml", data: new TextEncoder().encode(kml(project.nome || "Piso tablado")) },
    { name: "models/piso.dae", data: dae },
  ];
  const tipos: Record<string, "madeira" | "metal"> = {
    tablado: "madeira",
    pe: "metal",
    frente: "madeira",
    fundo: "madeira",
    interna: "madeira",
    cano: "metal",
    guarda: "metal",
  };
  for (const item of malhas) {
    arquivos.push({
      name: `models/${item.arquivo}`,
      data: await textura(item.cor, tipos[item.id] ?? "madeira"),
    });
  }
  const zip = zipStore(arquivos);
  const bytes = new ArrayBuffer(zip.byteLength);
  new Uint8Array(bytes).set(zip);
  const blob = new Blob([bytes], { type: "application/vnd.google-earth.kmz" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugNome(project.nome)}-sketchup.kmz`;
  link.click();
  URL.revokeObjectURL(url);
}

export function baixarObj(project: Project) {
  const { obj, mtl, nome } = objDoPiso(project);
  const enc = new TextEncoder();
  const zip = zipStore([
    { name: `${nome}.obj`, data: enc.encode(obj) },
    { name: `${nome}.mtl`, data: enc.encode(mtl) },
  ]);
  const bytes = new ArrayBuffer(zip.byteLength);
  new Uint8Array(bytes).set(zip);
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nome}-obj.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

export function baixar3ds(project: Project) {
  const dados = tdsDoPiso(project);
  const bytes = new ArrayBuffer(dados.byteLength);
  new Uint8Array(bytes).set(dados);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugNome(project.nome)}.3ds`;
  link.click();
  URL.revokeObjectURL(url);
}
