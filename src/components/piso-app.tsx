import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileDown,
  Keyboard,
  Plus,
  RotateCcw,
  Sun,
  Moon,
  Trash2,
  Undo2,
} from "lucide-react";
import { chavesNoRetangulo, drawStage, pickStage, stageTheme, stageThemeClaro, type Vista } from "@/lib/stage/draw";
import {
  ajustarAltura,
  billOf,
  chaveModulo,
  crescerFrente,
  crescerFundo,
  defaultProject,
  definirSuperficie,
  ferramentaTamanho,
  fmtM,
  fmtQty,
  metrics,
  moduloNa,
  montarPiso,
  modulosOf,
  pecasDoModulo,
  removerSelecao,
  reporTablado,
  sanitize,
  setEspessura,
  setInternaSentido,
  setPe,
  setSuperficie,
  setSync,
  setSyncInterna,
  superficieModulo,
  tamanhoDoModulo,
  usaCanoX,
  wrapYaw,
  type Bill,
  type BillLine,
  type Ferramenta,
  type Carpete,
  type Modulo,
  type Project,
} from "@/lib/stage/model";

const LIB_KEY = "piso-tablado-biblioteca";
const LEGADO_KEY = "piso-tablado-v1";
const COACH_KEY = "piso-tablado-atalhos-ok";
const PRESET_KEY = "piso-tablado-presets";
const INICIO_KEY = "piso-tablado-inicio-ok";
const LADO_KEY = "piso-tablado-lado";
const TEMA_KEY = "piso-tablado-tema";

const ALTURAS = [0.4, 0.6, 0.8, 1, 1.2, 1.4];

const field =
  "h-11 w-full rounded-sm border border-line bg-bg px-3 text-base text-fg outline-none focus:border-accent disabled:text-faint tabular-nums";
const iconBtn =
  "inline-flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface-2 text-lg text-fg transition-colors duration-200 hover:border-muted disabled:opacity-40";
const quietBtn =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-line bg-surface-2 px-3 text-sm font-medium text-fg transition-colors duration-200 hover:border-muted";
const activeBtn =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-accent px-3 text-sm font-semibold text-accent-ink";
const chipOn =
  "inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border border-accent bg-surface-2 px-2 text-sm font-medium text-fg";
const chipOff =
  "inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border border-line bg-bg px-2 text-sm font-medium text-faint line-through";

type PisoItem = { id: string; nome: string; projeto: Project };
type Rascunho = {
  nome: string;
  ferramenta: Ferramenta;
  frenteM: number;
  fundoM: number;
  espessuraCm: number;
  superficie: number;
  naFrente: number;
  noFundo: number;
};
type PresetSalvo = Rascunho & { id: string };

function nomeDaFerramenta(ferramenta: Ferramenta): string {
  if (ferramenta === "1x1") return "Tablado 1×1";
  if (ferramenta === "1x2") return "Tablado 1×2";
  return "Tablado 2×1";
}

function nomeDoTamanho(frente: number, fundo: number): string {
  return `Tablado ${fmtM(frente)} × ${fmtM(fundo)}`;
}

function nomeAutomatico(atual: Rascunho): boolean {
  const nome = atual.nome.trim();
  return (
    nome.length === 0 ||
    nome === nomeDaFerramenta("1x1") ||
    nome === nomeDaFerramenta("2x1") ||
    nome === nomeDaFerramenta("1x2") ||
    nome === nomeDoTamanho(atual.frenteM, atual.fundoM)
  );
}

function rascunhoBase(ferramenta: Ferramenta = "2x1"): Rascunho {
  const frenteM = ferramenta === "1x1" || ferramenta === "1x2" ? 1 : 2;
  const fundoM = ferramenta === "1x2" ? 2 : 1;
  return {
    nome: nomeDaFerramenta(ferramenta),
    ferramenta,
    frenteM,
    fundoM,
    espessuraCm: 5,
    superficie: 0.8,
    naFrente: 4,
    noFundo: 4,
  };
}

function normalizarPreset(item: Partial<PresetSalvo> | null): PresetSalvo | null {
  if (!item || typeof item.id !== "string") return null;
  const ferramenta: Ferramenta =
    item.ferramenta === "1x1" || item.ferramenta === "1x2" || item.ferramenta === "2x1" ? item.ferramenta : "2x1";
  const base = rascunhoBase(ferramenta);
  const frente = Number(item.frenteM);
  const fundo = Number(item.fundoM);
  const layout = tamanhoDoModulo(Number.isFinite(frente) ? frente : base.frenteM, Number.isFinite(fundo) ? fundo : base.fundoM);
  return {
    id: item.id,
    nome: typeof item.nome === "string" && item.nome.trim() ? item.nome.trim().slice(0, 40) : nomeDoTamanho(layout.frente, layout.fundo),
    ferramenta: layout.ferramenta,
    frenteM: layout.frente,
    fundoM: layout.fundo,
    espessuraCm: Number.isFinite(Number(item.espessuraCm)) ? Number(item.espessuraCm) : base.espessuraCm,
    superficie: Number.isFinite(Number(item.superficie)) ? Number(item.superficie) : base.superficie,
    naFrente: Number.isFinite(Number(item.naFrente)) ? Math.round(Number(item.naFrente)) : base.naFrente,
    noFundo: Number.isFinite(Number(item.noFundo)) ? Math.round(Number(item.noFundo)) : base.noFundo,
  };
}

const ATALHOS: Array<[string, string]> = [
  ["Remover", "Clique tira. Clique de novo no buraco, ou perto, coloca de volta"],
  ["Altura", "Ligue o botão, clique para marcar e use as setas"],
  ["↑ ↓", "Sobe ou desce os marcados. Sem marca, mexe no piso todo"],
  ["← →", "Gira a planta. No celular, dois dedos giram e dão zoom"],
  ["Shift", "Arrasta um retângulo para marcar vários. Shift e clique marca a faixa"],
  ["Shift ↑", "Nas setas, a altura muda de 1 em 1 cm"],
  ["T", "Alterna o 3D e a vista de cima"],
  ["Delete", "Tira os tablados marcados no modo altura"],
  ["1 2 3", "Escolhe o preset 1×1, 2×1 ou 1×2"],
  ["Ctrl Z", "Desfaz a última montagem"],
  ["Ctrl S", "Salva o preset do tablado"],
  ["V", "Abre o 3D ou volta para as medidas"],
  ["Esc", "Desmarca todos os tablados selecionados. Sem seleção, sai da tela cheia"],
  ["?", "Abre esta lista"],
];

function assinatura(p: Project): string {
  const { yaw: _yaw, zoom: _zoom, panX: _panX, panY: _panY, nome: _nome, obs: _obs, ...resto } = p;
  return JSON.stringify(resto);
}

function nomeDe(projeto: Project): string {
  return projeto.nome.trim() || "Sem nome";
}

function gravarItem(lista: PisoItem[], id: string, projeto: Project): PisoItem[] {
  const nome = nomeDe(projeto);
  return lista.map((item) => (item.id === id ? { ...item, nome, projeto: { ...projeto, nome } } : item));
}

function corDo(projeto: Project, cor: BillLine["cor"]): string {
  if (cor === "deck") return projeto.colorDeck;
  if (cor === "leg") return projeto.colorLeg;
  if (cor === "beamX") return projeto.colorBeamX;
  if (cor === "beamY") return projeto.colorBeamY;
  if (cor === "interna") return projeto.colorInterna;
  if (cor === "guarda") return projeto.colorGuarda;
  return projeto.colorX;
}

function comCor(projeto: Project, cor: BillLine["cor"], valor: string): Project {
  if (cor === "deck") return { ...projeto, colorDeck: valor };
  if (cor === "leg") return { ...projeto, colorLeg: valor };
  if (cor === "beamX") return { ...projeto, colorBeamX: valor };
  if (cor === "beamY") return { ...projeto, colorBeamY: valor };
  if (cor === "interna") return { ...projeto, colorInterna: valor };
  if (cor === "guarda") return { ...projeto, colorGuarda: valor };
  return { ...projeto, colorX: valor };
}

