export type Nivel = "baixo" | "alto";
export type Ferramenta = "1x1" | "2x1" | "1x2";
export type ModoPincel = "peca" | "nivel";

export type Modulo = {
  x: number;
  y: number;
  w: 1 | 2;
  h: 1 | 2;
  nivel: Nivel;
  superficie?: number;
};

export type Project = {
  nome: string;
  obs: string;
  tabladoLargura: number;
  tabladoFundo: number;
  espessuraCm: number;
  travessaFrente: number;
  travessaFundo: number;
  syncTravessa: boolean;
  superficie: number;
  alturaFundo: number;
  doisNiveis: boolean;
  secaoCm: number;
  perfilCm: number;
  cols: number;
  rows: number;
  occupied: string[];
  modulos: Modulo[];
  ferramenta: Ferramenta;
  modoPincel: ModoPincel;
  nivelPincel: Nivel;
  showDeck: boolean;
  showLeg: boolean;
  showBeamX: boolean;
  showBeamY: boolean;
  showInterna: boolean;
  showX: boolean;
  showGuarda: boolean;
  guardaFrente: boolean;
  guardaFundo: boolean;
  guardaEsq: boolean;
  guardaDir: boolean;
  guardaAltura: number;
  colorGuarda: string;
  colorDeck: string;
  colorLeg: string;
  colorBeamX: string;
  colorBeamY: string;
  travessaInterna: number;
  syncInterna: boolean;
  internaSentido: "frente" | "fundo";
  colorInterna: string;
  colorX: string;
  canoCm: number;
  stepCm: number;
  carpeteLargura: number;
  cellX: number;
  cellY: number;
  yaw: number;
  zoom: number;
  panX: number;
  panY: number;
};

export type BillLine = {
  nome: string;
  medida: string;
  qty: number;
  total: string;
  cor: "deck" | "leg" | "beamX" | "beamY" | "interna" | "x" | "guarda";
};

export type Bill = {
  decks: number;
  decks2: number;
  decks1: number;
  legs: number;
  beamsX: number;
  beamsY: number;
  internas: number;
  xFrente: number;
  xFundo: number;
  xFrenteLen: number;
  xFundoLen: number;
  guardaFrente: number;
  guardaFundo: number;
  guardaEsq: number;
  guardaDir: number;
  area: number;
  frente: number;
  fundo: number;
  pe: number;
  peAlto: number;
  superficie: number;
  superficieAlto: number;
  espessuraM: number;
  rectangular: boolean;
  warnings: string[];
  cells: string[];
  linhas: BillLine[];
  pessoas: number;
  carpete: Carpete;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export const defaultProject = (): Project => ({
  nome: "Piso principal",
  obs: "",
  tabladoLargura: 2,
  tabladoFundo: 1,
  espessuraCm: 5,
  travessaFrente: 2,
  travessaFundo: 1,
  syncTravessa: true,
  superficie: 0.8,
  alturaFundo: 1.2,
  doisNiveis: false,
  secaoCm: 5,
  perfilCm: 8,
  cols: 8,
  rows: 4,
  occupied: [],
  modulos: malha2x1(4, 4),
  ferramenta: "2x1",
  modoPincel: "peca",
  nivelPincel: "baixo",
  showDeck: true,
  showLeg: true,
  showBeamX: true,
  showBeamY: true,
  showInterna: true,
  showX: true,
  showGuarda: true,
  guardaFrente: false,
  guardaFundo: false,
  guardaEsq: false,
  guardaDir: false,
  guardaAltura: 1.1,
  colorGuarda: "#e2c14a",
  colorDeck: "#c4a574",
  colorLeg: "#8e959c",
  colorBeamX: "#3f6f90",
  colorBeamY: "#c4623a",
  travessaInterna: 1,
  syncInterna: true,
  internaSentido: "fundo",
  colorInterna: "#7f8f62",
  colorX: "#e6d3a1",
  canoCm: 2.5,
  stepCm: 5,
  carpeteLargura: 2,
  cellX: 1,
  cellY: 1,
  yaw: -0.55,
  zoom: 1,
  panX: 0,
  panY: 0,
});

export function fillGrid(cols: number, rows: number): string[] {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push(`${c},${r}`);
  }
  return out;
}

export function malha2x1(colunas: number, linhas: number): Modulo[] {
  const out: Modulo[] = [];
  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < colunas; c++) out.push({ x: c * 2, y: r, w: 2, h: 1, nivel: "baixo" });
  }
  return out;
}

