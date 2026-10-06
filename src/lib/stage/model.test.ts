import assert from "node:assert/strict";
import test from "node:test";
import {
  ajustarAltura,
  billOf,
  carpeteDe,
  chaveModulo,
  defaultProject,
  definirSuperficie,
  estruturaOf,
  crescerFrente,
  crescerFundo,
  fillGrid,
  hypotM,
  lerArquivo,
  malha2x1,
  montarPiso,
  sanitize,
  setDoisNiveis,
  setSuperficie,
  tamanhoDoModulo,
  toggleCell,
  reporTablado,
  usaCanoX,
  withCols,
} from "./model.ts";

test("retângulo 4×4 de tablado 2×1 conta pés e travessas compartilhados", () => {
  const bill = billOf(defaultProject());
  assert.equal(bill.decks, 16);
  assert.equal(bill.legs, 25);
  assert.equal(bill.beamsX, 20);
  assert.equal(bill.beamsY, 20);
  assert.equal(bill.internas, 32);
  assert.equal(bill.xFrente, 0);
  assert.equal(bill.xFundo, 0);
  assert.equal(bill.xFrenteLen, 0);
  assert.equal(bill.xFundoLen, 0);
  assert.equal(
    bill.linhas.some((linha) => linha.nome.startsWith("Cano X")),
    false,
  );
  assert.equal(
    bill.warnings.some((aviso) => aviso.includes("não leva cano em X")),
    true,
  );
  assert.equal(bill.frente, 8);
  assert.equal(bill.fundo, 4);
  assert.equal(bill.area, 32);
  assert.equal(bill.pe, 0.75);
  assert.equal(bill.superficie, 0.8);
  assert.equal(bill.rectangular, true);
  assert.equal(bill.decks2, 16);
  assert.equal(bill.decks1, 0);
  assert.equal(bill.pessoas, 128);
  assert.equal(bill.carpete.m2, 32);
  assert.equal(bill.carpete.largura, 2);
  assert.equal(bill.carpete.faixas, 2);
  assert.equal(bill.carpete.comprimento, 8);
  assert.equal(bill.carpete.linear, 16);
  assert.equal(bill.carpete.recorte, false);
  assert.equal(bill.carpete.sobra, 0);
});

test("tirar o canto remove só o pé e as travessas exclusivas", () => {
  const base = { ...defaultProject(), cols: 4, rows: 2, modulos: malha2x1(2, 2) };
  const cut = toggleCell(base, 0, 0);
  const bill = billOf(cut);
  assert.equal(bill.decks, 3);
  assert.equal(bill.legs, 8);
  assert.equal(bill.beamsX, 5);
  assert.equal(bill.beamsY, 5);
  assert.equal(bill.internas, 6);
  assert.equal(bill.xFrente, 0);
  assert.equal(bill.xFundo, 0);
  assert.equal(bill.rectangular, false);
});

test("guarda-corpo conta um módulo por borda livre do lado marcado", () => {
  const aberto = billOf({
    ...defaultProject(),
    guardaFrente: true,
    guardaFundo: true,
    guardaEsq: true,
    guardaDir: true,
  });
  assert.equal(aberto.guardaFrente, 4);
  assert.equal(aberto.guardaFundo, 4);
  assert.equal(aberto.guardaEsq, 4);
  assert.equal(aberto.guardaDir, 4);
  const fechado = billOf(defaultProject());
  assert.equal(fechado.guardaFrente + fechado.guardaFundo + fechado.guardaEsq + fechado.guardaDir, 0);
});

test("aumentar a frente em 1 m preenche a faixa com tablado 1×1", () => {
  const next = withCols(defaultProject(), 9);
  assert.equal(next.cols, 9);
  assert.equal(next.modulos.length, 20);
  assert.equal(next.modulos.filter((modulo) => modulo.w === 1 && modulo.h === 1).length, 4);
});

test("1×1 ao lado do 2×1 parte a travessa no pé do meio", () => {
  const piso = {
    ...defaultProject(),
    cols: 2,
    rows: 2,
    modulos: [
      { x: 0, y: 0, w: 2 as const, h: 1 as const, nivel: "baixo" as const },
      { x: 0, y: 1, w: 1 as const, h: 1 as const, nivel: "baixo" as const },
    ],
  };
  const lentes = estruturaOf(piso)
    .vigasX.map((viga) => viga.len)
    .sort((a, b) => a - b);
  assert.deepEqual(lentes, [1, 1, 1, 2]);
});