export function PisoApp() {
  const [project, setProject] = useState<Project>(defaultProject);
  const [itens, setItens] = useState<PisoItem[]>([]);
  const [ativo, setAtivo] = useState("");
  const [booted, setBooted] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [focoPlanta, setFocoPlanta] = useState(false);
  const [guia, setGuia] = useState(false);
  const [dica, setDica] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [selecao, setSelecao] = useState<string[]>([]);
  const [modo, setModo] = useState<"altura" | "remover">("altura");
  const [modeloBusy, setModeloBusy] = useState<"" | "obj" | "kmz" | "tds">("");
  const [modeloErro, setModeloErro] = useState("");
  const [aba, setAba] = useState<"piso" | "lista" | "acabamento" | "documento">("piso");
  const [aviso, setAviso] = useState("");
  const [desfazerTexto, setDesfazerTexto] = useState("");
  const [inicio, setInicio] = useState(false);
  const [confirmarMontar, setConfirmarMontar] = useState(false);
  const [lado, setLado] = useState(26);
  const [painel, setPainel] = useState<"meio" | "mapa" | "lista">("meio");
  const [tema, setTema] = useState<"escuro" | "claro">("escuro");
  const [rascunho, setRascunho] = useState<Rascunho>(rascunhoBase());
  const rascunhoRef = useRef(rascunho);
  rascunhoRef.current = rascunho;
  const porRascunho = (next: Rascunho | ((atual: Rascunho) => Rascunho)) => {
    const valor = typeof next === "function" ? next(rascunhoRef.current) : next;
    rascunhoRef.current = valor;
    setRascunho(valor);
  };
  const [presets, setPresets] = useState<PresetSalvo[]>([]);
  const historico = useRef<Array<{ snap: string; texto: string }>>([]);
  const ultima = useRef("");
  const projetoAnterior = useRef<Project | null>(null);
  const limparHistorico = useRef(true);
  const ignorarHistorico = useRef(false);
  const vivo = useRef({
    project,
    guia,
    selecao: [] as string[],
    modo: "altura" as "altura" | "remover",
    desfazer: () => {},
    salvarPreset: () => {},
    limparSelecao: () => {},
    tirar: () => {},
  });

  useEffect(() => {
    let projeto = defaultProject();
    let lista: PisoItem[] = [];
    let id = "";
    let primeiraVez = true;
    try {
      const bruto = localStorage.getItem(LIB_KEY);
      if (bruto) {
        primeiraVez = false;
        const salvo = JSON.parse(bruto) as { ativo?: string; itens?: Array<{ id?: string; projeto?: unknown }> };
        lista = (salvo.itens ?? [])
          .map((item) => {
            const piso = sanitize(item.projeto);
            return { id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(), nome: nomeDe(piso), projeto: piso };
          })
          .slice(0, 30);
        const escolhido = lista.find((item) => item.id === salvo.ativo) ?? lista[0];
        if (escolhido) {
          id = escolhido.id;
          projeto = escolhido.projeto;
        }
      }
      if (!id) {
        const antigo = localStorage.getItem(LEGADO_KEY);
        if (antigo) projeto = sanitize(JSON.parse(antigo) as unknown);
        id = crypto.randomUUID();
        lista = [{ id, nome: nomeDe(projeto), projeto }];
      }
    } catch {
      id = crypto.randomUUID();
      projeto = defaultProject();
      lista = [{ id, nome: nomeDe(projeto), projeto }];
    }
    limparHistorico.current = true;
    setItens(lista);
    setAtivo(id);
    setProject(projeto);
    setDica(localStorage.getItem(COACH_KEY) !== "1");
    setInicio(primeiraVez && localStorage.getItem(INICIO_KEY) !== "1");
    const ladoSalvo = Number(localStorage.getItem(LADO_KEY));
    if (ladoSalvo >= 18 && ladoSalvo <= 42) setLado(ladoSalvo);
    const temaSalvo = localStorage.getItem(TEMA_KEY);
    if (temaSalvo === "claro" || temaSalvo === "escuro") setTema(temaSalvo);
    try {
      const bruto = localStorage.getItem(PRESET_KEY);
      if (bruto) {
        const lista = JSON.parse(bruto) as PresetSalvo[];
        if (Array.isArray(lista)) {
          setPresets(
            lista
              .map((item) => normalizarPreset(item))
              .filter((item): item is PresetSalvo => item !== null)
              .slice(0, 20),
          );
        }
      }
    } catch {
      /* sem presets salvos */
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "claro" ? "#f3eee6" : "#141513");
    if (!booted) return;
    localStorage.setItem(TEMA_KEY, tema);
  }, [tema, booted]);

  useEffect(() => {
    if (!booted || !ativo) return;
    setItens((atual) => {
      if (!atual.some((item) => item.id === ativo)) return atual;
      const next = gravarItem(atual, ativo, project);
      localStorage.setItem(LIB_KEY, JSON.stringify({ versao: 1, ativo, itens: next }));
      return next;
    });
  }, [project, ativo, booted]);

  useEffect(() => {
    if (!booted) return;
    const agora = assinatura(project);
    if (limparHistorico.current) {
      limparHistorico.current = false;
      ignorarHistorico.current = false;
      ultima.current = agora;
      historico.current = [];
      projetoAnterior.current = project;
      return;
    }
    if (ignorarHistorico.current) {
      ignorarHistorico.current = false;
      ultima.current = agora;
      projetoAnterior.current = project;
      return;
    }
    if (agora === ultima.current) return;
    if (ultima.current && projetoAnterior.current) {
      const antes = billOf(projetoAnterior.current);
      const depois = billOf(project);
      let texto = "alteração";
      if (depois.decks < antes.decks) texto = "tablado removido";
      else if (depois.decks > antes.decks) texto = depois.frente !== antes.frente || depois.fundo !== antes.fundo ? "faixa acrescentada" : "tablado colocado";
      else if (Math.abs(depois.superficie - antes.superficie) > 0.001 && antes.xFrente + antes.xFundo === 0 && depois.xFrente + depois.xFundo > 0) {
        texto = `piso foi para ${fmtM(depois.superficie)} m e entraram os canos em X`;
      } else if (Math.abs(depois.superficie - antes.superficie) > 0.001) texto = `piso foi para ${fmtM(depois.superficie)} m`;
      else if (depois.xFrente + depois.xFundo > antes.xFrente + antes.xFundo && antes.xFrente + antes.xFundo === 0) {
        texto = "entraram os canos em X";
      } else if (
        depois.guardaFrente + depois.guardaFundo + depois.guardaEsq + depois.guardaDir !==
        antes.guardaFrente + antes.guardaFundo + antes.guardaEsq + antes.guardaDir
      ) {
        texto = "guarda-corpo alterado";
      }
      historico.current.push({ snap: ultima.current, texto });
      if (historico.current.length > 30) historico.current.shift();
      if (antes.xFrente + antes.xFundo === 0 && depois.xFrente + depois.xFundo > 0) {
        setAviso(`Entraram ${fmtQty(depois.xFrente + depois.xFundo)} canos em X.`);
      }
      setDesfazerTexto(texto);
    }
    ultima.current = agora;
    projetoAnterior.current = project;
  }, [project, booted]);

  const desfazer = () => {
    const prev = historico.current.pop();
    if (!prev) return;
    const restaurado = JSON.parse(prev.snap) as Partial<Project>;
    ignorarHistorico.current = true;
    setDesfazerTexto(historico.current[historico.current.length - 1]?.texto ?? "");
    setAviso(`Desfeito: ${prev.texto}`);
    setProject((current) => ({
      ...current,
      ...restaurado,
      nome: current.nome,
      obs: current.obs,
      yaw: current.yaw,
      zoom: current.zoom,
      panX: current.panX,
      panY: current.panY,
    }));
  };

  vivo.current.project = project;
  vivo.current.guia = guia;
  vivo.current.selecao = selecao;
  vivo.current.modo = modo;
  vivo.current.desfazer = desfazer;
  vivo.current.limparSelecao = () => setSelecao([]);
  vivo.current.tirar = () => {
    setProject((current) => removerSelecao(current, selecao));
    setSelecao([]);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const alvo = event.target;
      const digitando =
        alvo instanceof HTMLElement &&
        (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.tagName === "SELECT" || alvo.isContentEditable);
      if (event.key === "Escape") {
        if (vivo.current.guia) {
          setGuia(false);
          return;
        }
        if (vivo.current.selecao.length > 0) {
          vivo.current.limparSelecao();
          return;
        }
        setFocoPlanta(false);
        return;
      }
      if (digitando) return;
      const tecla = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && tecla === "z" && !event.shiftKey) {
        event.preventDefault();
        vivo.current.desfazer();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && tecla === "s") {
        event.preventDefault();
        vivo.current.salvarPreset();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const dir = event.key === "ArrowUp" ? 1 : -1;
        const marcas = vivo.current.modo === "altura" ? vivo.current.selecao : [];
        setProject((current) => ajustarAltura(current, dir, event.shiftKey, marcas));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const dir = event.key === "ArrowLeft" ? 0.16 : -0.16;
        setProject((current) => ({ ...current, yaw: wrapYaw(current.yaw + dir) }));
      } else if (event.key === "1" || event.key === "2" || event.key === "3") {
        event.preventDefault();
        const ferramenta: Ferramenta = event.key === "1" ? "1x1" : event.key === "2" ? "2x1" : "1x2";
        const frenteM = ferramenta === "1x1" || ferramenta === "1x2" ? 1 : 2;
        const fundoM = ferramenta === "1x2" ? 2 : 1;
        setRascunho((atual) => {
          const valor = {
            ...atual,
            ferramenta,
            frenteM,
            fundoM,
            nome: nomeAutomatico(atual) ? nomeDaFerramenta(ferramenta) : atual.nome,
          };
          rascunhoRef.current = valor;
          return valor;
        });
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        vivo.current.tirar();
      } else if (tecla === "v") {
        event.preventDefault();
        setFocoPlanta((aberto) => !aberto);
      } else if (tecla === "t") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("piso-vista"));
      } else if (event.key === "?" || event.key === "F1") {
        event.preventDefault();
        setGuia((aberto) => !aberto);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bill = billOf(project);
  const marcas = modo === "altura" ? selecao : [];
  const bump = (dir: number) => setProject((current) => ajustarAltura(current, dir, false, marcas));
  const porAltura = (superficie: number) => {
    setProject((current) => definirSuperficie(current, superficie, marcas));
  };
  const escolherModo = (alvo: "altura" | "remover") => {
    setModo(alvo);
    if (alvo !== "altura") setSelecao([]);
  };
  const exportar3d = async (formato: "obj" | "kmz" | "tds") => {
    setModeloErro("");
    setModeloBusy(formato);
    try {
      const modelo = await import("@/lib/stage/export3d");
      if (formato === "obj") modelo.baixarObj(project);
      else if (formato === "tds") modelo.baixar3ds(project);
      else await modelo.baixarModelo3d(project);
    } catch (error) {
      setModeloErro(error instanceof Error ? error.message : "Não foi possível exportar o 3D.");
    } finally {
      setModeloBusy("");
    }
  };

  const abrir = (id: string) => {
    if (id === ativo) return;
    const flushed = gravarItem(itens, ativo, project);
    const alvo = flushed.find((item) => item.id === id);
    if (!alvo) return;
    limparHistorico.current = true;
    setItens(flushed);
    setAtivo(id);
    setProject(alvo.projeto);
    setSelecao([]);
    setConfirmarExcluir(false);
    setPdfError("");
  };

  const criar = () => {
    const projeto = { ...defaultProject(), nome: `Piso ${itens.length + 1}` };
    const id = crypto.randomUUID();
    limparHistorico.current = true;
    setItens([...gravarItem(itens, ativo, project), { id, nome: projeto.nome, projeto }].slice(-30));
    setAtivo(id);
    setProject(projeto);
    setSelecao([]);
    setConfirmarExcluir(false);
  };

  const duplicar = () => {
    const projeto = { ...project, nome: `${nomeDe(project)} cópia`.slice(0, 80) };
    const id = crypto.randomUUID();
    limparHistorico.current = true;
    setItens([...gravarItem(itens, ativo, project), { id, nome: projeto.nome, projeto }].slice(-30));
    setAtivo(id);
    setProject(projeto);
    setConfirmarExcluir(false);
    setAba("piso");
    setAviso("Evento duplicado. Ajuste a medida no mapa ou monte outro modelo.");
  };

  const excluir = () => {
    if (!confirmarExcluir) {
      setConfirmarExcluir(true);
      return;
    }
    setConfirmarExcluir(false);
    if (itens.length <= 1) {
      const projeto = defaultProject();
      const id = crypto.randomUUID();
      limparHistorico.current = true;
      setItens([{ id, nome: projeto.nome, projeto }]);
      setAtivo(id);
      setProject(projeto);
      return;
    }
    const resto = itens.filter((item) => item.id !== ativo);
    const alvo = resto[0];
    limparHistorico.current = true;
    setItens(resto);
    setAtivo(alvo.id);
    setProject(alvo.projeto);
    setSelecao([]);
  };

  const gerarPdf = async () => {
    setPdfError("");
    setPdfBusy(true);
    try {
      const { downloadReport } = await import("@/lib/stage/pdf");
      await downloadReport(project);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  const salvarPreset = () => {
    const atual = rascunhoRef.current;
    const nome = atual.nome.trim() || nomeDoTamanho(atual.frenteM, atual.fundoM);
    const item: PresetSalvo = { ...atual, nome, id: crypto.randomUUID() };
    setPresets((lista) => {
      const next = [...lista, item].slice(-20);
      localStorage.setItem(PRESET_KEY, JSON.stringify(next));
      return next;
    });
    porRascunho({ ...atual, nome });
  };
  vivo.current.salvarPreset = salvarPreset;

  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(""), 4200);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  useEffect(() => {
    setConfirmarMontar(false);
  }, [rascunho.frenteM, rascunho.fundoM, rascunho.naFrente, rascunho.noFundo, rascunho.superficie, rascunho.ferramenta]);

  const montar = () => {
    if (!inicio && !confirmarMontar) {
      setConfirmarMontar(true);
      return;
    }
    setConfirmarMontar(false);
    const atual = rascunhoRef.current;
    setSelecao([]);
    setProject((current) => {
      const comEspessura = setEspessura(current, atual.espessuraCm);
      const comAltura = setSuperficie(comEspessura, atual.superficie);
      return montarPiso(comAltura, atual.ferramenta, atual.naFrente, atual.noFundo, {
        frente: atual.frenteM,
        fundo: atual.fundoM,
      });
    });
    setInicio(false);
    localStorage.setItem(INICIO_KEY, "1");
  };

  const alternarMarca = (id: string) => {
    setSelecao((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  };

  const pecas = pecasDoModulo(rascunho.ferramenta, rascunho.espessuraCm, rascunho.superficie, rascunho.frenteM, rascunho.fundoM);
  const limiteFrente = Math.max(1, Math.floor(24 / pecas.w));
  const limiteFundo = Math.max(1, Math.floor(24 / pecas.h));

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg px-3 sm:px-4">
        <img
          src={`${import.meta.env.BASE_URL}marca-digital.png`}
          alt="Digital Produções e Eventos"
          className="marca-logo h-9 w-auto max-w-32 shrink-0 object-contain object-left sm:h-10 sm:max-w-40"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl leading-none tracking-wide text-fg sm:text-2xl">PISO TABLADO</p>
          <p className="truncate text-xs text-muted">Digital Produções e Eventos</p>
        </div>
        <button
          type="button"
          className={`${iconBtn} shrink-0`}
          aria-label={tema === "claro" ? "Usar modo escuro" : "Usar modo claro"}
          aria-pressed={tema === "claro"}
          onClick={() => setTema((atual) => (atual === "claro" ? "escuro" : "claro"))}
        >
          {tema === "claro" ? <Moon className="size-5" aria-hidden="true" /> : <Sun className="size-5" aria-hidden="true" />}
        </button>
        <button type="button" className={`${iconBtn} shrink-0`} aria-label="Ver atalhos" onClick={() => setGuia(true)}>
          <Keyboard className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${activeBtn} w-11 shrink-0 px-0 sm:w-auto sm:px-3`}
          onClick={gerarPdf}
          disabled={pdfBusy}
          aria-label="Gerar PDF"
        >
          <FileDown className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{pdfBusy ? "Gerando…" : "Gerar PDF"}</span>
        </button>
      </header>

      <div
        className={focoPlanta ? "stage-shell stage-foco" : "stage-shell"}
        data-painel={painel}
        style={{ ["--stage-side" as string]: `${lado}rem` }}
      >
        <aside className="stage-side bg-surface px-4 py-4">
          <div className="sticky top-14 z-10 -mx-4 mb-3 grid grid-cols-4 gap-1 border-b border-line bg-surface px-2 py-2 lg:top-0">
            {(
              [
                ["piso", "Piso"],
                ["lista", "Lista"],
                ["acabamento", "Acabamento"],
                ["documento", "Doc"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={aba === id}
                className={`${aba === id ? activeBtn : quietBtn} min-w-0 w-full overflow-hidden px-1 text-xs sm:text-sm`}
                onClick={() => setAba(id)}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2 lg:hidden">
            {(
              [
                ["mapa", "Mapa grande"],
                ["meio", "Meio a meio"],
                ["lista", "Lista grande"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={painel === id}
                className={`${painel === id ? activeBtn : quietBtn} min-w-0 w-full overflow-hidden px-1 text-xs`}
                onClick={() => setPainel(id)}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <section className="border-b border-line pb-4">
            <div className={`mb-3 space-y-3 ${aba === "piso" ? "" : "hidden"}`}>
              <div className="min-w-0">
                <h2 className="font-display text-sm tracking-widest text-muted">CRIAR O PISO</h2>
                <p className="text-sm text-fg">Escolha remover tablado ou ajustar a altura. Só um modo fica ligado.</p>
                <p className="mt-1 text-sm text-muted tabular-nums">
                  {bill.decks1 > 0 && bill.decks2 > 0
                    ? `${fmtQty(bill.decks2)} de 2×1 · ${fmtQty(bill.decks1)} de 1×1`
                    : `${fmtQty(bill.decks)} tablados`}
                  {" · "}
                  {fmtQty(bill.legs)} pés ·{" "}
                  {bill.xFrente + bill.xFundo > 0
                    ? `${fmtQty(bill.xFrente + bill.xFundo)} canos em X`
                    : "sem cano em X"}
                </p>
              </div>
              <label className="block">
                <span className="sr-only">Nome do piso</span>
                <input
                  className={field}
                  value={project.nome}
                  maxLength={80}
                  placeholder="Nome do piso"
                  onChange={(event) => setProject((current) => ({ ...current, nome: event.target.value }))}
                />
              </label>
              <div className="rounded-sm border border-line bg-bg p-3">
                <p className="font-display text-lg leading-none tracking-wide">Eventos salvos</p>
                <label className="mt-2 block">
                  <span className="sr-only">Abrir um piso salvo</span>
                  <select className={field} value={ativo} onChange={(event) => abrir(event.target.value)}>
                    {itens.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`${quietBtn} w-full`} onClick={criar}>
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    Novo evento
                  </button>
                  <button type="button" className={`${quietBtn} w-full`} onClick={duplicar}>
                    <Copy className="size-4 shrink-0" aria-hidden="true" />
                    Duplicar evento
                  </button>
                </div>
                <button
                  type="button"
                  className={`${confirmarExcluir ? activeBtn : quietBtn} mt-2 w-full`}
                  onClick={excluir}
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                  {confirmarExcluir ? "Confirmar exclusão" : "Excluir este evento"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`${quietBtn} w-full`} onClick={() => setFocoPlanta(true)}>
                  Ver em 3D
                </button>
                <button type="button" className={`${quietBtn} w-full`} onClick={() => exportar3d("tds")} disabled={modeloBusy !== ""}>
                  <Box className="size-4 shrink-0" aria-hidden="true" />
                  {modeloBusy === "tds" ? "Exportando…" : "Exportar 3DS"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`${quietBtn} w-full`} onClick={() => exportar3d("obj")} disabled={modeloBusy !== ""}>
                  {modeloBusy === "obj" ? "Exportando…" : "Exportar OBJ"}
                </button>
                <button type="button" className={`${quietBtn} w-full`} onClick={() => exportar3d("kmz")} disabled={modeloBusy !== ""}>
                  {modeloBusy === "kmz" ? "Exportando…" : "Exportar KMZ"}
                </button>
              </div>
              <p className="text-sm text-muted">
                No SketchUp use 3DS: Arquivo, Importar, e escolha o arquivo. Em Opções, deixe a unidade em Polegadas. Se
                mudar para metros, o piso fica gigante. OBJ é para o Blender.
              </p>
            </div>

              <div className={`grid gap-3 ${aba === "piso" || aba === "acabamento" ? "" : "hidden"}`}>
              <div className={`rounded-sm border border-line bg-bg p-3 ${aba === "piso" ? "" : "hidden"}`}>
                <p className="font-display text-lg leading-none tracking-wide">Modelo de tablado</p>
                <p className="mt-1 text-sm text-muted">
                  Digite a frente e o fundo de um tablado. Pé, travessa e interna saem nesse tamanho. O cano em X só entra com o
                  piso a partir de 1,00 m. Salve o modelo e monte o piso.
                </p>
                <label className="mt-2 block">
                  <span className="mb-1 block text-xs text-muted">Nome do modelo</span>
                  <input
                    className={field}
                    value={rascunho.nome}
                    maxLength={40}
                    onChange={(event) => porRascunho({ ...rascunhoRef.current, nome: event.target.value })}
                  />
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["1x1", "1×1", 1, 1],
                      ["2x1", "2×1", 2, 1],
                      ["1x2", "1×2", 1, 2],
                    ] as const
                  ).map(([id, rotulo, frenteM, fundoM]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={rascunho.frenteM === frenteM && rascunho.fundoM === fundoM}
                      className={`${rascunho.frenteM === frenteM && rascunho.fundoM === fundoM ? activeBtn : quietBtn} w-full px-2`}
                      onClick={() =>
                        porRascunho((atual) => ({
                          ...atual,
                          ferramenta: id,
                          frenteM,
                          fundoM,
                          nome: nomeAutomatico(atual) ? nomeDaFerramenta(id) : atual.nome,
                        }))
                      }
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumField
                    label="Frente do tablado"
                    suffix="m"
                    value={rascunho.frenteM}
                    live
                    onCommit={(frenteM) => {
                      const layout = tamanhoDoModulo(frenteM, rascunhoRef.current.fundoM);
                      porRascunho((atual) => ({
                        ...atual,
                        frenteM: layout.frente,
                        fundoM: layout.fundo,
                        ferramenta: layout.ferramenta,
                        nome: nomeAutomatico(atual) ? nomeDoTamanho(layout.frente, layout.fundo) : atual.nome,
                      }));
                    }}
                  />
                  <NumField
                    label="Fundo do tablado"
                    suffix="m"
                    value={rascunho.fundoM}
                    live
                    onCommit={(fundoM) => {
                      const layout = tamanhoDoModulo(rascunhoRef.current.frenteM, fundoM);
                      porRascunho((atual) => ({
                        ...atual,
                        frenteM: layout.frente,
                        fundoM: layout.fundo,
                        ferramenta: layout.ferramenta,
                        nome: nomeAutomatico(atual) ? nomeDoTamanho(layout.frente, layout.fundo) : atual.nome,
                      }));
                    }}
                  />
                  <NumField
                    label="Espessura"
                    suffix="cm"
                    value={rascunho.espessuraCm}
                    live
                    onCommit={(espessuraCm) => porRascunho({ ...rascunhoRef.current, espessuraCm })}
                  />
                  <NumField
                    label="Altura do piso"
                    suffix="m"
                    value={rascunho.superficie}
                    live
                    onCommit={(superficie) => porRascunho({ ...rascunhoRef.current, superficie })}
                  />
                </div>
                <p className="mt-2 text-sm text-muted tabular-nums">
                  Pé {fmtM(pecas.pe)} m · travessa frente {fmtM(pecas.travessaFrente)} m · fundo {fmtM(pecas.travessaFundo)} m ·
                  interna {fmtM(pecas.interna)} m ·{" "}
                  {usaCanoX(pecas.superficie)
                    ? `X ${fmtM(pecas.xFrente)} m e ${fmtM(pecas.xFundo)} m`
                    : "sem cano em X abaixo de 1,00 m"}
                </p>
                <div className="mt-2 space-y-2">
                  <Stepper
                    label="Tablados na frente"
                    value={Math.min(limiteFrente, rascunho.naFrente)}
                    min={1}
                    max={limiteFrente}
                    onChange={(naFrente) => porRascunho({ ...rascunhoRef.current, naFrente })}
                  />
                  <Stepper
                    label="Tablados no fundo"
                    value={Math.min(limiteFundo, rascunho.noFundo)}
                    min={1}
                    max={limiteFundo}
                    onChange={(noFundo) => porRascunho({ ...rascunhoRef.current, noFundo })}
                  />
                </div>
                <p className="mt-2 text-sm text-muted tabular-nums">
                  Piso de {fmtM(Math.min(limiteFrente, rascunho.naFrente) * rascunho.frenteM)} m ×{" "}
                  {fmtM(Math.min(limiteFundo, rascunho.noFundo) * rascunho.fundoM)} m
                </p>
                <button type="button" className={`${activeBtn} mt-2 w-full`} onClick={montar}>
                  {confirmarMontar ? "Isso substitui o piso. Confirmar" : "Montar este piso"}
                </button>
                {presets.length > 0 && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs text-muted">Modelos salvos</span>
                    <select
                      className={field}
                      defaultValue=""
                      onChange={(event) => {
                        const item = presets.find((preset) => preset.id === event.target.value);
                        if (!item) return;
                        porRascunho({
                          nome: item.nome,
                          ferramenta: item.ferramenta,
                          frenteM: item.frenteM,
                          fundoM: item.fundoM,
                          espessuraCm: item.espessuraCm,
                          superficie: item.superficie,
                          naFrente: item.naFrente,
                          noFundo: item.noFundo,
                        });
                      }}
                    >
                      <option value="">Escolher um modelo</option>
                      {presets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.nome} · {fmtM(preset.frenteM)} × {fmtM(preset.fundoM)} m
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button type="button" className={`${quietBtn} mt-2 w-full`} onClick={salvarPreset}>
                  Salvar modelo
                </button>
              </div>

              <div className={`rounded-sm border border-line bg-bg p-3 ${aba === "piso" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg leading-none tracking-wide">Atalhos</p>
                  <Keyboard className="size-4 text-muted" aria-hidden="true" />
                </div>
                {dica && (
                  <p className="mt-2 text-sm text-fg">
                    Aprende estas teclas uma vez. No dia a dia você monta o piso sem procurar botão.
                  </p>
                )}
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <li>
                    <span className="text-accent">Altura</span> marca
                  </li>
                  <li>
                    <span className="text-accent">Remover</span> tira
                  </li>
                  <li>
                    <span className="text-accent">←→</span> girar
                  </li>
                  <li>
                    <span className="text-accent">Del</span> tirar
                  </li>
                  <li>
                    <span className="text-accent">Ctrl Z</span> desfazer
                  </li>
                  <li>
                    <span className="text-accent">?</span> lista
                  </li>
                </ul>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`${quietBtn} w-full`} onClick={() => setGuia(true)}>
                    Ver todos
                  </button>
                  {dica ? (
                    <button
                      type="button"
                      className={`${activeBtn} w-full`}
                      onClick={() => {
                        localStorage.setItem(COACH_KEY, "1");
                        setDica(false);
                      }}
                    >
                      Entendi
                    </button>
                  ) : (
                    <button type="button" className={`${quietBtn} w-full`} onClick={desfazer}>
                      <Undo2 className="size-4 shrink-0" aria-hidden="true" />
                      Desfazer
                    </button>
                  )}
                </div>
              </div>

              <div className={`rounded-sm border border-line bg-bg p-3 ${aba === "acabamento" ? "" : "hidden"}`}>
                <p className="font-display text-lg leading-none tracking-wide">Travessa externa</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <NumField
                    label="Frente"
                    suffix="m"
                    value={project.travessaFrente}
                    disabled={project.syncTravessa}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        syncTravessa: false,
                        travessaFrente: Math.min(6, Math.max(0.3, Math.round(value * 1000) / 1000)),
                      }))
                    }
                  />
                  <NumField
                    label="Fundo"
                    suffix="m"
                    value={project.travessaFundo}
                    disabled={project.syncTravessa}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        syncTravessa: false,
                        travessaFundo: Math.min(6, Math.max(0.3, Math.round(value * 1000) / 1000)),
                      }))
                    }
                  />
                  <NumField
                    label="Perfil"
                    suffix="cm"
                    value={project.perfilCm}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        perfilCm: Math.min(30, Math.max(3, Math.round(value * 10) / 10)),
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  aria-pressed={project.syncTravessa}
                  className={`${project.syncTravessa ? activeBtn : quietBtn} mt-2 w-full`}
                  onClick={() => setProject((current) => setSync(current, !current.syncTravessa))}
                >
                  {project.syncTravessa ? "Igual ao vão" : "Comprimento livre"}
                </button>
              </div>

              <div className={`rounded-sm border border-line bg-bg p-3 ${aba === "acabamento" ? "" : "hidden"}`}>
                <p className="font-display text-lg leading-none tracking-wide">Travessa interna</p>
                <p className="mt-1 text-sm text-muted">2 por tablado, por baixo da placa. Não é compartilhada.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={project.internaSentido === "fundo"}
                    className={`${project.internaSentido === "fundo" ? activeBtn : quietBtn} w-full`}
                    onClick={() => setProject((current) => setInternaSentido(current, "fundo"))}
                  >
                    No fundo
                  </button>
                  <button
                    type="button"
                    aria-pressed={project.internaSentido === "frente"}
                    className={`${project.internaSentido === "frente" ? activeBtn : quietBtn} w-full`}
                    onClick={() => setProject((current) => setInternaSentido(current, "frente"))}
                  >
                    Na frente
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 items-end gap-2">
                  <NumField
                    label="Comprimento"
                    suffix="m"
                    value={project.travessaInterna}
                    disabled={project.syncInterna}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        syncInterna: false,
                        travessaInterna: Math.min(6, Math.max(0.3, Math.round(value * 1000) / 1000)),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={`${project.syncInterna ? activeBtn : quietBtn} w-full`}
                    onClick={() => setProject((current) => setSyncInterna(current, !current.syncInterna))}
                  >
                    {project.syncInterna ? "Igual ao vão" : "Usar o vão"}
                  </button>
                </div>
              </div>

              <div className={`rounded-sm border border-line bg-bg p-3 ${aba === "piso" ? "" : "hidden"}`}>
                <p className="font-display text-lg leading-none tracking-wide">Pé e cano em X</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumField
                    label="Altura da frente"
                    suffix="m"
                    value={bill.superficie}
                    onCommit={(value) => setProject((current) => setSuperficie(current, value))}
                  />
                  <NumField
                    label="Altura do pé"
                    suffix="m"
                    value={bill.pe}
                    onCommit={(value) => setProject((current) => setPe(current, value))}
                  />
                </div>
                <details className="mt-2 rounded-sm border border-line p-2">
                  <summary className="cursor-pointer text-sm text-muted">Seção do pé e diâmetro do cano</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                  <NumField
                    label="Seção do pé"
                    suffix="cm"
                    value={project.secaoCm}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        secaoCm: Math.min(20, Math.max(2, Math.round(value * 10) / 10)),
                      }))
                    }
                  />
                  <NumField
                    label="Ø do cano"
                    suffix="cm"
                    value={project.canoCm}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        canoCm: Math.min(8, Math.max(1, Math.round(value * 10) / 10)),
                      }))
                    }
                  />
                  </div>
                </details>
                <p className="mt-2 text-sm text-muted">
                  {bill.xFrente + bill.xFundo === 0
                    ? "Abaixo de 1,00 m este piso não leva cano em X. A partir de 1,00 m entra um X por vão externo, compartilhado no mesmo nível."
                    : `Cano em X a partir de 1,00 m: um X por vão externo, compartilhado no mesmo nível. O comprimento mais comum: frente ${fmtM(bill.xFrenteLen)} m · fundo ${fmtM(bill.xFundoLen)} m.`}
                </p>
                <div className="mt-2 flex gap-2">
                  {[1, 5, 10].map((step) => (
                    <button
                      key={step}
                      type="button"
                      aria-pressed={project.stepCm === step}
                      className={project.stepCm === step ? activeBtn : quietBtn}
                      onClick={() => setProject((current) => ({ ...current, stepCm: step }))}
                    >
                      {step} cm
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-sm border border-line bg-bg p-3 ${aba === "acabamento" ? "" : "hidden"}`}>
                <p className="font-display text-lg leading-none tracking-wide">Guarda-corpo</p>
                <p className="mt-2 text-sm text-muted">Um por tablado, na medida da borda. Só entra onde o lado está livre.</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["guardaFrente", "Frente"],
                      ["guardaFundo", "Fundo"],
                      ["guardaEsq", "Esquerda"],
                      ["guardaDir", "Direita"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={project[key]}
                      className={`${project[key] ? activeBtn : quietBtn} w-full`}
                      onClick={() => setProject((current) => ({ ...current, [key]: !current[key] }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <NumField
                    label="Altura"
                    suffix="m"
                    value={project.guardaAltura}
                    onCommit={(value) =>
                      setProject((current) => ({
                        ...current,
                        guardaAltura: Math.min(1.6, Math.max(0.5, Math.round(value * 1000) / 1000)),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={`pt-4 ${aba === "lista" ? "" : "hidden"}`}>
            <h2 className="font-display text-sm tracking-widest text-muted">LISTA</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Frente" value={`${fmtM(bill.frente)} m`} />
              <Stat label="Fundo" value={`${fmtM(bill.fundo)} m`} />
              <Stat label="Área" value={`${fmtM(bill.area)} m²`} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Stat label="Pessoas" value={fmtQty(bill.pessoas)} />
              <Stat label="Comprar" value={`${fmtM(bill.carpete.linear)} m`} />
            </div>
            <p className="mt-2 text-sm text-muted">Em pé, 4 pessoas por m². É só a conta de quantas cabem.</p>
            <div className="mt-3 rounded-sm border border-line bg-bg p-3">
              <p className="font-display text-lg leading-none tracking-wide">Carpete</p>
              <div className="mt-2">
                <NumField
                  label="Largura do rolo"
                  suffix="m"
                  value={project.carpeteLargura ?? 2}
                  onCommit={(value) =>
                    setProject((current) => ({
                      ...current,
                      carpeteLargura: Math.min(5, Math.max(0.5, Math.round(value * 1000) / 1000)),
                    }))
                  }
                />
              </div>
              <Faixas carpete={bill.carpete} frente={bill.frente} fundo={bill.fundo} />
              {bill.carpete.recorte ? (
                <p className="mt-2 text-sm text-fg">
                  Piso com recorte, {fmtM(bill.carpete.m2)} m². Compre {fmtM(bill.carpete.linear)} m de comprimento de rolo com{" "}
                  {fmtM(bill.carpete.largura)} m de largura.
                </p>
              ) : (
                <p className="mt-2 text-sm text-fg">
                  {bill.carpete.faixas} faixa{bill.carpete.faixas === 1 ? "" : "s"} de {fmtM(bill.carpete.comprimento)} m ao longo da{" "}
                  {bill.carpete.sentido}. Largura do rolo {fmtM(bill.carpete.largura)} m. Comprar {fmtM(bill.carpete.linear)} m de
                  comprimento.
                  {bill.carpete.sobra > 0.01
                    ? ` A última faixa cobre ${fmtM(bill.carpete.ultima)} m e sobram ${fmtM(bill.carpete.sobra)} m de largura.`
                    : " A largura fecha sem sobra."}
                </p>
              )}
            </div>
            <table className="mt-4 w-full table-fixed text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="w-1/2 py-2 font-medium">Peça</th>
                  <th className="w-1/3 py-2 font-medium">Medida</th>
                  <th className="w-1/6 py-2 text-right font-medium">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {bill.linhas
                  .filter((linha) => linha.qty > 0)
                  .map((linha, index) => (
                    <ListRow
                      key={`${linha.cor}-${linha.nome}-${linha.medida}-${index}`}
                      color={corDo(project, linha.cor)}
                      name={linha.nome}
                      measure={linha.medida}
                      qty={linha.qty}
                      onColor={(valor) => setProject((current) => comCor(current, linha.cor, valor))}
                    />
                  ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-muted">
              Toque na cor para mudar. Embaixo da planta, toque no nome da peça para ocultar. Superfície de referência a{" "}
              {fmtM(bill.superficie)} m.
              {bill.rectangular ? "" : " Planta com recorte."}
            </p>
          </section>

          {bill.warnings.length > 0 && (
            <ul className="mt-4 space-y-2">
              {bill.warnings.map((warning) => (
                <li key={warning} className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-fg">
                  {warning}
                </li>
              ))}
            </ul>
          )}

          {pdfError && (
            <p role="alert" className="mt-4 text-sm text-accent">
              {pdfError}
            </p>
          )}
          {modeloErro && (
            <p role="alert" className="mt-4 text-sm text-accent">
              {modeloErro}
            </p>
          )}

          <div className={aba === "documento" ? "" : "hidden"}>
          <Section title="Documento">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`${quietBtn} w-full`} onClick={() => setFocoPlanta(true)}>
                Mapa cheio
              </button>
              <button type="button" className={`${quietBtn} w-full`} onClick={() => exportar3d("tds")} disabled={modeloBusy !== ""}>
                <Box className="size-4 shrink-0" aria-hidden="true" />
                {modeloBusy === "tds" ? "Exportando…" : "Exportar 3DS"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`${quietBtn} w-full`} onClick={() => exportar3d("obj")} disabled={modeloBusy !== ""}>
                {modeloBusy === "obj" ? "Exportando…" : "Exportar OBJ"}
              </button>
              <button type="button" className={`${quietBtn} w-full`} onClick={() => exportar3d("kmz")} disabled={modeloBusy !== ""}>
                {modeloBusy === "kmz" ? "Exportando…" : "Exportar KMZ"}
              </button>
            </div>
            <p className="text-sm text-muted">
              No SketchUp use 3DS: Arquivo, Importar, e escolha o arquivo. Em Opções, deixe a unidade em Polegadas. Se
              mudar para metros, o piso fica gigante. OBJ é para o Blender.
            </p>
            <textarea
              className="min-h-24 w-full rounded-sm border border-line bg-bg px-3 py-2 text-base text-fg outline-none focus:border-accent"
              maxLength={500}
              value={project.obs}
              placeholder="Obra, evento, quem separa o material…"
              onChange={(event) => setProject((current) => ({ ...current, obs: event.target.value }))}
            />
            <button type="button" className={`${activeBtn} w-full`} onClick={gerarPdf} disabled={pdfBusy}>
              <FileDown className="size-4 shrink-0" aria-hidden="true" />
              {pdfBusy ? "Gerando…" : "Gerar PDF da lista"}
            </button>
          </Section>
          </div>
        </aside>
        <div
          className="stage-split"
          role="separator"
          aria-orientation="vertical"
          aria-label="Arrastar a divisória"
          onPointerDown={(event) => {
            const inicioX = event.clientX;
            const inicioLado = lado;
            const mover = (move: PointerEvent) => {
              const rem = inicioLado + (move.clientX - inicioX) / 16;
              const proximo = Math.min(42, Math.max(18, Math.round(rem * 10) / 10));
              setLado(proximo);
              localStorage.setItem(LADO_KEY, String(proximo));
            };
            const soltar = () => {
              window.removeEventListener("pointermove", mover);
              window.removeEventListener("pointerup", soltar);
            };
            window.addEventListener("pointermove", mover);
            window.addEventListener("pointerup", soltar);
          }}
        />
        <StageView
          project={project}
          setProject={setProject}
          onBump={bump}
          onUndo={desfazer}
          focoPlanta={focoPlanta}
          onFoco={setFocoPlanta}
          selecao={selecao}
          modo={modo}
          onModo={escolherModo}
          onToggle={alternarMarca}
          onRemover={(id) => {
            setProject((current) => removerSelecao(current, [id]));
            setSelecao([]);
          }}
          onTirar={() => {
            setProject((current) => removerSelecao(current, selecao));
            setSelecao([]);
          }}
          onSelecionar={(ids) => {
            setModo("altura");
            setSelecao(ids);
          }}
          onAltura={porAltura}
          onLimpar={() => setSelecao([])}
          tema={tema}
          aviso={aviso}
          desfazerTexto={desfazerTexto}
        />
      </div>

      {guia && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-bg/80 p-3 sm:items-center"
          role="presentation"
          onClick={() => setGuia(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="atalhos-titulo"
            className="max-h-[80dvh] w-full max-w-md overflow-auto border border-line bg-surface p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="atalhos-titulo" className="font-display text-2xl tracking-wide">
              Atalhos do dia a dia
            </h2>
            <p className="mt-1 text-sm text-muted">Funcionam fora dos campos de texto. Shift nas setas muda a altura de 1 em 1 cm.</p>
            <dl className="mt-3">
              {ATALHOS.map(([tecla, texto]) => (
                <div key={tecla} className="flex items-baseline gap-3 border-t border-line py-2">
                  <dt className="w-20 shrink-0 font-display text-lg text-accent">{tecla}</dt>
                  <dd className="text-sm text-fg">{texto}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className={`${activeBtn} mt-3 w-full`}
              onClick={() => {
                localStorage.setItem(COACH_KEY, "1");
                setDica(false);
                setGuia(false);
              }}
            >
              Vou usar assim
            </button>
          </div>
        </div>
      )}
      {inicio && booted && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-bg/80 p-3 sm:items-center">
          <div className="max-h-[86dvh] w-full max-w-md overflow-auto border border-line bg-surface p-4">
            <h2 className="font-display text-2xl tracking-wide">Montar o primeiro piso</h2>
            <p className="mt-1 text-sm text-muted">Três medidas e o mapa nasce. Dá para mudar tudo depois.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <NumField
                label="Frente do tablado"
                suffix="m"
                value={rascunho.frenteM}
                live
                onCommit={(frenteM) => {
                  const layout = tamanhoDoModulo(frenteM, rascunhoRef.current.fundoM);
                  porRascunho((atual) => ({
                    ...atual,
                    ferramenta: layout.ferramenta,
                    frenteM: layout.frente,
                    fundoM: layout.fundo,
                    nome: nomeAutomatico(atual) ? nomeDoTamanho(layout.frente, layout.fundo) : atual.nome,
                  }));
                }}
              />
              <NumField
                label="Fundo do tablado"
                suffix="m"
                value={rascunho.fundoM}
                live
                onCommit={(fundoM) => {
                  const layout = tamanhoDoModulo(rascunhoRef.current.frenteM, fundoM);
                  porRascunho((atual) => ({
                    ...atual,
                    ferramenta: layout.ferramenta,
                    frenteM: layout.frente,
                    fundoM: layout.fundo,
                    nome: nomeAutomatico(atual) ? nomeDoTamanho(layout.frente, layout.fundo) : atual.nome,
                  }));
                }}
              />
            </div>
            <div className="mt-3 space-y-2">
              <Stepper
                label="Tablados na frente"
                value={Math.min(limiteFrente, rascunho.naFrente)}
                min={1}
                max={limiteFrente}
                onChange={(naFrente) => porRascunho({ ...rascunhoRef.current, naFrente })}
              />
              <Stepper
                label="Tablados no fundo"
                value={Math.min(limiteFundo, rascunho.noFundo)}
                min={1}
                max={limiteFundo}
                onChange={(noFundo) => porRascunho({ ...rascunhoRef.current, noFundo })}
              />
            </div>
            <p className="mt-3 text-xs tracking-widest text-muted">ALTURA DO PISO</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ALTURAS.map((altura) => (
                <button
                  key={altura}
                  type="button"
                  aria-pressed={Math.abs(rascunho.superficie - altura) < 0.001}
                  className={Math.abs(rascunho.superficie - altura) < 0.001 ? activeBtn : quietBtn}
                  onClick={() => porRascunho({ ...rascunhoRef.current, superficie: altura })}
                >
                  {fmtM(altura)}
                  {altura >= 1 ? " · X" : ""}
                </button>
              ))}
            </div>
            <button type="button" className={`${activeBtn} mt-3 w-full`} onClick={montar}>
              Montar o piso
            </button>
            <button
              type="button"
              className={`${quietBtn} mt-2 w-full`}
              onClick={() => {
                localStorage.setItem(INICIO_KEY, "1");
                setInicio(false);
              }}
            >
              Já tenho um piso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StageView({
  project,
  setProject,
  onBump,
  onUndo,
  focoPlanta,
  onFoco,
  selecao,
  modo,
  onModo,
  onToggle,
  onRemover,
  onTirar,
  onSelecionar,
  onAltura,
  onLimpar,
  tema,
  aviso,
  desfazerTexto,
}: {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  onBump: (dir: number) => void;
  onUndo: () => void;
  focoPlanta: boolean;
  onFoco: (value: boolean) => void;
  selecao: string[];
  modo: "altura" | "remover";
  onModo: (modo: "altura" | "remover") => void;
  onToggle: (id: string) => void;
  onRemover: (id: string) => void;
  onTirar: () => void;
  onSelecionar: (ids: string[]) => void;
  onAltura: (superficie: number) => void;
  onLimpar: () => void;
  tema: "escuro" | "claro";
  aviso: string;
  desfazerTexto: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ultimo = useRef<Modulo | null>(null);
  const anchor = useRef<{ c: number; r: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef(false);
  const [vista, setVista] = useState<Vista>("iso");
  const [verCarpete, setVerCarpete] = useState(false);
  const [marcar, setMarcar] = useState(false);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    yaw: number;
    panX: number;
    panY: number;
    zoom: number;
    mode: "yaw" | "pan" | "marquee";
    moved: boolean;
    shift: boolean;
    dist: number;
    angle: number;
  } | null>(null);
  const ponteiro = useRef<{ x: number; y: number } | null>(null);

  const paint = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width < 2 || height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStage(ctx, width, height, project, project, tema === "claro" ? stageThemeClaro : stageTheme, project.showDeck, {
      padBottom: 28,
      selecao: modo === "altura" ? selecao : [],
      buraco: modo === "remover",
      memoria: modo === "remover" ? ultimo.current : null,
      vista,
      carpete: verCarpete,
      ponteiro: ponteiro.current,
    });
  };

  useEffect(() => {
    paint();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [project, selecao, modo, vista, verCarpete, tema]);

  useEffect(() => {
    const alternar = () => setVista((atual) => (atual === "iso" ? "topo" : "iso"));
    window.addEventListener("piso-vista", alternar);
    return () => window.removeEventListener("piso-vista", alternar);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      setProject((current) => ({
        ...current,
        zoom: Math.min(2.8, Math.max(0.45, current.zoom * factor)),
      }));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setProject]);

  const bill = billOf(project);
  const marcados = modulosOf(project).filter((modulo) => selecao.includes(chaveModulo(modulo)));
  const alturasBase =
    marcados.length > 0
      ? marcados.map((modulo) => superficieModulo(project, modulo))
      : modulosOf(project).map((modulo) => superficieModulo(project, modulo));
  const alturaMin = alturasBase.length > 0 ? Math.min(...alturasBase) : bill.superficie;
  const alturaMax = alturasBase.length > 0 ? Math.max(...alturasBase) : bill.superficie;
  const alturaTexto = alturaMin === alturaMax ? fmtM(alturaMin) : `${fmtM(alturaMin)}–${fmtM(alturaMax)}`;
  const rotuloAltura = marcados.length > 0 ? "Marcados" : alturaMin === alturaMax ? "" : "Desnível";

  return (
    <section id="planta" className="stage-view" aria-label="Planta isométrica do piso">
      <div className="stage-bars">
      <div className="stage-bar-nav flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={iconBtn}
            aria-label="Girar planta para a esquerda"
            onClick={() => setProject((current) => ({ ...current, yaw: wrapYaw(current.yaw + 0.2) }))}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label="Girar planta para a direita"
            onClick={() => setProject((current) => ({ ...current, yaw: wrapYaw(current.yaw - 0.2) }))}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className={iconBtn} aria-label={desfazerTexto ? `Desfazer: ${desfazerTexto}` : "Desfazer"} onClick={onUndo}>
            <Undo2 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label="Enquadrar"
            onClick={() =>
              setProject((current) => ({
                ...current,
                yaw: vista === "topo" ? 0 : -0.55,
                zoom: 1,
                panX: 0,
                panY: 0,
              }))
            }
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <button
            type="button"
            className={`${iconBtn} shrink-0`}
            aria-label={marcados.length > 0 ? "Baixar os tablados marcados" : "Baixar o piso"}
            onClick={() => onBump(-1)}
          >
            <ChevronDown className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 text-center">
            {rotuloAltura && <p className="text-xs tracking-widest text-muted uppercase">{rotuloAltura}</p>}
            <p className="truncate font-display text-2xl leading-none text-accent tabular-nums" aria-live="polite">
              {alturaTexto}
              <span className="ml-1 text-base text-muted">m</span>
            </p>
          </div>
          <button
            type="button"
            className={`${iconBtn} shrink-0`}
            aria-label={marcados.length > 0 ? "Subir os tablados marcados" : "Subir o piso"}
            onClick={() => onBump(1)}
          >
            <ChevronUp className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="hidden shrink-0 text-xs text-muted xl:block">
          {marcados.length > 0
            ? `${fmtQty(marcados.length)} marcado${marcados.length > 1 ? "s" : ""}`
            : `Pé ${fmtM(bill.pe)} m`}
        </p>
      </div>
      <div className="stage-bar-modes grid shrink-0 grid-cols-2 gap-1.5 border-b border-line px-2 py-1.5">
        <button
          type="button"
          aria-pressed={modo === "remover"}
          className={`${modo === "remover" ? activeBtn : quietBtn} min-w-0 w-full overflow-hidden px-1 text-xs sm:px-3 sm:text-sm`}
          onClick={() => onModo("remover")}
        >
          Remover tablado
        </button>
        <button
          type="button"
          aria-pressed={modo === "altura"}
          className={`${modo === "altura" ? activeBtn : quietBtn} min-w-0 w-full overflow-hidden px-1 text-xs sm:px-3 sm:text-sm`}
          onClick={() => onModo("altura")}
        >
          Ajustar altura
        </button>
      </div>
      <div className="stage-bar-stats grid shrink-0 grid-cols-6 gap-0.5 overflow-x-clip border-b border-line px-2 py-1.5">
        {(
          [
            ["Tablado", bill.decks],
            ["Pé", bill.legs],
            ["Frente", bill.beamsX],
            ["Fundo", bill.beamsY],
            ["Interna", bill.internas],
            ["Cano X", bill.xFrente + bill.xFundo],
          ] as const
        ).map(([nome, qtd]) => (
          <div key={nome} className="min-w-0 text-center">
            <p className="font-display text-lg leading-none text-fg tabular-nums">{fmtQty(qtd)}</p>
            <p className="truncate text-[10px] tracking-wide text-muted uppercase">{nome}</p>
          </div>
        ))}
      </div>
      <div className="stage-bar-heights grid shrink-0 grid-cols-6 gap-1 overflow-x-clip border-b border-line px-2 py-1.5">
        {ALTURAS.map((altura) => {
          const ligado = marcados.length > 0 ? alturaMin === alturaMax && Math.abs(alturaMin - altura) < 0.001 : Math.abs(bill.superficie - altura) < 0.001;
          return (
            <button
              key={altura}
              type="button"
              aria-pressed={ligado}
              aria-label={altura >= 1 ? `${fmtM(altura)} metros, com cano em X` : `${fmtM(altura)} metros`}
              className={`${ligado ? activeBtn : quietBtn} stage-altura w-full`}
              onClick={() => onAltura(altura)}
            >
              <span className="tabular-nums">{fmtM(altura)}</span>
              {altura >= 1 ? <span className="ml-0.5 text-[10px] leading-none">X</span> : null}
            </button>
          );
        })}
      </div>
      <div className="stage-bar-views flex shrink-0 gap-1 border-b border-line px-2 py-1.5">
        <button type="button" aria-pressed={vista === "iso"} className={`${vista === "iso" ? activeBtn : quietBtn} min-w-0 flex-1 overflow-hidden px-1 text-xs sm:px-3 sm:text-sm`} onClick={() => setVista("iso")}>
          3D
        </button>
        <button
          type="button"
          aria-pressed={vista === "topo"}
          className={`${vista === "topo" ? activeBtn : quietBtn} min-w-0 flex-1 overflow-hidden px-1 text-xs sm:px-3 sm:text-sm`}
          onClick={() => {
            setVista("topo");
            setProject((current) => ({ ...current, yaw: 0, panX: 0, panY: 0 }));
          }}
        >
          De cima
        </button>
        <button type="button" aria-pressed={marcar} className={`${marcar ? activeBtn : quietBtn} min-w-0 flex-1 overflow-hidden px-1 text-xs sm:px-3 sm:text-sm`} onClick={() => setMarcar((atual) => !atual)}>
          Área
        </button>
        <button
          type="button"
          aria-pressed={verCarpete}
          className={`${verCarpete ? activeBtn : quietBtn} min-w-0 flex-1 overflow-hidden px-1 text-xs sm:px-3 sm:text-sm`}
          onClick={() => setVerCarpete((atual) => !atual)}
        >
          Carpete
        </button>
      </div>
      </div>
      {marcados.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-1.5">
          <p className="min-w-0 flex-1 truncate text-sm text-fg">
            {fmtQty(marcados.length)} tablado{marcados.length > 1 ? "s" : ""} marcado{marcados.length > 1 ? "s" : ""}. Esc desmarca.
          </p>
          <button type="button" className={`${quietBtn} shrink-0 px-3 text-xs`} onClick={onLimpar}>
            Desmarcar
          </button>
        </div>
      )}
      <div ref={wrapRef} className="stage-canvas">
        {aviso && (
          <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-sm bg-accent px-3 py-2 text-center text-sm font-semibold text-accent-ink">
            {aviso}
          </p>
        )}
        {marquee && (
          <div
            className="pointer-events-none absolute z-10 border border-accent bg-accent/20"
            style={{
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-pointer touch-none"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            event.currentTarget.setPointerCapture(event.pointerId);
            if (pointers.current.size >= 2) {
              const pts = [...pointers.current.values()];
              const dx = pts[1].x - pts[0].x;
              const dy = pts[1].y - pts[0].y;
              gesto.current = true;
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                yaw: project.yaw,
                panX: project.panX,
                panY: project.panY,
                zoom: project.zoom,
                mode: "yaw",
                moved: true,
                shift: false,
                dist: Math.hypot(dx, dy) || 1,
                angle: Math.atan2(dy, dx),
              };
              setMarquee(null);
              return;
            }
            const toque = event.pointerType === "touch";
            const area = marcar || event.shiftKey;
            const mode = area ? "marquee" : toque || event.button === 1 || event.button === 2 ? "pan" : "yaw";
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              yaw: project.yaw,
              panX: project.panX,
              panY: project.panY,
              zoom: project.zoom,
              mode,
              moved: false,
              shift: event.shiftKey,
              dist: 0,
              angle: 0,
            };
            if (mode === "marquee") {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;
              setMarquee({ x0: x, y0: y, x1: x, y1: y });
            }
          }}
          onPointerMove={(event) => {
            const rectMove = event.currentTarget.getBoundingClientRect();
            const local = { x: event.clientX - rectMove.left, y: event.clientY - rectMove.top };
            if (!drag.current || !drag.current.moved) {
              ponteiro.current = local;
              paint();
            } else if (ponteiro.current) {
              ponteiro.current = null;
              paint();
            }
            if (pointers.current.has(event.pointerId)) {
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            }
            const start = drag.current;
            if (!start) return;
            if (pointers.current.size >= 2 && gesto.current) {
              const pts = [...pointers.current.values()];
              if (pts.length < 2) return;
              const dx = pts[1].x - pts[0].x;
              const dy = pts[1].y - pts[0].y;
              const dist = Math.hypot(dx, dy) || 1;
              const angle = Math.atan2(dy, dx);
              setProject((current) => ({
                ...current,
                yaw: wrapYaw(start.yaw + (angle - start.angle)),
                zoom: Math.min(2.8, Math.max(0.45, start.zoom * (dist / start.dist))),
              }));
              return;
            }
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (!start.moved && Math.hypot(dx, dy) < (event.pointerType === "touch" ? 10 : 6)) return;
            start.moved = true;
            if (start.mode === "marquee") {
              const rect = event.currentTarget.getBoundingClientRect();
              setMarquee((atual) => (atual ? { ...atual, x1: event.clientX - rect.left, y1: event.clientY - rect.top } : atual));
              return;
            }
            if (start.mode === "yaw") {
              setProject((current) => ({
                ...current,
                yaw: wrapYaw(start.yaw - dx * 0.008),
              }));
            } else {
              setProject((current) => ({
                ...current,
                panX: start.panX + dx,
                panY: start.panY + dy,
              }));
            }
          }}
          onPointerLeave={() => {
            ponteiro.current = null;
            paint();
          }}
          onPointerUp={(event) => {
            pointers.current.delete(event.pointerId);
            const start = drag.current;
            if (pointers.current.size > 0) return;
            drag.current = null;
            const foiGesto = gesto.current;
            gesto.current = false;
            if (!start || foiGesto) {
              setMarquee(null);
              return;
            }
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            if (start.moved) {
              if (start.mode === "marquee") {
                const ids = chavesNoRetangulo(
                  project,
                  project,
                  rect.width,
                  rect.height,
                  28,
                  project.showDeck,
                  vista,
                  start.x - rect.left,
                  start.y - rect.top,
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                );
                if (ids.length > 0) onSelecionar(ids);
                setMarcar(false);
              }
              setMarquee(null);
              return;
            }
            setMarquee(null);
            const hit = pickStage(
              project,
              project,
              rect.width,
              rect.height,
              event.clientX - rect.left,
              event.clientY - rect.top,
              28,
              project.showDeck,
              modo === "remover"
                ? { superficie: metrics(project).superficie, memoria: ultimo.current }
                : null,
              vista,
            );
            if (hit?.kind === "add-col") setProject((current) => crescerFrente(current));
            else if (hit?.kind === "add-row") setProject((current) => crescerFundo(current));
            else if (hit?.kind === "cell") {
              const modulo = moduloNa(project, hit.c, hit.r);
              if (modo === "remover") {
                if (modulo) {
                  if (modulosOf(project).length <= 1) return;
                  ultimo.current = { ...modulo };
                  onRemover(chaveModulo(modulo));
                } else {
                  const memoria = ultimo.current;
                  let colocou = false;
                  setProject((current) => {
                    const next = reporTablado(current, hit.c, hit.r, memoria);
                    colocou = next !== current;
                    return next;
                  });
                  if (colocou) ultimo.current = null;
                }
              } else if (modulo) {
                if (start.shift && anchor.current) {
                  const a = anchor.current;
                  const x0 = Math.min(a.c, hit.c);
                  const x1 = Math.max(a.c, hit.c);
                  const y0 = Math.min(a.r, hit.r);
                  const y1 = Math.max(a.r, hit.r);
                  const ids = modulosOf(project)
                    .filter((item) => item.x <= x1 && item.x + item.w - 1 >= x0 && item.y <= y1 && item.y + item.h - 1 >= y0)
                    .map((item) => chaveModulo(item));
                  onSelecionar(ids);
                } else {
                  anchor.current = { c: hit.c, r: hit.r };
                  onToggle(chaveModulo(modulo));
                }
              }
            }
          }}
          onPointerCancel={(event) => {
            pointers.current.delete(event.pointerId);
            if (pointers.current.size === 0) {
              drag.current = null;
              gesto.current = false;
              setMarquee(null);
            }
          }}
        />
      </div>
      <div className="stage-chips shrink-0 border-t border-line px-3 py-2">
        {(
          [
            ["showDeck", "Tablado", project.colorDeck],
            ["showLeg", "Pé", project.colorLeg],
            ["showBeamX", "Frente", project.colorBeamX],
            ["showBeamY", "Fundo", project.colorBeamY],
            ["showInterna", "Interna", project.colorInterna],
            ["showX", "Cano X", project.colorX],
            ["showGuarda", "Guarda", project.colorGuarda],
          ] as const
        ).map(([key, label, color]) => {
          const on = project[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              aria-label={on ? `Ocultar ${label}` : `Mostrar ${label}`}
              className={on ? chipOn : chipOff}
              onClick={() => setProject((current) => ({ ...current, [key]: !current[key] }))}
            >
              <span className="size-2.5 shrink-0 rounded-sm border border-line" style={{ backgroundColor: color }} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
        {modo === "altura" && selecao.length > 0 && (
          <button type="button" className={`${quietBtn} w-full min-w-0 px-2`} onClick={onTirar}>
            Tirar
          </button>
        )}
        {focoPlanta && (
          <button type="button" className={`${activeBtn} w-full min-w-0 px-2`} onClick={() => onFoco(false)}>
            Medidas
          </button>
        )}
      </div>
      <p className="shrink-0 px-3 py-1.5 text-xs leading-snug text-muted lg:hidden">
        {modo === "remover"
          ? "Toque tira. Toque de novo no buraco põe o mesmo tablado."
          : marcar
            ? "Arraste o dedo para marcar vários tablados."
            : "Toque marca. A seta muda a altura. Um dedo arrasta, dois giram."}
      </p>
      <p className="hidden shrink-0 px-3 pb-2 text-xs leading-snug text-muted lg:block">
        {modo === "remover"
          ? "Modo remover. Clique no tablado para tirar. Clique de novo no buraco, ou perto dele, para colocar de volta."
          : "Modo altura. Clique marca o tablado. A seta sobe ou desce os marcados. Sem marca, mexe no piso todo."}{" "}
        ? abre os atalhos.
      </p>
    </section>
  );
}

function Faixas({ carpete, frente, fundo }: { carpete: Carpete; frente: number; fundo: number }) {
  if (carpete.recorte || carpete.faixas < 1 || frente <= 0 || fundo <= 0) return null;
  const aoLongoFrente = carpete.sentido === "frente";
  return (
    <div className="mt-2">
      <div className={`flex h-16 overflow-hidden rounded-sm border border-line ${aoLongoFrente ? "flex-col" : ""}`}>
        {Array.from({ length: carpete.faixas }, (_, indice) => (
          <div
            key={indice}
            className={indice % 2 === 0 ? "min-h-0 min-w-0 bg-accent/70" : "min-h-0 min-w-0 bg-accent/35"}
            style={{ flexGrow: indice === carpete.faixas - 1 ? carpete.ultima : carpete.largura, flexBasis: 0 }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Faixas do rolo, no sentido da {carpete.sentido}.</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="font-display text-sm tracking-widest text-muted">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line bg-surface px-2 py-2">
      <p className="text-xs tracking-widest text-muted">{label.toUpperCase()}</p>
      <p className="truncate font-display text-xl leading-none text-fg tabular-nums">{value}</p>
    </div>
  );
}

function ListRow({
  color,
  name,
  measure,
  qty,
  onColor,
}: {
  color: string;
  name: string;
  measure: string;
  qty: number;
  onColor: (color: string) => void;
}) {
  return (
    <tr className="border-b border-line">
      <td className="py-1.5 pr-2">
        <span className="flex min-w-0 items-center gap-2">
          <label className="relative inline-flex size-11 shrink-0 items-center justify-center">
            <input
              type="color"
              aria-label={`Cor de ${name}`}
              value={color}
              onChange={(event) => onColor(event.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            <span className="pointer-events-none size-5 border border-line" style={{ backgroundColor: color }} />
          </label>
          <span className="min-w-0 break-words">{name}</span>
        </span>
      </td>
      <td className="py-1.5 pr-2 break-words text-muted tabular-nums">{measure}</td>
      <td className="py-1.5 text-right font-display text-lg leading-none tabular-nums">{fmtQty(qty)}</td>
    </tr>
  );
}

function NumField({
  label,
  value,
  suffix,
  disabled,
  live,
  onCommit,
}: {
  label: string;
  value: number;
  suffix: string;
  disabled?: boolean;
  live?: boolean;
  onCommit: (value: number) => void;
}) {
  const shown = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const [text, setText] = useState(shown(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(shown(value));
  }, [value]);
  const commit = (raw: string) => {
    const parsed = Number(raw.replace(",", ".").trim());
    if (!Number.isFinite(parsed)) {
      if (!focused.current) setText(shown(value));
      return;
    }
    onCommit(parsed);
    if (!focused.current) setText(shown(parsed));
  };
  return (
    <label className="block">
      <span className="mb-1 block min-h-8 text-xs leading-4 text-muted">
        {label} ({suffix})
      </span>
      <input
        className={field}
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => {
          setText(event.target.value);
          if (live) commit(event.target.value);
        }}
        onBlur={(event) => {
          focused.current = false;
          commit(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </label>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={iconBtn}
          aria-label={`Diminuir ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className="min-w-8 text-center font-display text-2xl leading-none tabular-nums">{value}</span>
        <button
          type="button"
          className={iconBtn}
          aria-label={`Aumentar ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