function snapModulo(n: number): 1 | 2 {
  return n >= 1.5 ? 2 : 1;
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function fmtM(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtQty(n: number): string {
  return n.toLocaleString("pt-BR");
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  return Math.round(clamp(n, min, max, fallback));
}

function asHex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback;
}

export function minSuperficie(espessuraCm: number): number {
  return round3(0.05 + espessuraCm / 100);
}

export function metrics(p: Pick<Project, "superficie" | "espessuraCm">): {
  pe: number;
  superficie: number;
  espessuraM: number;
} {
  const espessuraM = round3(p.espessuraCm / 100);
  const superficie = round3(Math.max(p.superficie, minSuperficie(p.espessuraCm)));
  const pe = round3(superficie - espessuraM);
  return { pe, superficie, espessuraM };
}

export function escalaDe(p: Pick<Project, "cellX" | "cellY">): { x: number; y: number } {
  const x = Number.isFinite(p.cellX) && p.cellX > 0 ? p.cellX : 1;
  const y = Number.isFinite(p.cellY) && p.cellY > 0 ? p.cellY : 1;
  return { x: round3(Math.min(4, Math.max(0.2, x))), y: round3(Math.min(4, Math.max(0.2, y))) };
}

export function tamanhoDoModulo(frente: number, fundo: number): {
  ferramenta: Ferramenta;
  frente: number;
  fundo: number;
  cellX: number;
  cellY: number;
} {
  const f = round3(clamp(frente, 0.4, 4, 2));
  const d = round3(clamp(fundo, 0.4, 4, 1));
  if (f === 2 && d === 1) return { ferramenta: "2x1", frente: 2, fundo: 1, cellX: 1, cellY: 1 };
  if (f === 1 && d === 2) return { ferramenta: "1x2", frente: 1, fundo: 2, cellX: 1, cellY: 1 };
  if (f === 1 && d === 1) return { ferramenta: "1x1", frente: 1, fundo: 1, cellX: 1, cellY: 1 };
  return { ferramenta: "1x1", frente: f, fundo: d, cellX: f, cellY: d };
}

export function internaSpan(p: Pick<Project, "internaSentido" | "tabladoLargura" | "tabladoFundo">): number {
  return p.internaSentido === "frente" ? p.tabladoLargura : p.tabladoFundo;
}

export function hypotM(a: number, b: number): number {
  return round3(Math.hypot(a, b));
}

/** Cano em X só com a superfície do vão em 1,00 m ou mais. */
export function usaCanoX(superficie: number): boolean {
  return superficie >= 1;
}

export function cellsOf(p: Pick<Project, "cols" | "rows" | "occupied">): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of p.occupied) {
    const [cs, rs] = key.split(",");
    const c = Number(cs);
    const r = Number(rs);
    if (!Number.isInteger(c) || !Number.isInteger(r)) continue;
    if (c < 0 || r < 0 || c >= p.cols || r >= p.rows) continue;
    const id = `${c},${r}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length > 0 ? out : fillGrid(p.cols, p.rows);
}

export type GuardaSide = "frente" | "fundo" | "esquerda" | "direita";

export type GuardaEdge = {
  side: GuardaSide;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
  superficie: number;
};

export type PecaLinear = {
  dir: "x" | "y";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
  pe: number;
  superficie: number;
  nivel: Nivel;
};

export type Estrutura = {
  modulos: Array<Modulo & { pe: number; superficie: number }>;
  pernas: Array<{ x: number; y: number; pe: number; ox: number; oy: number }>;
  vigasX: PecaLinear[];
  vigasY: PecaLinear[];
  internas: PecaLinear[];
  guardas: GuardaEdge[];
};

function overlaps(a: Modulo, b: Pick<Modulo, "x" | "y" | "w" | "h">): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function intervaloCruza(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > 0.001;
}

export function superficieDe(p: Project, nivel: Nivel): number {
  const baixo = metrics(p).superficie;
  if (!p.doisNiveis || nivel === "baixo") return baixo;
  return round3(Math.max(p.alturaFundo, minSuperficie(p.espessuraCm)));
}

export function peDe(p: Project, nivel: Nivel): number {
  return round3(superficieDe(p, nivel) - p.espessuraCm / 100);
}

export function chaveModulo(modulo: Pick<Modulo, "x" | "y" | "w" | "h">): string {
  return `${modulo.x},${modulo.y},${modulo.w},${modulo.h}`;
}

export function moduloNa(p: Project, c: number, r: number): Modulo | undefined {
  return modulosOf(p).find((modulo) => c >= modulo.x && c < modulo.x + modulo.w && r >= modulo.y && r < modulo.y + modulo.h);
}

export function superficieModulo(p: Project, modulo: Modulo): number {
  const piso = minSuperficie(p.espessuraCm);
  if (typeof modulo.superficie === "number" && Number.isFinite(modulo.superficie)) {
    return round3(clamp(modulo.superficie, piso, 3, p.superficie));
  }
  return superficieDe(p, modulo.nivel);
}

export function fmtCm(n: number): string {
  return `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

function legacyModulos(p: Pick<Project, "occupied" | "cols" | "rows" | "tabladoLargura" | "tabladoFundo">): Modulo[] {
  const w = snapModulo(p.tabladoLargura);
  const h = snapModulo(p.tabladoFundo);
  const seen = new Set<string>();
  const out: Modulo[] = [];
  for (const key of p.occupied) {
    const [cs, rs] = key.split(",");
    const c = Number(cs);
    const r = Number(rs);
    if (!Number.isInteger(c) || !Number.isInteger(r)) continue;
    if (c < 0 || r < 0 || c >= p.cols || r >= p.rows) continue;
    const id = `${c},${r}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ x: c * w, y: r * h, w, h, nivel: "baixo" });
  }
  return out;
}

export function modulosOf(p: Project): Modulo[] {
  const raw = Array.isArray(p.modulos) && p.modulos.length > 0 ? p.modulos : legacyModulos(p);
  const seen = new Set<string>();
  const out: Modulo[] = [];
  for (const item of raw) {
    const w = item.w === 2 ? 2 : 1;
    const h = item.h === 2 ? 2 : 1;
    const x = Math.round(Number(item.x));
    const y = Math.round(Number(item.y));
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || y < 0 || x + w > p.cols || y + h > p.rows) continue;
    if (w === 2 && h === 2) continue;
    const nivel: Nivel = p.doisNiveis && item.nivel === "alto" ? "alto" : "baixo";
    const bruto = typeof item.superficie === "number" && Number.isFinite(item.superficie) ? item.superficie : undefined;
    const superficie = bruto === undefined ? undefined : round3(clamp(bruto, minSuperficie(p.espessuraCm), 3, p.superficie));
    const modulo: Modulo = superficie === undefined ? { x, y, w, h, nivel } : { x, y, w, h, nivel, superficie };
    if (out.some((other) => overlaps(other, modulo))) continue;
    const id = `${x},${y},${w},${h}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(modulo);
  }
  return out.length > 0 ? out : [{ x: 0, y: 0, w: 1, h: 1, nivel: "baixo" }];
}

function ladoOcupado(mods: Modulo[], modulo: Modulo, side: GuardaSide): boolean {
  return mods.some((other) => {
    if (other === modulo) return false;
    if (side === "frente") return other.y === modulo.y + modulo.h && intervaloCruza(modulo.x, modulo.x + modulo.w, other.x, other.x + other.w);
    if (side === "fundo") return other.y + other.h === modulo.y && intervaloCruza(modulo.x, modulo.x + modulo.w, other.x, other.x + other.w);
    if (side === "direita") return other.x === modulo.x + modulo.w && intervaloCruza(modulo.y, modulo.y + modulo.h, other.y, other.y + other.h);
    return other.x + other.w === modulo.x && intervaloCruza(modulo.y, modulo.y + modulo.h, other.y, other.y + other.h);
  });
}

export function estruturaOf(p: Project): Estrutura {
  const lista = modulosOf(p);
  const modulos = lista.map((modulo) => {
    const superficie = superficieModulo(p, modulo);
    const pe = round3(superficie - p.espessuraCm / 100);
    return { ...modulo, superficie, pe };
  });
  const canto = new Map<string, Map<number, { vx: number; vy: number }>>();
  for (const modulo of modulos) {
    const mx = modulo.x + modulo.w / 2;
    const my = modulo.y + modulo.h / 2;
    for (const x of [modulo.x, modulo.x + modulo.w]) {
      for (const y of [modulo.y, modulo.y + modulo.h]) {
        const id = `${x},${y}`;
        const porPe = canto.get(id) ?? new Map<number, { vx: number; vy: number }>();
        const atual = porPe.get(modulo.pe) ?? { vx: 0, vy: 0 };
        atual.vx += mx - x;
        atual.vy += my - y;
        porPe.set(modulo.pe, atual);
        canto.set(id, porPe);
      }
    }
  }
  const folga = 0.16;
  const pernas: Estrutura["pernas"] = [];
  for (const [id, porPe] of canto) {
    const [xs, ys] = id.split(",");
    const x = Number(xs);
    const y = Number(ys);
    const varios = porPe.size > 1;
    for (const [pe, vetor] of porPe) {
      let ox = 0;
      let oy = 0;
      if (varios) {
        const len = Math.hypot(vetor.vx, vetor.vy) || 1;
        ox = (vetor.vx / len) * folga;
        oy = (vetor.vy / len) * folga;
      }
      pernas.push({ x, y, pe, ox, oy });
    }
  }
  const crus: PecaLinear[] = [];
  for (const modulo of modulos) {
    const base = { pe: modulo.pe, superficie: modulo.superficie, nivel: modulo.nivel };
    crus.push({ dir: "x", x0: modulo.x, y0: modulo.y, x1: modulo.x + modulo.w, y1: modulo.y, len: modulo.w, ...base });
    crus.push({
      dir: "x",
      x0: modulo.x,
      y0: modulo.y + modulo.h,
      x1: modulo.x + modulo.w,
      y1: modulo.y + modulo.h,
      len: modulo.w,
      ...base,
    });
    crus.push({ dir: "y", x0: modulo.x, y0: modulo.y, x1: modulo.x, y1: modulo.y + modulo.h, len: modulo.h, ...base });
    crus.push({
      dir: "y",
      x0: modulo.x + modulo.w,
      y0: modulo.y,
      x1: modulo.x + modulo.w,
      y1: modulo.y + modulo.h,
      len: modulo.h,
      ...base,
    });
  }
  const partes: PecaLinear[] = [];
  for (const seg of crus) {
    if (seg.dir === "x") {
      const cortes = [
        ...new Set(
          pernas
            .filter((perna) => perna.y === seg.y0 && perna.x > seg.x0 + 0.001 && perna.x < seg.x1 - 0.001)
            .map((perna) => perna.x),
        ),
      ].sort((a, b) => a - b);
      const xs = [seg.x0, ...cortes, seg.x1];
      for (let i = 0; i < xs.length - 1; i++) {
        const len = round3(xs[i + 1] - xs[i]);
        if (len < 0.05) continue;
        partes.push({ ...seg, x0: xs[i], x1: xs[i + 1], len });
      }
    } else {
      const cortes = [
        ...new Set(
          pernas
            .filter((perna) => perna.x === seg.x0 && perna.y > seg.y0 + 0.001 && perna.y < seg.y1 - 0.001)
            .map((perna) => perna.y),
        ),
      ].sort((a, b) => a - b);
      const ys = [seg.y0, ...cortes, seg.y1];
      for (let i = 0; i < ys.length - 1; i++) {
        const len = round3(ys[i + 1] - ys[i]);
        if (len < 0.05) continue;
        partes.push({ ...seg, y0: ys[i], y1: ys[i + 1], len });
      }
    }
  }
  const unicas = new Map<string, PecaLinear>();
  for (const seg of partes) {
    unicas.set(`${seg.dir}|${seg.pe.toFixed(3)}|${seg.x0}|${seg.y0}|${seg.x1}|${seg.y1}`, seg);
  }
  const vigas = [...unicas.values()];
  const internas: PecaLinear[] = [];
  for (const modulo of modulos) {
    const lenReal = p.internaSentido === "frente" ? modulo.w : modulo.h;
    const len = round3(p.syncInterna ? lenReal : p.travessaInterna);
    if (p.internaSentido !== "frente") {
      for (const frac of [1 / 3, 2 / 3]) {
        const x = round3(modulo.x + modulo.w * frac);
        internas.push({
          dir: "y",
          x0: x,
          y0: modulo.y,
          x1: x,
          y1: modulo.y + modulo.h,
          len,
          pe: modulo.pe,
          superficie: modulo.superficie,
          nivel: modulo.nivel,
        });
      }
    } else {
      for (const frac of [1 / 3, 2 / 3]) {
        const y = round3(modulo.y + modulo.h * frac);
        internas.push({
          dir: "x",
          x0: modulo.x,
          y0: y,
          x1: modulo.x + modulo.w,
          y1: y,
          len,
          pe: modulo.pe,
          superficie: modulo.superficie,
          nivel: modulo.nivel,
        });
      }
    }
  }
  const guardas: GuardaEdge[] = [];
  for (const modulo of modulos) {
    const sup = modulo.superficie;
    if (p.guardaFrente && !ladoOcupado(lista, modulo, "frente")) {
      guardas.push({
        side: "frente",
        x0: modulo.x,
        y0: modulo.y + modulo.h,
        x1: modulo.x + modulo.w,
        y1: modulo.y + modulo.h,
        len: modulo.w,
        superficie: sup,
      });
    }
    if (p.guardaFundo && !ladoOcupado(lista, modulo, "fundo")) {
      guardas.push({
        side: "fundo",
        x0: modulo.x,
        y0: modulo.y,
        x1: modulo.x + modulo.w,
        y1: modulo.y,
        len: modulo.w,
        superficie: sup,
      });
    }
    if (p.guardaEsq && !ladoOcupado(lista, modulo, "esquerda")) {
      guardas.push({
        side: "esquerda",
        x0: modulo.x,
        y0: modulo.y,
        x1: modulo.x,
        y1: modulo.y + modulo.h,
        len: modulo.h,
        superficie: sup,
      });
    }
    if (p.guardaDir && !ladoOcupado(lista, modulo, "direita")) {
      guardas.push({
        side: "direita",
        x0: modulo.x + modulo.w,
        y0: modulo.y,
        x1: modulo.x + modulo.w,
        y1: modulo.y + modulo.h,
        len: modulo.h,
        superficie: sup,
      });
    }
  }
  return {
    modulos,
    pernas,
    vigasX: vigas.filter((viga) => viga.dir === "x"),
    vigasY: vigas.filter((viga) => viga.dir === "y"),
    internas,
    guardas,
  };
}

export function guardaEdges(p: Project): GuardaEdge[] {
  return estruturaOf(p).guardas;
}

export type Carpete = {
  m2: number;
  largura: number;
  faixas: number;
  comprimento: number;
  linear: number;
  recorte: boolean;
  sentido: "frente" | "fundo";
  ultima: number;
  sobra: number;
};

export function carpeteDe(area: number, frente: number, fundo: number, rectangular: boolean, largura = 2): Carpete {
  const rolo = round3(Math.min(5, Math.max(0.5, largura || 2)));
  if (!rectangular || frente <= 0 || fundo <= 0) {
    const linear = Math.max(0, Math.ceil(area / rolo - 1e-6));
    return {
      m2: area,
      largura: rolo,
      faixas: 0,
      comprimento: 0,
      linear,
      recorte: true,
      sentido: frente >= fundo ? "frente" : "fundo",
      ultima: 0,
      sobra: 0,
    };
  }
  const aoLongoFrente = frente >= fundo;
  const comprimento = aoLongoFrente ? frente : fundo;
  const vao = aoLongoFrente ? fundo : frente;
  const faixas = Math.max(1, Math.ceil(vao / rolo - 1e-6));
  const ultima = round3(Math.min(rolo, vao - (faixas - 1) * rolo));
  return {
    m2: area,
    largura: rolo,
    faixas,
    comprimento,
    linear: round3(faixas * comprimento),
    recorte: false,
    sentido: aoLongoFrente ? "frente" : "fundo",
    ultima,
    sobra: round3(Math.max(0, rolo - ultima)),
  };
}

export function pecasDoModulo(
  ferramenta: Ferramenta,
  espessuraCm: number,
  superficie: number,
  frente?: number,
  fundo?: number,
) {
  const layout = typeof frente === "number" && typeof fundo === "number" ? tamanhoDoModulo(frente, fundo) : null;
  const { w, h } = ferramentaTamanho(layout?.ferramenta ?? ferramenta);
  const medida = metrics({ superficie, espessuraCm });
  const travessaFrente = layout?.frente ?? w;
  const travessaFundo = layout?.fundo ?? h;
  return {
    w,
    h,
    pe: medida.pe,
    superficie: medida.superficie,
    espessuraM: medida.espessuraM,
    travessaFrente,
    travessaFundo,
    interna: travessaFundo,
    xFrente: usaCanoX(medida.superficie) ? hypotM(travessaFrente, medida.pe) : 0,
    xFundo: usaCanoX(medida.superficie) ? hypotM(travessaFundo, medida.pe) : 0,
    cellX: layout?.cellX ?? 1,
    cellY: layout?.cellY ?? 1,
  };
}

export function montarPiso(
  p: Project,
  ferramenta: Ferramenta,
  naFrente: number,
  noFundo: number,
  medida?: { frente: number; fundo: number },
): Project {
  const layout = medida ? tamanhoDoModulo(medida.frente, medida.fundo) : null;
  const tipo = layout?.ferramenta ?? ferramenta;
  const { w, h } = ferramentaTamanho(tipo);
  const frente = clampInt(naFrente, 1, Math.max(1, Math.floor(24 / w)), 1);
  const fundo = clampInt(noFundo, 1, Math.max(1, Math.floor(24 / h)), 1);
  const cols = frente * w;
  const rows = fundo * h;
  const superficie = metrics(p).superficie;
  const modulos: Modulo[] = [];
  for (let y = 0; y < rows; y += h) {
    for (let x = 0; x < cols; x += w) modulos.push({ x, y, w, h, nivel: "baixo", superficie });
  }
  return syncPieces({
    ...p,
    ferramenta: tipo,
    cols,
    rows,
    modulos,
    doisNiveis: false,
    cellX: layout?.cellX ?? 1,
    cellY: layout?.cellY ?? 1,
    tabladoLargura: layout?.frente ?? w,
    tabladoFundo: layout?.fundo ?? h,
    syncTravessa: true,
    syncInterna: true,
    modoPincel: "peca",
    nivelPincel: "baixo",
    internaSentido: "fundo",
  });
}

function superficieVizinha(p: Project, lado: "x" | "y", x: number, y: number, w: number, h: number): number {
  let melhor = 0;
  let altura = metrics(p).superficie;
  for (const modulo of modulosOf(p)) {
    const cruza =
      lado === "x"
        ? modulo.x + modulo.w === x
          ? Math.min(modulo.y + modulo.h, y + h) - Math.max(modulo.y, y)
          : 0
        : modulo.y + modulo.h === y
          ? Math.min(modulo.x + modulo.w, x + w) - Math.max(modulo.x, x)
          : 0;
    if (cruza > melhor) {
      melhor = cruza;
      altura = superficieModulo(p, modulo);
    }
  }
  return round3(altura);
}

function comFaixa(p: Project, cols: number, rows: number, extra: Modulo[]): Project {
  const modulos = [...modulosOf(p), ...extra];
  const base = metrics(p).superficie;
  const valores = modulos.map((modulo) => round3(modulo.superficie ?? superficieModulo(p, modulo)));
  const maximo = Math.max(...valores);
  return {
    ...p,
    cols,
    rows,
    modulos,
    doisNiveis: new Set(valores).size > 1,
    alturaFundo: round3(Math.min(3, Math.max(p.alturaFundo, base, maximo))),
  };
}

export function crescerFrente(p: Project): Project {
  const { w, h } = ferramentaTamanho(p.ferramenta);
  if (p.cols + w > 24) return p;
  const base = metrics(p).superficie;
  const extra: Modulo[] = [];
  for (let y = 0; y + h <= p.rows; y += h) {
    const superficie = superficieVizinha(p, "x", p.cols, y, w, h);
    const nivel: Nivel = superficie > base + 0.015 ? "alto" : "baixo";
    extra.push({ x: p.cols, y, w, h, nivel, superficie });
  }
  if (extra.length === 0) return p;
  return comFaixa(p, p.cols + w, p.rows, extra);
}

export function crescerFundo(p: Project): Project {
  const { w, h } = ferramentaTamanho(p.ferramenta);
  if (p.rows + h > 24) return p;
  const base = metrics(p).superficie;
  const extra: Modulo[] = [];
  for (let x = 0; x + w <= p.cols; x += w) {
    const superficie = superficieVizinha(p, "y", x, p.rows, w, h);
    const nivel: Nivel = superficie > base + 0.015 ? "alto" : "baixo";
    extra.push({ x, y: p.rows, w, h, nivel, superficie });
  }
  if (extra.length === 0) return p;
  return comFaixa(p, p.cols, p.rows + h, extra);
}

export function removerSelecao(p: Project, chaves: string[]): Project {
  const alvo = new Set(chaves);
  const modulos = modulosOf(p).filter((modulo) => !alvo.has(chaveModulo(modulo)));
  if (modulos.length === 0) return p;
  return { ...p, modulos };
}

function modoNumero(valores: number[]): number {
  if (valores.length === 0) return 0;
  const pesos = new Map<number, number>();
  for (const valor of valores) pesos.set(valor, (pesos.get(valor) ?? 0) + 1);
  let melhor = valores[0];
  let qtd = 0;
  for (const [valor, n] of pesos) {
    if (n > qtd) {
      melhor = valor;
      qtd = n;
    }
  }
  return melhor;
}

function linhasDeGrupo(
  nome: string,
  itens: Array<{ len: number; pe?: number }>,
  cor: BillLine["cor"],
  medida: (item: { len: number; pe?: number }, qty: number) => string,
  total: (item: { len: number; pe?: number }, qty: number) => string,
): BillLine[] {
  const grupos = new Map<string, { item: { len: number; pe?: number }; qty: number }>();
  for (const item of itens) {
    const id = `${item.len}|${item.pe ?? 0}`;
    const atual = grupos.get(id);
    if (atual) atual.qty += 1;
    else grupos.set(id, { item, qty: 1 });
  }
  return [...grupos.values()]
    .sort((a, b) => b.item.len - a.item.len || (b.item.pe ?? 0) - (a.item.pe ?? 0))
    .map(({ item, qty }) => ({ nome, medida: medida(item, qty), qty, total: total(item, qty), cor }));
}

export function billOf(p: Project): Bill {
  const est = estruturaOf(p);
  const m = metrics(p);
  const esc = escalaDe(p);
  const emX = (grid: number) => round3(grid * esc.x);
  const emY = (grid: number) => round3(grid * esc.y);
  const area = round3(est.modulos.reduce((sum, modulo) => sum + modulo.w * esc.x * modulo.h * esc.y, 0));
  const coberto = new Set<string>();
  for (const modulo of est.modulos) {
    for (let y = modulo.y; y < modulo.y + modulo.h; y++) {
      for (let x = modulo.x; x < modulo.x + modulo.w; x++) coberto.add(`${x},${y}`);
    }
  }
  const warnings: string[] = [];
  if (!p.syncTravessa) {
    warnings.push("Comprimento livre da travessa externa: a planta desenha o vão real e a lista usa o comprimento informado.");
  }
  if (!p.syncInterna) {
    warnings.push(
      `Travessa interna em ${fmtM(p.travessaInterna)} m. A planta usa o vão de cada tablado; a lista pede o comprimento informado.`,
    );
  }
  const alto = superficieDe(p, "alto");
  const alturas = new Set(est.modulos.map((modulo) => modulo.superficie));
  if (m.superficie >= 1 || [...alturas].some((altura) => altura >= 1)) {
    warnings.push("A partir de 1,00 m, marque o guarda-corpo nos lados abertos e preveja acesso com corrimão.");
  }
  if (alturas.size > 1) {
    const porCanto = new Map<string, number>();
    for (const perna of est.pernas) {
      const id = `${perna.x},${perna.y}`;
      porCanto.set(id, (porCanto.get(id) ?? 0) + 1);
    }
    const encontros = [...porCanto.values()].filter((n) => n > 1).length;
    warnings.push(
      `Há desnível. ${encontros} cantos não compartilham pé: o tablado mais baixo e o mais alto entram cada um com o pé da própria altura, como dois pisos lado a lado.`,
    );
  }
  const xVigasX = est.vigasX.filter((viga) => usaCanoX(viga.superficie));
  const xVigasY = est.vigasY.filter((viga) => usaCanoX(viga.superficie));
  const faces = est.vigasX.length + est.vigasY.length;
  const facesX = xVigasX.length + xVigasY.length;
  if (faces > 0 && facesX === 0) {
    warnings.push("Abaixo de 1,00 m o piso não leva cano em X.");
  } else if (facesX > 0 && facesX < faces) {
    warnings.push("Cano em X só nos vãos em que o piso tem 1,00 m ou mais.");
  }
  const decks2 = est.modulos.filter((modulo) => modulo.w * modulo.h === 2).length;
  const decks1 = est.modulos.filter((modulo) => modulo.w * modulo.h === 1).length;
  const pernasGrupo = new Map<number, number>();
  for (const perna of est.pernas) pernasGrupo.set(perna.pe, (pernasGrupo.get(perna.pe) ?? 0) + 1);
  const vigaLen = (viga: PecaLinear) => {
    if (!p.syncTravessa) return viga.dir === "x" ? p.travessaFrente : p.travessaFundo;
    return viga.dir === "x" ? emX(viga.len) : emY(viga.len);
  };
  const vigasXLista = est.vigasX.map((viga) => ({ len: round3(vigaLen(viga)) }));
  const vigasYLista = est.vigasY.map((viga) => ({ len: round3(vigaLen(viga)) }));
  const internasLista = est.internas.map((viga) => ({
    len: p.syncInterna ? (viga.dir === "x" ? emX(viga.len) : emY(viga.len)) : viga.len,
  }));
  const xFrenteLista = xVigasX.map((viga) => ({ len: hypotM(emX(viga.len), viga.pe), pe: viga.pe }));
  const xFundoLista = xVigasY.map((viga) => ({ len: hypotM(emY(viga.len), viga.pe), pe: viga.pe }));
  const linhas: BillLine[] = [];
  const gruposDeck = new Map<string, { nome: string; medida: string; qty: number; m2: number }>();
  for (const modulo of est.modulos) {
    const largura = emX(modulo.w);
    const fundo = emY(modulo.h);
    const id = `${largura}|${fundo}`;
    const atual = gruposDeck.get(id);
    if (atual) atual.qty += 1;
    else {
      gruposDeck.set(id, {
        nome: `Tablado ${fmtM(largura)} × ${fmtM(fundo)}`,
        medida: `${fmtM(largura)} × ${fmtM(fundo)} × ${fmtM(m.espessuraM)} m`,
        qty: 1,
        m2: round3(largura * fundo),
      });
    }
  }
  for (const grupo of gruposDeck.values()) {
    linhas.push({
      nome: grupo.nome,
      medida: grupo.medida,
      qty: grupo.qty,
      total: `${fmtM(round3(grupo.qty * grupo.m2))} m²`,
      cor: "deck",
    });
  }
  for (const [pe, qty] of [...pernasGrupo.entries()].sort((a, b) => b[0] - a[0])) {
    linhas.push({
      nome: "Pé",
      medida: `altura ${fmtM(pe)} m · tubo ${fmtM(p.secaoCm / 100)} m`,
      qty,
      total: `${fmtM(qty * pe)} m`,
      cor: "leg",
    });
  }
  linhas.push(
    ...linhasDeGrupo(
      "Travessa frente",
      vigasXLista,
      "beamX",
      (item) => `${fmtM(item.len)} m`,
      (item, qty) => `${fmtM(qty * item.len)} m`,
    ),
    ...linhasDeGrupo(
      "Travessa fundo",
      vigasYLista,
      "beamY",
      (item) => `${fmtM(item.len)} m`,
      (item, qty) => `${fmtM(qty * item.len)} m`,
    ),
    ...linhasDeGrupo(
      "Travessa interna",
      internasLista,
      "interna",
      (item) => `${fmtM(item.len)} m · 2 por tablado`,
      (item, qty) => `${fmtM(qty * item.len)} m`,
    ),
    ...linhasDeGrupo(
      "Cano X frente",
      xFrenteLista.flatMap((item) => [item, item]),
      "x",
      (item) => `${fmtM(item.len)} m · Ø ${fmtM(p.canoCm / 100)} m`,
      (item, qty) => `${fmtM(qty * item.len)} m`,
    ),
    ...linhasDeGrupo(
      "Cano X fundo",
      xFundoLista.flatMap((item) => [item, item]),
      "x",
      (item) => `${fmtM(item.len)} m · Ø ${fmtM(p.canoCm / 100)} m`,
      (item, qty) => `${fmtM(qty * item.len)} m`,
    ),
  );
  const nomeGuarda: Record<GuardaSide, string> = {
    frente: "Guarda-corpo frente",
    fundo: "Guarda-corpo fundo",
    esquerda: "Guarda-corpo esquerda",
    direita: "Guarda-corpo direita",
  };
  for (const side of ["frente", "fundo", "esquerda", "direita"] as const) {
    const doLado = est.guardas.filter((guarda) => guarda.side === side);
    linhas.push(
      ...linhasDeGrupo(
        nomeGuarda[side],
        doLado.map((guarda) => {
          const alongX = guarda.side === "frente" || guarda.side === "fundo";
          return { len: alongX ? emX(guarda.len) : emY(guarda.len) };
        }),
        "guarda",
        (item) => `${fmtM(item.len)} m · altura ${fmtM(p.guardaAltura)} m`,
        (item, qty) => `${fmtM(qty * item.len)} m`,
      ),
    );
  }
  const xFrenteLen = modoNumero(xFrenteLista.map((item) => item.len));
  const xFundoLen = modoNumero(xFundoLista.map((item) => item.len));
  const countSide = (side: GuardaSide) => est.guardas.filter((guarda) => guarda.side === side).length;
  const rectangular = coberto.size === p.cols * p.rows;
  const frente = round3(p.cols * esc.x);
  const fundo = round3(p.rows * esc.y);
  const carpete = carpeteDe(area, frente, fundo, rectangular, p.carpeteLargura || 2);
  return {
    decks: est.modulos.length,
    decks2,
    decks1,
    legs: est.pernas.length,
    beamsX: est.vigasX.length,
    beamsY: est.vigasY.length,
    internas: est.internas.length,
    xFrente: xVigasX.length * 2,
    xFundo: xVigasY.length * 2,
    xFrenteLen,
    xFundoLen,
    guardaFrente: countSide("frente"),
    guardaFundo: countSide("fundo"),
    guardaEsq: countSide("esquerda"),
    guardaDir: countSide("direita"),
    area,
    frente,
    fundo,
    pe: m.pe,
    peAlto: peDe(p, "alto"),
    superficie: m.superficie,
    superficieAlto: alto,
    espessuraM: m.espessuraM,
    rectangular,
    warnings,
    cells: est.modulos.map((modulo) => `${modulo.x},${modulo.y}`),
    linhas,
    pessoas: Math.max(0, Math.floor(area * 4)),
    carpete,
  };
}

export function ferramentaTamanho(ferramenta: Ferramenta): { w: 1 | 2; h: 1 | 2 } {
  if (ferramenta === "2x1") return { w: 2, h: 1 };
  if (ferramenta === "1x2") return { w: 1, h: 2 };
  return { w: 1, h: 1 };
}

function cobre(mods: Modulo[], x: number, y: number): Modulo | undefined {
  return mods.find((modulo) => x >= modulo.x && x < modulo.x + modulo.w && y >= modulo.y && y < modulo.y + modulo.h);
}

export function aplicarClique(p: Project, mx: number, my: number): Project {
  const mods = modulosOf(p);
  const hit = cobre(mods, mx, my);
  if (p.modoPincel === "nivel" && p.doisNiveis) {
    if (!hit) return p;
    return {
      ...p,
      modulos: mods.map((modulo) => (modulo === hit ? { ...modulo, nivel: p.nivelPincel } : modulo)),
    };
  }
  if (hit) {
    if (mods.length <= 1) return p;
    return { ...p, modulos: mods.filter((modulo) => modulo !== hit) };
  }
  const { w, h } = ferramentaTamanho(p.ferramenta);
  let x = mx;
  let y = my;
  const cabe = (ax: number, ay: number) => {
    if (ax < 0 || ay < 0 || ax + w > p.cols || ay + h > p.rows) return false;
    return !mods.some((modulo) => overlaps(modulo, { x: ax, y: ay, w, h }));
  };
  if (!cabe(x, y) && w === 2 && cabe(mx - 1, my)) x = mx - 1;
  if (!cabe(x, y) && h === 2 && cabe(x, my - 1)) y = my - 1;
  if (!cabe(x, y)) return p;
  return {
    ...p,
    modulos: [...mods, { x, y, w, h, nivel: p.doisNiveis ? p.nivelPincel : "baixo" }],
  };
}

export function reporTablado(p: Project, c: number, r: number, memoria: Modulo | null): Project {
  const mods = modulosOf(p);
  if (cobre(mods, c, r)) return p;
  const perto =
    memoria != null &&
    c >= memoria.x - 1 &&
    c < memoria.x + memoria.w + 1 &&
    r >= memoria.y - 1 &&
    r < memoria.y + memoria.h + 1;
  if (memoria && perto && cabeNoPiso(mods, p, memoria)) {
    return { ...p, modulos: [...mods, { ...memoria }] };
  }
  return aplicarClique({ ...p, modoPincel: "peca" }, c, r);
}

function cabeNoPiso(mods: Modulo[], p: Project, peca: Pick<Modulo, "x" | "y" | "w" | "h">): boolean {
  if (peca.x < 0 || peca.y < 0 || peca.x + peca.w > p.cols || peca.y + peca.h > p.rows) return false;
  return !mods.some((modulo) => overlaps(modulo, peca));
}

export function toggleCell(p: Project, c: number, r: number): Project {
  return aplicarClique({ ...p, modoPincel: "peca" }, c, r);
}

function faixaNova(p: Project, x0: number, x1: number, y0: number, y1: number): Modulo[] {
  const extra: Modulo[] = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) extra.push({ x, y, w: 1, h: 1, nivel: "baixo" });
  }
  return extra;
}