test("dois níveis mudam a altura do pé e o piso padrão continua de um nível", () => {
  const unico = billOf(defaultProject());
  assert.equal(unico.linhas.filter((linha) => linha.nome === "Pé").length, 1);
  assert.equal(unico.peAlto, unico.pe);
  const alto = billOf(setDoisNiveis(defaultProject(), true));
  assert.equal(alto.superficie, 0.8);
  assert.equal(alto.superficieAlto, 1.2);
  assert.equal(alto.pe, 0.75);
  assert.equal(alto.peAlto, 1.15);
  assert.equal(alto.legs, 30);
  assert.equal(alto.linhas.filter((linha) => linha.nome === "Pé").length, 2);
  assert.equal(alto.linhas.find((linha) => linha.nome === "Travessa frente")?.qty, 24);
  assert.equal(alto.linhas.find((linha) => linha.nome === "Travessa fundo")?.qty, 20);
  assert.equal(alto.guardaFrente + alto.guardaFundo + alto.guardaEsq + alto.guardaDir, 0);
});

test("desnível não compartilha pé: cada bloco tem o seu", () => {
  const base = defaultProject();
  const chave = chaveModulo(base.modulos[5]);
  const alto = definirSuperficie(base, 1, [chave]);
  const estAlto = estruturaOf(alto);
  const modulo = estAlto.modulos.find((item) => chaveModulo(item) === chave);
  assert.ok(modulo);
  const cantos = [modulo.x, modulo.x + modulo.w].flatMap((x) => [modulo.y, modulo.y + modulo.h].map((y) => ({ x, y })));
  for (const canto of cantos) {
    const noCanto = estAlto.pernas.filter((perna) => perna.x === canto.x && perna.y === canto.y);
    assert.equal(noCanto.length, 2);
    assert.ok(noCanto.some((perna) => perna.pe === 0.95));
    assert.ok(noCanto.some((perna) => perna.pe === 0.75));
    for (const perna of noCanto) assert.ok(Math.hypot(perna.ox, perna.oy) > 0.03);
  }
  assert.equal(estAlto.pernas.filter((perna) => perna.pe === 0.95).length, 4);
  assert.equal(estAlto.pernas.filter((perna) => perna.pe === 0.75).length, 25);
  assert.equal(estAlto.pernas.length, 29);
  const billAlto = billOf(alto);
  assert.equal(billAlto.legs, 29);
  assert.equal(billAlto.linhas.find((linha) => linha.medida.includes("0,95"))?.qty, 4);
  assert.equal(billAlto.linhas.find((linha) => linha.medida.includes("0,75"))?.qty, 25);
  assert.match(billAlto.warnings.join(" "), /não compartilham pé/);

  const baixo = definirSuperficie(base, 0.45, [chave]);
  const estBaixo = estruturaOf(baixo);
  for (const canto of cantos) {
    const noCanto = estBaixo.pernas.filter((perna) => perna.x === canto.x && perna.y === canto.y);
    assert.equal(noCanto.length, 2);
    assert.ok(noCanto.some((perna) => Math.abs(perna.pe - 0.4) < 0.001));
    assert.ok(noCanto.some((perna) => perna.pe === 0.75));
  }
  assert.equal(estBaixo.pernas.length, 29);
  assert.equal(estruturaOf(base).pernas.every((perna) => perna.ox === 0 && perna.oy === 0), true);
});

test("crescer ao lado copia a altura do tablado vizinho", () => {
  const base = defaultProject();
  const canto = base.modulos.find((modulo) => modulo.x + modulo.w === base.cols && modulo.y === 0);
  assert.ok(canto);
  const alto = definirSuperficie(base, 1.2, [chaveModulo(canto)]);
  const frente = crescerFrente(alto);
  const novoFrente = frente.modulos.find((modulo) => modulo.x === base.cols && modulo.y === 0);
  const baixoFrente = frente.modulos.find((modulo) => modulo.x === base.cols && modulo.y === 1);
  assert.equal(novoFrente?.superficie, 1.2);
  assert.equal(baixoFrente?.superficie, 0.8);
  const fundoBase = base.modulos.find((modulo) => modulo.y + modulo.h === base.rows && modulo.x === 0);
  assert.ok(fundoBase);
  const baixo = definirSuperficie(base, 0.45, [chaveModulo(fundoBase)]);
  const fundo = crescerFundo(baixo);
  const novoFundo = fundo.modulos.find((modulo) => modulo.y === base.rows && modulo.x === 0);
  assert.equal(novoFundo?.superficie, 0.45);
});

