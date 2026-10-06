import { carpeteDe, chaveModulo, escalaDe, estruturaOf, ferramentaTamanho, fmtM, metrics, modulosOf, round3, usaCanoX, type Modulo, type Project } from "./model";

export type Camera = {
  yaw: number;
  zoom: number;
  panX: number;
  panY: number;
};

export type Vista = "iso" | "topo";

export type SceneTheme = {
  background: string;
  ground: string;
  groundLine: string;
  label: string;
  edge: string;
};

type Box = {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  color: string;
  depth: number;
  bias: number;
};

const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const VIEW = { x: COS, y: COS, z: Math.sin(Math.PI / 3) };
const LIGHT = { x: 0.32, y: 0.48, z: 0.82 };

export const stageTheme: SceneTheme = {
  background: "#141513",
  ground: "#10120f",
  groundLine: "#3a3d36",
  label: "#a39c8e",
  edge: "rgba(243, 239, 228, 0.55)",
};

export const stageThemeClaro: SceneTheme = {
  background: "#f3eee6",
  ground: "#e7dfd2",
  groundLine: "#cfc6b6",
  label: "#3a342c",
  edge: "rgba(28, 25, 20, 0.55)",
};

function rot(x: number, y: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c - y * s, y: x * s + y * c };
}

function isoProject(x: number, y: number, z: number, yaw: number) {
  const p = rot(x, y, yaw);
  return {
    x: (p.x - p.y) * COS,
    y: (p.x + p.y) * SIN - z,
    depth: p.x + p.y,
  };
}

function projectPoint(x: number, y: number, z: number, yaw: number, vista: Vista) {
  if (vista === "topo") {
    const p = rot(x, y, yaw);
    return { x: p.x, y: p.y, depth: z };
  }
  return isoProject(x, y, z, yaw);
}

function facing(nx: number, ny: number, nz: number, yaw: number) {
  const n = rot(nx, ny, yaw);
  return n.x * VIEW.x + n.y * VIEW.y + nz * VIEW.z > 0.02;
}

function faceVisible(nx: number, ny: number, nz: number, yaw: number, vista: Vista) {
  if (vista === "topo") return nz > 0.2;
  return facing(nx, ny, nz, yaw);
}