export function withCols(p: Project, cols: number): Project {
  const next = clampInt(cols, 1, 24, p.cols);
  let modulos = modulosOf(p).filter((modulo) => modulo.x + modulo.w <= next && modulo.y + modulo.h <= p.rows);
  if (next > p.cols) modulos = [...modulos, ...faixaNova(p, p.cols, next, 0, p.rows)];
  if (modulos.length === 0) modulos = [{ x: 0, y: 0, w: 1, h: 1, nivel: "baixo" }];
  return { ...p, cols: next, modulos };
}

export function withRows(p: Project, rows: number): Project {
  const next = clampInt(rows, 1, 24, p.rows);
  let modulos = modulosOf(p).filter((modulo) => modulo.y + modulo.h <= next && modulo.x + modulo.w <= p.cols);
  if (next > p.rows) modulos = [...modulos, ...faixaNova(p, 0, p.cols, p.rows, next)];
  if (modulos.length === 0) modulos = [{ x: 0, y: 0, w: 1, h: 1, nivel: "baixo" }];
  return { ...p, rows: next, modulos };
}

export function preencher(p: Project): Project {
  const mods = [...modulosOf(p)];
  for (let y = 0; y < p.rows; y++) {
    for (let x = 0; x < p.cols; x++) {
      if (!cobre(mods, x, y)) mods.push({ x, y, w: 1, h: 1, nivel: p.doisNiveis ? p.nivelPincel : "baixo" });
    }
  }
  return { ...p, modulos: mods };
}