test("subir 20 cm um tablado marcado muda só a altura dele", () => {
  const base = defaultProject();
  const chave = chaveModulo(base.modulos[0]);
  const alto = ajustarAltura(base, 4, false, [chave]);
  const est = estruturaOf(alto);
  const marcado = est.modulos.find((modulo) => chaveModulo(modulo) === chave);
  assert.equal(marcado?.superficie, 1);
  assert.equal(est.modulos.filter((modulo) => modulo.superficie === 0.8).length, 15);
});

test("carpete de 8 por 5 compra três faixas e sobra largura", () => {
  const carpete = carpeteDe(40, 8, 5, true, 2);
  assert.equal(carpete.faixas, 3);
  assert.equal(carpete.comprimento, 8);
  assert.equal(carpete.linear, 24);
  assert.equal(carpete.ultima, 1);
  assert.equal(carpete.sobra, 1);
  assert.equal(carpete.sentido, "frente");
});

test("projeto antigo em colunas de módulo vira metros", () => {
  const salvo = sanitize({
    cols: 4,
    rows: 4,
    occupied: fillGrid(4, 4),
    tabladoLargura: 2,
    tabladoFundo: 1,
    superficie: 0.8,
    espessuraCm: 5,
  });
  const bill = billOf(salvo);
  assert.equal(salvo.cols, 8);
  assert.equal(salvo.rows, 4);
  assert.equal(bill.decks, 16);
  assert.equal(bill.legs, 25);
});

test("clicar de novo no buraco devolve o mesmo tablado", () => {
  const base = defaultProject();
  const peca = { ...base.modulos[0], superficie: 1 };
  const sem = toggleCell({ ...base, modulos: [peca, ...base.modulos.slice(1)] }, peca.x + 1, peca.y);
  assert.equal(billOf(sem).decks, 15);
  const noBuraco = reporTablado(sem, peca.x + 1, peca.y, peca);
  assert.equal(billOf(noBuraco).decks, 16);
  assert.equal(billOf(noBuraco).legs, 28);
  const deVolta = noBuraco.modulos.find((modulo) => modulo.x === peca.x && modulo.y === peca.y);
  assert.equal(deVolta?.w, 2);
  assert.equal(deVolta?.superficie, 1);
  assert.equal(billOf(reporTablado(noBuraco, peca.x, peca.y, peca)).decks, 16);

  const dois = toggleCell(toggleCell(base, 0, 0), 0, 1);
  assert.equal(billOf(dois).decks, 14);
  const perto = reporTablado(dois, 0, 1, base.modulos[0]);
  assert.equal(billOf(perto).decks, 15);
  assert.equal(
    perto.modulos.some((modulo) => modulo.x === 0 && modulo.y === 0 && modulo.w === 2),
    true,
  );
});

test("digitar 2,00 por 1,00 no preset mantém o piso padrão", () => {
  const piso = montarPiso(defaultProject(), "2x1", 4, 4, { frente: 2, fundo: 1 });
  const bill = billOf(piso);
  assert.equal(bill.decks, 16);
  assert.equal(bill.legs, 25);
  assert.equal(bill.beamsX, 20);
  assert.equal(bill.beamsY, 20);
  assert.equal(bill.area, 32);
  assert.equal(bill.frente, 8);
  assert.equal(bill.fundo, 4);
  assert.equal(bill.xFrente, 0);
  assert.equal(bill.xFundo, 0);
});