export function shade(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const ch = (i: number) => {
    const c = parseInt(raw.slice(i, i + 2), 16);
    const v = amount <= 1 ? c * amount : c + (255 - c) * Math.min(0.85, amount - 1);
    return Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

function lit(hex: string, nx: number, ny: number, nz: number, yaw: number) {
  const n = rot(nx, ny, yaw);
  const len = Math.hypot(LIGHT.x, LIGHT.y, LIGHT.z);
  const d = Math.max(0, (n.x * LIGHT.x + n.y * LIGHT.y + nz * LIGHT.z) / len);
  return shade(hex, 0.4 + 0.85 * d);
}

type Pipe = {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  color: string;
  bias: number;
};

function insetSpan(a: number, b: number, inset: number): [number, number] | null {
  const len = b - a;
  if (len < 0.05) return null;
  if (len <= inset * 2.3) return [a, b];
  return [a + inset, b - inset];
}

function buildBoxes(project: Project, showDeck: boolean): {
  boxes: Box[];
  pipes: Pipe[];
  width: number;
  depth: number;
  top: number;
} {
  const est = estruturaOf(project);
  const { espessuraM } = metrics(project);
  const { x: sx, y: sy } = escalaDe(project);
  const secao = Math.min(project.secaoCm / 100, 0.34);
  const half = secao / 2;
  const perfilBase = Math.max(0.02, project.perfilCm / 100);
  const beamW = Math.min(secao * 0.72, 0.22);
  const boxes: Box[] = [];
  const plate = secao * 1.7;
  const plateH = 0.02;
  const pipes: Pipe[] = [];

  if (project.showLeg !== false) {
    for (const perna of est.pernas) {
      const px = perna.x * sx + perna.ox;
      const py = perna.y * sy + perna.oy;
      const depth = px + py;
      const sapata = Math.min(plateH, perna.pe * 0.2);
      boxes.push({
        x0: px - plate / 2,
        y0: py - plate / 2,
        z0: 0,
        x1: px + plate / 2,
        y1: py + plate / 2,
        z1: sapata,
        color: project.colorLeg,
        depth,
        bias: 0,
      });
      boxes.push({
        x0: px - half,
        y0: py - half,
        z0: sapata,
        x1: px + half,
        y1: py + half,
        z1: perna.pe,
        color: project.colorLeg,
        depth,
        bias: 1,
      });
    }
  }

  const perfilDe = (pe: number) => Math.min(perfilBase, Math.max(0.02, pe * 0.62));

  const addLinear = (
    dir: "x" | "y",
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    pe: number,
    color: string,
    bias: number,
  ) => {
    const perfil = perfilDe(pe);
    if (dir === "x") {
      const span = insetSpan(x0, x1, half);
      if (!span) return;
      boxes.push({
        x0: span[0],
        y0: y0 - beamW / 2,
        z0: pe - perfil,
        x1: span[1],
        y1: y0 + beamW / 2,
        z1: pe,
        color,
        depth: (span[0] + span[1]) / 2 + y0,
        bias,
      });
    } else {
      const span = insetSpan(y0, y1, half);
      if (!span) return;
      boxes.push({
        x0: x0 - beamW / 2,
        y0: span[0],
        z0: pe - perfil,
        x1: x0 + beamW / 2,
        y1: span[1],
        z1: pe,
        color,
        depth: x0 + (span[0] + span[1]) / 2,
        bias,
      });
    }
  };

  if (project.showBeamX !== false) {
    for (const viga of est.vigasX) {
      addLinear("x", viga.x0 * sx, viga.y0 * sy, viga.x1 * sx, viga.y1 * sy, viga.pe, project.colorBeamX, 2);
    }
  }
  if (project.showBeamY !== false) {
    for (const viga of est.vigasY) {
      addLinear("y", viga.x0 * sx, viga.y0 * sy, viga.x1 * sx, viga.y1 * sy, viga.pe, project.colorBeamY, 2);
    }
  }
  if (project.showInterna !== false) {
    for (const viga of est.internas) {
      addLinear(viga.dir, viga.x0 * sx, viga.y0 * sy, viga.x1 * sx, viga.y1 * sy, viga.pe, project.colorInterna, 2.2);
    }
  }

  if (project.showX !== false) {
    const addCross = (dir: "x" | "y", x0: number, y0: number, x1: number, y1: number, pe: number) => {
      const span = insetSpan(dir === "x" ? x0 : y0, dir === "x" ? x1 : y1, half);
      if (!span) return;
      const a = dir === "x" ? { x: span[0], y: y0 } : { x: x0, y: span[0] };
      const b = dir === "x" ? { x: span[1], y: y0 } : { x: x0, y: span[1] };
      const z0 = Math.min(plateH, pe * 0.2);
      pipes.push({ x0: a.x, y0: a.y, z0, x1: b.x, y1: b.y, z1: pe, color: project.colorX, bias: 1.4 });
      pipes.push({ x0: b.x, y0: b.y, z0, x1: a.x, y1: a.y, z1: pe, color: project.colorX, bias: 1.4 });
    };
    for (const viga of est.vigasX) {
      if (!usaCanoX(viga.superficie)) continue;
      addCross("x", viga.x0 * sx, viga.y0 * sy, viga.x1 * sx, viga.y1 * sy, viga.pe);
    }
    for (const viga of est.vigasY) {
      if (!usaCanoX(viga.superficie)) continue;
      addCross("y", viga.x0 * sx, viga.y0 * sy, viga.x1 * sx, viga.y1 * sy, viga.pe);
    }
  }

  if (showDeck) {
    const gap = 0.012;
    for (const modulo of est.modulos) {
      boxes.push({
        x0: modulo.x * sx + gap,
        y0: modulo.y * sy + gap,
        z0: modulo.pe,
        x1: (modulo.x + modulo.w) * sx - gap,
        y1: (modulo.y + modulo.h) * sy - gap,
        z1: modulo.pe + espessuraM,
        color: project.colorDeck,
        depth: (modulo.x + modulo.w / 2) * sx + (modulo.y + modulo.h / 2) * sy,
        bias: 3,
      });
    }
  }

  const superficies = est.modulos.map((modulo) => modulo.superficie);
  let top = superficies.length > 0 ? Math.max(...superficies) : metrics(project).superficie;
  if (project.showGuarda !== false && est.guardas.length > 0) {
    top = Math.max(...est.guardas.map((edge) => edge.superficie)) + project.guardaAltura;
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
      const alongX = edge.side === "frente" || edge.side === "fundo";
      const baseZ = edge.superficie;
      const zTop = baseZ + project.guardaAltura;
      const rail = (z0: number, z1: number) => {
        boxes.push({
          x0: Math.min(x0, x1) - (alongX ? 0 : thick / 2),
          y0: Math.min(y0, y1) - (alongX ? thick / 2 : 0),
          z0,
          x1: Math.max(x0, x1) + (alongX ? 0 : thick / 2),
          y1: Math.max(y0, y1) + (alongX ? thick / 2 : 0),
          z1,
          color: project.colorGuarda,
          depth: (x0 + x1) / 2 + (y0 + y1) / 2,
          bias: 4,
        });
      };
      rail(zTop - thick, zTop);
      rail(baseZ + project.guardaAltura * 0.45, baseZ + project.guardaAltura * 0.45 + thick);
      for (const t of [0.14, 0.86]) {
        const px = x0 + (x1 - x0) * t;
        const py = y0 + (y1 - y0) * t;
        boxes.push({
          x0: px - post / 2,
          y0: py - post / 2,
          z0: baseZ,
          x1: px + post / 2,
          y1: py + post / 2,
          z1: zTop,
          color: project.colorGuarda,
          depth: px + py,
          bias: 4,
        });
      }
    }
  }

  return {
    boxes,
    pipes,
    width: project.cols * sx,
    depth: project.rows * sy,
    top,
  };
}

type Pt = { x: number; y: number };

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(12, 12, 10, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

const FACES: Array<{ n: [number, number, number]; corners: Array<[number, number, number]> }> = [
  {
    n: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    n: [0, 0, -1],
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
    ],
  },
  {
    n: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    n: [-1, 0, 0],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
    ],
  },
  {
    n: [0, 1, 0],
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    n: [0, -1, 0],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 1],
      [1, 0, 1],
    ],
  },
];