export function setDoisNiveis(p: Project, on: boolean): Project {
  const mods = modulosOf(p).map((modulo) => {
    if (!on) return { ...modulo, nivel: "baixo" as const };
    const meio = p.rows / 2;
    return { ...modulo, nivel: modulo.y + modulo.h / 2 < meio ? ("alto" as const) : ("baixo" as const) };
  });
  const alturaFundo = on ? round3(Math.max(p.alturaFundo, p.superficie + 0.4)) : p.alturaFundo;
  return {
    ...p,
    doisNiveis: on,
    modulos: mods,
    alturaFundo: round3(Math.min(3, alturaFundo)),
    modoPincel: on ? p.modoPincel : "peca",
    nivelPincel: on ? p.nivelPincel : "baixo",
  };
}

export function setAlturaFundo(p: Project, superficie: number): Project {
  const piso = metrics(p).superficie;
  const next = round3(clamp(superficie, Math.max(minSuperficie(p.espessuraCm), piso), 3, p.alturaFundo));
  return { ...p, alturaFundo: next, doisNiveis: true };
}

export function ajustarAltura(p: Project, dir: number, fino = false, chaves: string[] = []): Project {
  const step = (fino ? 1 : p.stepCm) / 100;
  if (chaves.length === 0) return setSuperficie(p, metrics(p).superficie + dir * step);
  const alvo = new Set(chaves);
  const base = metrics(p).superficie;
  const modulos = modulosOf(p).map((modulo) => {
    const atual = superficieModulo(p, modulo);
    if (!alvo.has(chaveModulo(modulo))) return { ...modulo, superficie: atual };
    const superficie = round3(clamp(atual + dir * step, minSuperficie(p.espessuraCm), 3, atual));
    const nivel: Nivel = superficie > base + 0.015 ? "alto" : "baixo";
    return { ...modulo, superficie, nivel };
  });
  const alturas = new Set(modulos.map((modulo) => round3(modulo.superficie ?? base)));
  const maximo = Math.max(...modulos.map((modulo) => modulo.superficie ?? base));
  return {
    ...p,
    modulos,
    doisNiveis: alturas.size > 1,
    alturaFundo: round3(Math.min(3, Math.max(base, maximo))),
  };
}