test("digitar o tamanho do tablado muda o comprimento das peças", () => {
  const layout = tamanhoDoModulo(1.22, 1.22);
  assert.equal(layout.ferramenta, "1x1");
  assert.equal(layout.cellX, 1.22);
  assert.equal(layout.cellY, 1.22);
  const piso = montarPiso(defaultProject(), "1x1", 2, 2, { frente: 1.22, fundo: 1.22 });
  const bill = billOf(piso);
  assert.equal(bill.decks, 4);
  assert.equal(bill.legs, 9);
  assert.equal(bill.frente, 2.44);
  assert.equal(bill.fundo, 2.44);
  assert.equal(bill.area, Math.round(4 * 1.22 * 1.22 * 1000) / 1000);
  const frente = bill.linhas.find((linha) => linha.nome === "Travessa frente");
  assert.equal(frente?.medida, "1,22 m");
  assert.equal(frente?.qty, 6);
  const tablado = bill.linhas.find((linha) => linha.nome.startsWith("Tablado"));
  assert.equal(tablado?.nome, "Tablado 1,22 × 1,22");
  assert.equal(tablado?.qty, 4);
  assert.equal(bill.xFrente, 0);
  assert.equal(bill.xFundo, 0);
  assert.equal(bill.beamsX, 6);
  assert.equal(bill.beamsY, 6);
  assert.equal(bill.internas, 8);
});

test("cano em X só entra com o piso em 1,00 m ou mais", () => {
  assert.equal(usaCanoX(0.99), false);
  assert.equal(usaCanoX(1), true);
  assert.equal(billOf(setSuperficie(defaultProject(), 0.99)).xFrente, 0);

  const alto = billOf(setSuperficie(defaultProject(), 1));
  assert.equal(alto.superficie, 1);
  assert.equal(alto.pe, 0.95);
  assert.equal(alto.decks, 16);
  assert.equal(alto.legs, 25);
  assert.equal(alto.beamsX, 20);
  assert.equal(alto.beamsY, 20);
  assert.equal(alto.internas, 32);
  assert.equal(alto.xFrente, 40);
  assert.equal(alto.xFundo, 40);
  assert.equal(alto.xFrenteLen, hypotM(2, 0.95));
  assert.equal(alto.xFundoLen, hypotM(1, 0.95));
  assert.equal(alto.linhas.find((linha) => linha.nome === "Cano X frente")?.qty, 40);
  assert.equal(alto.linhas.find((linha) => linha.nome === "Cano X fundo")?.qty, 40);
  assert.equal(
    alto.warnings.some((aviso) => aviso.includes("não leva cano em X")),
    false,
  );

  const misto = billOf(setDoisNiveis(defaultProject(), true));
  assert.equal(misto.xFrente, 24);
  assert.equal(misto.xFundo, 20);
  assert.equal(misto.xFrenteLen, hypotM(2, 1.15));
  assert.equal(misto.xFundoLen, hypotM(1, 1.15));
  assert.equal(misto.beamsX, 24);
  assert.equal(misto.beamsY, 20);
  assert.equal(misto.internas, 32);
  assert.equal(
    misto.linhas.some((linha) => linha.nome.startsWith("Cano X") && linha.medida.startsWith(`${fmtMedida(hypotM(2, 0.75))}`)),
    false,
  );
  assert.equal(
    misto.warnings.some((aviso) => aviso.includes("1,00 m ou mais")),
    true,
  );

  const base = defaultProject();
  const chave = chaveModulo(base.modulos[0]);
  const um = billOf(ajustarAltura(base, 4, false, [chave]));
  assert.equal(um.xFrente, 4);
  assert.equal(um.xFundo, 4);
  assert.equal(um.xFrente + um.xFundo, 8);
  assert.equal(um.decks, 16);
  assert.equal(um.internas, 32);
});

function fmtMedida(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

test("altura pronta sobe o piso inteiro ou só os marcados", () => {
  const todo = billOf(definirSuperficie(defaultProject(), 1.2));
  assert.equal(todo.superficie, 1.2);
  assert.equal(todo.pe, 1.15);
  assert.equal(todo.xFrente, 40);
  assert.equal(todo.xFundo, 40);
  assert.equal(todo.decks, 16);
  assert.equal(todo.legs, 25);
  const base = defaultProject();
  const chave = chaveModulo(base.modulos[0]);
  const um = billOf(definirSuperficie(base, 1, [chave]));
  assert.equal(um.xFrente + um.xFundo, 8);
  assert.equal(um.decks, 16);
  assert.equal(estruturaOf(definirSuperficie(base, 1, [chave])).modulos.filter((modulo) => modulo.superficie === 0.8).length, 15);
});

test("arquivo de piso abre no outro computador", () => {
  const aberto = lerArquivo({ tipo: "piso-tablado", versao: 1, projeto: defaultProject() });
  assert.equal(billOf(aberto).decks, 16);
  assert.throws(() => lerArquivo({ tipo: "outro" }), /piso tablado/);
});