function mapStage(
  project: Project,
  camera: Camera,
  width: number,
  height: number,
  padBottom: number,
  showDeck: boolean,
  vista: Vista = "iso",
  crescer = true,
) {
  const scene = buildBoxes(project, showDeck);
  const { yaw } = camera;
  const ponto = (x: number, y: number, z: number) => projectPoint(x, y, z, yaw, vista);
  const samples: Array<{ x: number; y: number }> = [];
  const take = (x: number, y: number, z: number) => {
    samples.push(ponto(x, y, z));
  };
  const margin = Math.max(scene.width, scene.depth) * 0.16;
  const cota = Math.max(0.28, Math.min(0.55, Math.max(scene.width, scene.depth) * 0.07));
  const peca = ferramentaTamanho(project.ferramenta);
  const esc = escalaDe(project);
  const extraX = crescer && project.cols + peca.w <= 24 ? peca.w * esc.x : 0;
  const extraY = crescer && project.rows + peca.h <= 24 ? peca.h * esc.y : 0;
  take(-margin, -margin, 0);
  take(scene.width + extraX + margin * 0.35, scene.depth + extraY + margin * 0.35, 0);
  take(0, 0, scene.top + 0.05);
  take(scene.width, scene.depth, scene.top + 0.05);
  take(scene.width / 2, -margin * 1.15, scene.top);
  take(scene.width / 2, scene.depth + Math.max(extraY, cota) + margin * 0.75, 0);
  take(-cota * 1.8, scene.depth / 2, 0.04);
  take(scene.width / 2, scene.depth + Math.min(0.28, cota), 0.04);
  for (const box of scene.boxes) {
    take(box.x0, box.y0, box.z1);
    take(box.x1, box.y1, box.z0);
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of samples) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const viewH = Math.max(80, height - padBottom);
  const bw = Math.max(0.001, maxX - minX);
  const bh = Math.max(0.001, maxY - minY);
  const pad = Math.min(width, viewH) * 0.08;
  const scale = Math.min((width - pad * 2) / bw, (viewH - pad * 2) / bh) * camera.zoom;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const toScreen = (x: number, y: number, z: number) => {
    const p = ponto(x, y, z);
    return {
      x: width / 2 + (p.x - cx) * scale + camera.panX,
      y: viewH / 2 + (p.y - cy) * scale + camera.panY,
    };
  };
  return { scene, toScreen, yaw, margin, scale, ponto, vista, cota };
}