export function setLargura(p: Project, largura: number): Project {
  const tabladoLargura = round3(clamp(largura, 0.3, 4, p.tabladoLargura));
  return syncPieces({ ...p, tabladoLargura });
}

export function setFundo(p: Project, fundo: number): Project {
  const tabladoFundo = round3(clamp(fundo, 0.3, 4, p.tabladoFundo));
  return syncPieces({ ...p, tabladoFundo });
}

export function setEspessura(p: Project, cm: number): Project {
  const espessuraCm = round3(clamp(cm, 1, 15, p.espessuraCm));
  const superficie = round3(Math.max(p.superficie, minSuperficie(espessuraCm)));
  const alturaFundo = p.doisNiveis ? round3(Math.max(p.alturaFundo, superficie)) : p.alturaFundo;
  return { ...p, espessuraCm, superficie, alturaFundo };
}

export function setSuperficie(p: Project, superficie: number): Project {
  const anterior = metrics(p).superficie;
  const next = round3(clamp(superficie, minSuperficie(p.espessuraCm), 3, p.superficie));
  const delta = round3(next - anterior);
  const modulos = modulosOf(p).map((modulo) => ({
    ...modulo,
    superficie: round3(clamp(superficieModulo(p, modulo) + delta, minSuperficie(p.espessuraCm), 3, next)),
  }));
  const alturaFundo = round3(clamp(p.alturaFundo + delta, minSuperficie(p.espessuraCm), 3, p.alturaFundo));
  return { ...p, superficie: next, alturaFundo, modulos };
}

export function definirSuperficie(p: Project, superficie: number, chaves: string[] = []): Project {
  const next = round3(clamp(superficie, minSuperficie(p.espessuraCm), 3, p.superficie));
  if (chaves.length === 0) return setSuperficie(p, next);
  const alvo = new Set(chaves);
  const base = metrics(p).superficie;
  const modulos = modulosOf(p).map((modulo) => {
    const atual = superficieModulo(p, modulo);
    if (!alvo.has(chaveModulo(modulo))) return { ...modulo, superficie: atual };
    const nivel: Nivel = next > base + 0.015 ? "alto" : "baixo";
    return { ...modulo, superficie: next, nivel };
  });
  const maximo = Math.max(...modulos.map((modulo) => modulo.superficie ?? base));
  const alturas = new Set(modulos.map((modulo) => round3(modulo.superficie ?? base)));
  return {
    ...p,
    modulos,
    doisNiveis: alturas.size > 1,
    alturaFundo: round3(Math.min(3, Math.max(base, maximo))),
  };
}

export function setPe(p: Project, pe: number): Project {
  const leg = round3(clamp(pe, 0.05, 2.95, metrics(p).pe));
  return setSuperficie(p, round3(leg + p.espessuraCm / 100));
}

export function setSync(p: Project, syncTravessa: boolean): Project {
  return syncPieces({ ...p, syncTravessa });
}