function ladoParaCrescer(
  project: Project,
  toScreen: (x: number, y: number, z: number) => { x: number; y: number },
  px: number,
  py: number,
  width: number,
  depth: number,
): "x" | "y" | null {
  const peca = ferramentaTamanho(project.ferramenta);
  const { x: sx, y: sy } = escalaDe(project);
  const podeX = project.cols + peca.w <= 24;
  const podeY = project.rows + peca.h <= 24;
  if (!podeX && !podeY) return null;
  const z = 0.2;
  const borda = (x0: number, y0: number, x1: number, y1: number) => {
    const a = toScreen(x0, y0, z);
    const b = toScreen(x1, y1, z);
    return distToSeg(px, py, a.x, a.y, b.x, b.y);
  };
  let dx = podeX ? Math.min(borda(width, 0, width, depth), borda(width + peca.w * sx, 0, width + peca.w * sx, depth)) : Infinity;
  let dy = podeY ? Math.min(borda(0, depth, width, depth), borda(0, depth + peca.h * sy, width, depth + peca.h * sy)) : Infinity;
  const limite = 88;
  if (dx > limite && dy > limite) return null;
  if (dx <= dy && podeX && dx <= limite) return "x";
  if (podeY && dy <= limite) return "y";
  return podeX && dx <= limite ? "x" : null;
}