export function setSyncInterna(p: Project, syncInterna: boolean): Project {
  return syncPieces({ ...p, syncInterna });
}

export function setInternaSentido(p: Project, internaSentido: "frente" | "fundo"): Project {
  return syncPieces({ ...p, internaSentido });
}

function syncPieces(p: Project): Project {
  return {
    ...p,
    travessaFrente: p.syncTravessa ? p.tabladoLargura : p.travessaFrente,
    travessaFundo: p.syncTravessa ? p.tabladoFundo : p.travessaFundo,
    travessaInterna: p.syncInterna ? internaSpan(p) : p.travessaInterna,
  };
}

function lerModulo(item: unknown): Modulo | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Partial<Modulo>;
  const w = o.w === 2 ? 2 : o.w === 1 ? 1 : 0;
  const h = o.h === 2 ? 2 : o.h === 1 ? 1 : 0;
  if ((w !== 1 && w !== 2) || (h !== 1 && h !== 2) || (w === 2 && h === 2)) return null;
  const x = Math.round(Number(o.x));
  const y = Math.round(Number(o.y));
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return null;
  const superficie =
    typeof o.superficie === "number" && Number.isFinite(o.superficie) ? round3(o.superficie) : undefined;
  return superficie === undefined
    ? { x, y, w, h, nivel: o.nivel === "alto" ? "alto" : "baixo" }
    : { x, y, w, h, nivel: o.nivel === "alto" ? "alto" : "baixo", superficie };
}