function setaCrescer(
  ctx: CanvasRenderingContext2D,
  toScreen: (x: number, y: number, z: number) => { x: number; y: number },
  x: number,
  y: number,
  dx: number,
  dy: number,
) {
  const origem = toScreen(x, y, 0.35);
  const ponta = toScreen(x + dx, y + dy, 0.35);
  const ang = Math.atan2(ponta.y - origem.y, ponta.x - origem.x);
  ctx.save();
  ctx.translate(origem.x, origem.y);
  ctx.rotate(ang);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(2, -12);
  ctx.lineTo(2, -5);
  ctx.lineTo(-18, -5);
  ctx.lineTo(-18, 5);
  ctx.lineTo(2, 5);
  ctx.lineTo(2, 12);
  ctx.closePath();
  ctx.fillStyle = "#f3efe4";
  ctx.strokeStyle = "#1a1408";
  ctx.lineWidth = 2.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: Project,
  camera: Camera,
  theme: SceneTheme,
  showDeck: boolean,
  opts?: {
    caption?: string;
    padBottom?: number;
    selecao?: string[];
    buraco?: boolean;
    memoria?: Modulo | null;
    vista?: Vista;
    carpete?: boolean;
    ponteiro?: { x: number; y: number } | null;
  },
) {
  const vista = opts?.vista ?? "iso";
  const mapped = mapStage(project, camera, width, height, opts?.padBottom ?? 0, showDeck, vista, !opts?.caption);
  const { scene, toScreen, yaw, margin, scale, ponto, cota } = mapped;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  const g = margin * 0.35;
  poly(
    ctx,
    [
      toScreen(-g, -g, 0),
      toScreen(scene.width + g, -g, 0),
      toScreen(scene.width + g, scene.depth + g, 0),
      toScreen(-g, scene.depth + g, 0),
    ],
    theme.ground,
  );

  const bayX = escalaDe(project).x;
  const bayY = escalaDe(project).y;
  const occupied = new Set<string>();
  for (const modulo of modulosOf(project)) {
    for (let y = modulo.y; y < modulo.y + modulo.h; y++) {
      for (let x = modulo.x; x < modulo.x + modulo.w; x++) occupied.add(`${x},${y}`);
    }
  }
  const ghost = (c: number, r: number, fill: string, edge: boolean) => {
    const z = 0.015;
    const pts = [
      toScreen(c * bayX, r * bayY, z),
      toScreen((c + 1) * bayX, r * bayY, z),
      toScreen((c + 1) * bayX, (r + 1) * bayY, z),
      toScreen(c * bayX, (r + 1) * bayY, z),
    ];
    poly(ctx, pts, fill);
    if (!edge) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.strokeStyle = "rgba(226, 162, 58, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  for (let r = 0; r < project.rows; r++) {
    for (let c = 0; c < project.cols; c++) {
      if (!occupied.has(`${c},${r}`) && !opts?.buraco) ghost(c, r, "rgba(226, 162, 58, 0.2)", false);
    }
  }
  const pecaCrescer = ferramentaTamanho(project.ferramenta);
  const ladoCrescer =
    !opts?.caption && opts?.ponteiro
      ? ladoParaCrescer(project, toScreen, opts.ponteiro.x, opts.ponteiro.y, scene.width, scene.depth)
      : null;
  if (ladoCrescer === "x") {
    for (let y = 0; y + pecaCrescer.h <= project.rows; y += pecaCrescer.h) {
      for (let dy = 0; dy < pecaCrescer.h; dy++) {
        for (let dx = 0; dx < pecaCrescer.w; dx++) ghost(project.cols + dx, y + dy, "rgba(226, 162, 58, 0.38)", true);
      }
    }
  }
  if (ladoCrescer === "y") {
    for (let x = 0; x + pecaCrescer.w <= project.cols; x += pecaCrescer.w) {
      for (let dy = 0; dy < pecaCrescer.h; dy++) {
        for (let dx = 0; dx < pecaCrescer.w; dx++) ghost(x + dx, project.rows + dy, "rgba(226, 162, 58, 0.38)", true);
      }
    }
  }

  type Prim = { depth: number; bias: number; paint: () => void };
  const structure: Prim[] = [];
  const caps: Prim[] = [];
  for (const box of scene.boxes) {
    const prim: Prim = {
      depth: ponto((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, (box.z0 + box.z1) / 2).depth,
      bias: box.bias,
      paint: () => {
        const xs = [box.x0, box.x1];
        const ys = [box.y0, box.y1];
        const zs = [box.z0, box.z1];
        for (const face of FACES) {
          if (!faceVisible(face.n[0], face.n[1], face.n[2], yaw, vista)) continue;
          const pts = face.corners.map(([ix, iy, iz]) => toScreen(xs[ix], ys[iy], zs[iz]));
          poly(ctx, pts, lit(box.color, face.n[0], face.n[1], face.n[2], yaw));
        }
      },
    };
    (box.bias >= 3 ? caps : structure).push(prim);
  }
  const pipeW = Math.max(2, Math.min(6, scale * (project.canoCm / 100)));
  for (const pipe of scene.pipes) {
    structure.push({
      depth: ponto((pipe.x0 + pipe.x1) / 2, (pipe.y0 + pipe.y1) / 2, (pipe.z0 + pipe.z1) / 2).depth,
      bias: pipe.bias,
      paint: () => {
        const a = toScreen(pipe.x0, pipe.y0, pipe.z0);
        const b = toScreen(pipe.x1, pipe.y1, pipe.z1);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = pipe.color;
        ctx.lineWidth = pipeW;
        ctx.lineCap = "round";
        ctx.stroke();
      },
    });
  }
  const paintSorted = (list: Prim[]) => {
    list.sort((a, b) => a.depth - b.depth || a.bias - b.bias);
    for (const prim of list) prim.paint();
  };
  paintSorted(structure);
  paintSorted(caps);

  if (opts?.buraco) {
    const piso = metrics(project).superficie;
    const memoria = opts.memoria;
    ctx.save();
    ctx.setLineDash([7, 5]);
    for (let r = 0; r < project.rows; r++) {
      for (let c = 0; c < project.cols; c++) {
        if (occupied.has(`${c},${r}`)) continue;
        const noUltimo =
          memoria != null &&
          c >= memoria.x &&
          c < memoria.x + memoria.w &&
          r >= memoria.y &&
          r < memoria.y + memoria.h;
        const z = noUltimo && typeof memoria.superficie === "number" ? memoria.superficie : piso;
        const pts = [
          toScreen(c * bayX, r * bayY, z),
          toScreen((c + 1) * bayX, r * bayY, z),
          toScreen((c + 1) * bayX, (r + 1) * bayY, z),
          toScreen(c * bayX, (r + 1) * bayY, z),
        ];
        poly(ctx, pts, noUltimo ? "rgba(226, 162, 58, 0.5)" : "rgba(226, 162, 58, 0.28)");
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const ponto of pts.slice(1)) ctx.lineTo(ponto.x, ponto.y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(226, 162, 58, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.fillStyle = theme.label;
  ctx.font = "600 13px 'Source Sans 3', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.background;
  const labelAt = (text: string, x: number, y: number, z: number) => {
    const p = toScreen(x, y, z);
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.background;
    ctx.strokeText(text, p.x, p.y);
    ctx.fillStyle = theme.label;
    ctx.fillText(text, p.x, p.y);
  };

  const medida = (x0: number, y0: number, x1: number, y1: number, texto: string) => {
    const z = 0.04;
    const a = toScreen(x0, y0, z);
    const b = toScreen(x1, y1, z);
    ctx.save();
    ctx.strokeStyle = theme.label;
    ctx.lineWidth = 1.25;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const tick = 7;
    const nx = Math.cos(ang + Math.PI / 2);
    const ny = Math.sin(ang + Math.PI / 2);
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.moveTo(p.x - nx * tick, p.y - ny * tick);
      ctx.lineTo(p.x + nx * tick, p.y + ny * tick);
      ctx.stroke();
    }
    ctx.restore();
    labelAt(texto, (x0 + x1) / 2, (y0 + y1) / 2, z);
  };

  const pecaMed = ferramentaTamanho(project.ferramenta);
  const faixaY = !opts?.caption && project.rows + pecaMed.h <= 24 ? pecaMed.h * bayY : 0;
  const yLinha = scene.depth + Math.min(0.28, cota);
  const yNome = scene.depth + (faixaY > 0 ? faixaY + margin * 0.38 : cota + margin * 0.55);
  const xLado = -cota;
  ctx.save();
  ctx.strokeStyle = theme.label;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  const apoio = (x0: number, y0: number, x1: number, y1: number) => {
    const a = toScreen(x0, y0, 0.02);
    const b = toScreen(x1, y1, 0.02);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  apoio(0, scene.depth, 0, yLinha + 0.12);
  apoio(scene.width, scene.depth, scene.width, yLinha + 0.12);
  apoio(0, 0, xLado - cota * 0.25, 0);
  apoio(0, scene.depth, xLado - cota * 0.25, scene.depth);
  ctx.restore();
  medida(0, yLinha, scene.width, yLinha, `${fmtM(scene.width)} m`);
  medida(xLado, 0, xLado, scene.depth, `${fmtM(scene.depth)} m`);

  labelAt("FRENTE", scene.width / 2, yNome, 0);
  labelAt("FUNDO", scene.width / 2, -margin * 0.95, scene.top);
  if (ladoCrescer === "x") setaCrescer(ctx, toScreen, scene.width + (pecaCrescer.w * bayX) / 2, scene.depth / 2, bayX * 0.55, 0);
  if (ladoCrescer === "y") setaCrescer(ctx, toScreen, scene.width / 2, scene.depth + (pecaCrescer.h * bayY) / 2, 0, bayY * 0.55);

  if (opts?.carpete && !opts.caption) {
    const mods = estruturaOf(project).modulos;
    const area = round3(mods.reduce((sum, modulo) => sum + modulo.w * bayX * modulo.h * bayY, 0));
    const coberto = new Set<string>();
    for (const modulo of mods) {
      for (let y = modulo.y; y < modulo.y + modulo.h; y++) {
        for (let x = modulo.x; x < modulo.x + modulo.w; x++) coberto.add(`${x},${y}`);
      }
    }
    const carpete = carpeteDe(area, scene.width, scene.depth, coberto.size === project.cols * project.rows, project.carpeteLargura || 2);
    if (!carpete.recorte && carpete.faixas > 0) {
      ctx.save();
      for (let i = 0; i < carpete.faixas; i++) {
        const largura = i === carpete.faixas - 1 ? carpete.ultima : carpete.largura;
        const inicio = i * carpete.largura;
        const fim = inicio + largura;
        const canto =
          carpete.sentido === "frente"
            ? [
                toScreen(0, inicio, scene.top + 0.03),
                toScreen(scene.width, inicio, scene.top + 0.03),
                toScreen(scene.width, Math.min(scene.depth, fim), scene.top + 0.03),
                toScreen(0, Math.min(scene.depth, fim), scene.top + 0.03),
              ]
            : [
                toScreen(inicio, 0, scene.top + 0.03),
                toScreen(Math.min(scene.width, fim), 0, scene.top + 0.03),
                toScreen(Math.min(scene.width, fim), scene.depth, scene.top + 0.03),
                toScreen(inicio, scene.depth, scene.top + 0.03),
              ];
        poly(ctx, canto, i % 2 === 0 ? "rgba(226, 162, 58, 0.28)" : "rgba(226, 162, 58, 0.14)");
      }
      ctx.restore();
      labelAt("CARPETE", scene.width / 2, scene.depth / 2, scene.top + 0.08);
    }
  }

  if (vista === "topo") {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.edge;
    for (const modulo of estruturaOf(project).modulos) {
      const z = modulo.superficie + 0.02;
      const pts = [
        toScreen(modulo.x * bayX, modulo.y * bayY, z),
        toScreen((modulo.x + modulo.w) * bayX, modulo.y * bayY, z),
        toScreen((modulo.x + modulo.w) * bayX, (modulo.y + modulo.h) * bayY, z),
        toScreen(modulo.x * bayX, (modulo.y + modulo.h) * bayY, z),
      ];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const pontoTela of pts.slice(1)) ctx.lineTo(pontoTela.x, pontoTela.y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  const superficies = estruturaOf(project).modulos.map((modulo) => modulo.superficie);
  if (new Set(superficies.map((altura) => round3(altura))).size > 1) {
    for (const modulo of estruturaOf(project).modulos) {
      labelAt(
        fmtM(modulo.superficie),
        (modulo.x + modulo.w / 2) * bayX,
        (modulo.y + modulo.h / 2) * bayY,
        modulo.superficie + 0.08,
      );
    }
  }

  const marcados = new Set(opts?.selecao ?? []);
  if (marcados.size > 0) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#e2a23a";
    for (const modulo of estruturaOf(project).modulos) {
      if (!marcados.has(chaveModulo(modulo))) continue;
      const z = modulo.superficie + 0.04;
      const pts = [
        toScreen(modulo.x * bayX, modulo.y * bayY, z),
        toScreen((modulo.x + modulo.w) * bayX, modulo.y * bayY, z),
        toScreen((modulo.x + modulo.w) * bayX, (modulo.y + modulo.h) * bayY, z),
        toScreen(modulo.x * bayX, (modulo.y + modulo.h) * bayY, z),
      ];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const ponto of pts.slice(1)) ctx.lineTo(ponto.x, ponto.y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  if (opts?.caption) {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "600 15px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.fillStyle = theme.label;
    ctx.fillText(opts.caption, 18, 16);
  }
}

function insidePoly(pts: Array<{ x: number; y: number }>, x: number, y: number) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
  }
  return inside;
}

function distToSeg(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function distToPoly(pts: Array<{ x: number; y: number }>, x: number, y: number): number {
  if (insidePoly(pts, x, y)) return 0;
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    best = Math.min(best, distToSeg(x, y, pts[j].x, pts[j].y, pts[i].x, pts[i].y));
  }
  return best;
}

export type StageHit = { kind: "cell"; c: number; r: number } | { kind: "add-col" } | { kind: "add-row" };

export function pickStage(
  project: Project,
  camera: Camera,
  width: number,
  height: number,
  px: number,
  py: number,
  padBottom: number,
  showDeck: boolean,
  buraco: { superficie: number; memoria: Modulo | null } | null = null,
  vista: Vista = "iso",
): StageHit | null {
  const { toScreen, ponto } = mapStage(project, camera, width, height, padBottom, showDeck, vista);
  const { x: sx, y: sy } = escalaDe(project);
  const quad = (c: number, r: number, z: number) => [
    toScreen(c * sx, r * sy, z),
    toScreen((c + 1) * sx, r * sy, z),
    toScreen((c + 1) * sx, (r + 1) * sy, z),
    toScreen(c * sx, (r + 1) * sy, z),
  ];
  const mods = estruturaOf(project).modulos;
  const best: { depth: number; hit: StageHit | null } = { depth: -Infinity, hit: null };
  const consider = (c: number, r: number, z: number, hit: StageHit) => {
    const pts = quad(c, r, z);
    if (!insidePoly(pts, px, py)) return;
    const depth = ponto((c + 0.5) * sx, (r + 0.5) * sy, z).depth;
    if (depth > best.depth) {
      best.depth = depth;
      best.hit = hit;
    }
  };
  const zDoBuraco = (c: number, r: number) => {
    const memoria = buraco?.memoria;
    if (
      memoria &&
      c >= memoria.x &&
      c < memoria.x + memoria.w &&
      r >= memoria.y &&
      r < memoria.y + memoria.h &&
      typeof memoria.superficie === "number"
    ) {
      return memoria.superficie;
    }
    return buraco?.superficie ?? 0.015;
  };
  for (let r = 0; r < project.rows; r++) {
    for (let c = 0; c < project.cols; c++) {
      const modulo = mods.find((item) => c >= item.x && c < item.x + item.w && r >= item.y && r < item.y + item.h);
      const hit: StageHit = { kind: "cell", c, r };
      if (modulo) consider(c, r, showDeck ? modulo.superficie : modulo.pe, hit);
      else {
        const z = zDoBuraco(c, r);
        consider(c, r, z, hit);
        if (buraco && Math.abs(z - 0.015) > 0.001) consider(c, r, 0.015, hit);
      }
    }
  }
  if (buraco && !best.hit) {
    let perto = 22;
    for (let r = 0; r < project.rows; r++) {
      for (let c = 0; c < project.cols; c++) {
        const ocupado = mods.some((item) => c >= item.x && c < item.x + item.w && r >= item.y && r < item.y + item.h);
        if (ocupado) continue;
        const z = zDoBuraco(c, r);
        const pts = quad(c, r, z);
        const dist = distToPoly(pts, px, py);
        if (dist <= perto) {
          perto = dist;
          best.hit = { kind: "cell", c, r };
          best.depth = ponto((c + 0.5) * sx, (r + 0.5) * sy, z).depth;
        }
      }
    }
  }
  const peca = ferramentaTamanho(project.ferramenta);
  if (project.cols + peca.w <= 24) {
    for (let y = 0; y + peca.h <= project.rows; y += peca.h) {
      for (let dy = 0; dy < peca.h; dy++) {
        for (let dx = 0; dx < peca.w; dx++) consider(project.cols + dx, y + dy, 0.015, { kind: "add-col" });
      }
    }
  }
  if (project.rows + peca.h <= 24) {
    for (let x = 0; x + peca.w <= project.cols; x += peca.w) {
      for (let dy = 0; dy < peca.h; dy++) {
        for (let dx = 0; dx < peca.w; dx++) consider(x + dx, project.rows + dy, 0.015, { kind: "add-row" });
      }
    }
  }
  const memoria = buraco?.memoria;
  if (buraco && memoria) {
    const z = typeof memoria.superficie === "number" ? memoria.superficie : buraco.superficie;
    let perto = 18;
    let escolhido: StageHit | null = null;
    for (let r = memoria.y; r < memoria.y + memoria.h; r++) {
      for (let c = memoria.x; c < memoria.x + memoria.w; c++) {
        if (c < 0 || r < 0 || c >= project.cols || r >= project.rows) continue;
        const ocupado = mods.some((item) => c >= item.x && c < item.x + item.w && r >= item.y && r < item.y + item.h);
        if (ocupado) continue;
        const pts = quad(c, r, z);
        const dist = distToPoly(pts, px, py);
        if (dist <= perto) {
          perto = dist;
          escolhido = { kind: "cell", c, r };
        }
      }
    }
    if (escolhido) best.hit = escolhido;
  }
  return best.hit;
}

export function chavesNoRetangulo(
  project: Project,
  camera: Camera,
  width: number,
  height: number,
  padBottom: number,
  showDeck: boolean,
  vista: Vista,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string[] {
  const { toScreen } = mapStage(project, camera, width, height, padBottom, showDeck, vista);
  const { x: sx, y: sy } = escalaDe(project);
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const ids: string[] = [];
  for (const modulo of estruturaOf(project).modulos) {
    const p = toScreen((modulo.x + modulo.w / 2) * sx, (modulo.y + modulo.h / 2) * sy, modulo.superficie);
    if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) ids.push(chaveModulo(modulo));
  }
  return ids;
}

export function renderStageJpeg(
  project: Project,
  camera: Camera,
  showDeck: boolean,
  caption: string,
  vista: Vista = "iso",
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível desenhar a planta.");
  const drawn: Project = {
    ...project,
    showLeg: true,
    showBeamX: true,
    showBeamY: true,
    showInterna: true,
    showX: true,
    showGuarda: true,
  };
  drawStage(
    ctx,
    1400,
    900,
    drawn,
    { yaw: vista === "topo" ? 0 : camera.yaw, zoom: 1, panX: 0, panY: 0 },
    stageTheme,
    showDeck,
    { caption, vista },
  );
  return canvas.toDataURL("image/jpeg", 0.86);
}