export type ArquivoPiso = {
  tipo: "piso-tablado";
  versao: 1;
  projeto: Project;
};

export function arquivoDe(projeto: Project): ArquivoPiso {
  return { tipo: "piso-tablado", versao: 1, projeto };
}

export function lerArquivo(raw: unknown): Project {
  if (!raw || typeof raw !== "object") throw new Error("Arquivo inválido.");
  const o = raw as { tipo?: unknown; projeto?: unknown };
  if (o.tipo !== "piso-tablado" || !o.projeto || typeof o.projeto !== "object") {
    throw new Error("Este arquivo não é um piso tablado.");
  }
  return sanitize(o.projeto);
}

export function slugNome(nome: string): string {
  const clean = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "piso";
}

export function sanitize(raw: unknown): Project {
  const base = defaultProject();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<Project>;
  const espessuraCm = round3(clamp(Number(o.espessuraCm), 1, 15, base.espessuraCm));
  const step = Number(o.stepCm);
  const tabladoLargura = round3(clamp(Number(o.tabladoLargura), 0.3, 4, base.tabladoLargura));
  const tabladoFundo = round3(clamp(Number(o.tabladoFundo), 0.3, 4, base.tabladoFundo));
  const superficie = round3(clamp(Number(o.superficie), minSuperficie(espessuraCm), 3, base.superficie));
  const doisNiveis = Boolean(o.doisNiveis);
  const alturaFundo = round3(
    clamp(Number(o.alturaFundo), minSuperficie(espessuraCm), 3, doisNiveis ? Math.max(base.alturaFundo, superficie) : base.alturaFundo),
  );
  const ferramenta: Ferramenta =
    o.ferramenta === "1x1" || o.ferramenta === "1x2" || o.ferramenta === "2x1" ? o.ferramenta : base.ferramenta;
  let cols: number;
  let rows: number;
  let modulos: Modulo[];
  if (Array.isArray(o.modulos)) {
    cols = clampInt(Number(o.cols), 1, 24, base.cols);
    rows = clampInt(Number(o.rows), 1, 24, base.rows);
    modulos = o.modulos.map(lerModulo).filter((modulo): modulo is Modulo => modulo !== null);
  } else {
    const oldCols = clampInt(Number(o.cols), 1, 16, 4);
    const oldRows = clampInt(Number(o.rows), 1, 16, 4);
    const w = snapModulo(tabladoLargura);
    const h = snapModulo(tabladoFundo);
    const occupied =
      Array.isArray(o.occupied) && o.occupied.length > 0
        ? o.occupied.filter((k): k is string => typeof k === "string")
        : fillGrid(oldCols, oldRows);
    modulos = legacyModulos({ occupied, cols: oldCols, rows: oldRows, tabladoLargura, tabladoFundo });
    cols = Math.min(24, oldCols * w);
    rows = Math.min(24, oldRows * h);
  }
  let project: Project = {
    ...base,
    nome: typeof o.nome === "string" && o.nome.trim() ? o.nome.trim().slice(0, 80) : base.nome,
    obs: typeof o.obs === "string" ? o.obs.slice(0, 500) : "",
    tabladoLargura,
    tabladoFundo,
    espessuraCm,
    travessaFrente: round3(clamp(Number(o.travessaFrente), 0.3, 6, base.travessaFrente)),
    travessaFundo: round3(clamp(Number(o.travessaFundo), 0.3, 6, base.travessaFundo)),
    syncTravessa: typeof o.syncTravessa === "boolean" ? o.syncTravessa : base.syncTravessa,
    superficie,
    alturaFundo: doisNiveis ? round3(Math.max(alturaFundo, superficie)) : alturaFundo,
    doisNiveis,
    secaoCm: round3(clamp(Number(o.secaoCm), 2, 20, base.secaoCm)),
    perfilCm: round3(clamp(Number(o.perfilCm), 3, 30, base.perfilCm)),
    cols,
    rows,
    occupied: [],
    modulos,
    ferramenta,
    modoPincel: o.modoPincel === "nivel" ? "nivel" : "peca",
    nivelPincel: o.nivelPincel === "alto" ? "alto" : "baixo",
    showDeck: o.showDeck !== false,
    showLeg: o.showLeg !== false,
    showBeamX: o.showBeamX !== false,
    showBeamY: o.showBeamY !== false,
    showInterna: o.showInterna !== false,
    showX: o.showX !== false,
    showGuarda: o.showGuarda !== false,
    guardaFrente: Boolean(o.guardaFrente),
    guardaFundo: Boolean(o.guardaFundo),
    guardaEsq: Boolean(o.guardaEsq),
    guardaDir: Boolean(o.guardaDir),
    guardaAltura: round3(clamp(Number(o.guardaAltura), 0.5, 1.6, base.guardaAltura)),
    colorGuarda: asHex(o.colorGuarda, base.colorGuarda),
    colorDeck: asHex(o.colorDeck, base.colorDeck),
    colorLeg: asHex(o.colorLeg, base.colorLeg),
    colorBeamX: asHex(o.colorBeamX, base.colorBeamX),
    colorBeamY: asHex(o.colorBeamY, base.colorBeamY),
    travessaInterna: round3(clamp(Number(o.travessaInterna), 0.3, 6, base.travessaInterna)),
    syncInterna: o.syncInterna !== false,
    internaSentido: o.internaSentido === "frente" ? "frente" : "fundo",
    colorInterna: asHex(o.colorInterna, base.colorInterna),
    colorX: asHex(o.colorX, base.colorX),
    canoCm: round3(clamp(Number(o.canoCm), 1, 8, base.canoCm)),
    stepCm: step === 1 || step === 10 ? step : 5,
    carpeteLargura: round3(clamp(Number(o.carpeteLargura), 0.5, 5, base.carpeteLargura)),
    cellX: round3(clamp(Number(o.cellX), 0.2, 4, 1)),
    cellY: round3(clamp(Number(o.cellY), 0.2, 4, 1)),
    yaw: wrapYaw(Number(o.yaw), base.yaw),
    zoom: clamp(Number(o.zoom), 0.45, 2.8, 1),
    panX: clamp(Number(o.panX), -4000, 4000, 0),
    panY: clamp(Number(o.panY), -4000, 4000, 0),
  };
  project = { ...project, modulos: modulosOf(project) };
  if (project.syncTravessa || project.syncInterna) project = syncPieces(project);
  return project;
}

export function wrapYaw(n: number, fallback = -0.55): number {
  if (!Number.isFinite(n)) return fallback;
  let y = n;
  const turn = Math.PI * 2;
  while (y > Math.PI) y -= turn;
  while (y < -Math.PI) y += turn;
  return y;
}

export function inkFor(hex: string): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 150 ? "#1a1408" : "#f3efe4";
}
