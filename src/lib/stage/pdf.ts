import { jsPDF } from "jspdf";
import { renderStageJpeg } from "./draw";
import { billOf, fmtM, fmtQty, modulosOf, round3, slugNome, superficieModulo, type Bill, type Project } from "./model";

function alturasDoPiso(project: Project): number[] {
  const valores = modulosOf(project).map((modulo) => round3(superficieModulo(project, modulo)));
  return [...new Set(valores)].sort((a, b) => a - b);
}

function textoAltura(project: Project, fallback: number): string {
  const alturas = alturasDoPiso(project);
  if (alturas.length <= 1) return `Altura ${fmtM(alturas[0] ?? fallback)} m`;
  return `Alturas ${alturas.map((altura) => fmtM(altura)).join(" e ")} m`;
}

function loadLogo(): Promise<string | null> {
  return fetch(`${import.meta.env.BASE_URL}marca-digital.png`)
    .then(async (res) => {
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    })
    .catch(() => null);
}

export async function downloadReport(project: Project) {
  const bill = billOf(project);
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;

  doc.setFillColor(20, 21, 19);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(226, 162, 58);
  doc.rect(0, 32, pageW, 1.4, "F");

  const logoW = 38;
  const logoH = 18;
  if (logo) {
    doc.setFillColor(243, 239, 228);
    doc.rect(margin - 1, 5.5, logoW + 3, logoH + 3, "F");
    doc.addImage(logo, "PNG", margin, 7, logoW, logoH);
  }
  const textX = logo ? margin + logoW + 4 : margin;

  doc.setTextColor(243, 239, 228);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("LISTA DE SEPARAÇÃO", textX, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Digital Produções e Eventos", textX, 20);
  doc.text(project.nome || "Piso de palco", textX, 26);
  const when = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  doc.text(when, pageW - margin, 14, { align: "right" });

  doc.setTextColor(30, 32, 28);
  doc.setFontSize(10);
  let y = 42;
  const specs = [
    `Frente ${fmtM(bill.frente)} m`,
    `Fundo ${fmtM(bill.fundo)} m`,
    textoAltura(project, bill.superficie),
    `Área ${fmtM(bill.area)} m²`,
    `${fmtQty(bill.pessoas)} pessoas`,
    `Carpete ${fmtM(bill.carpete.linear)} m × ${fmtM(bill.carpete.largura)} m`,
    bill.rectangular ? "Piso retangular" : "Piso com recorte",
  ].join("   ·   ");
  const specLinhas = doc.splitTextToSize(specs, contentW) as string[];
  doc.text(specLinhas, margin, y);
  y += specLinhas.length * 5 + 3;

  const columns = [14, 48, 66, 20, 34];
  const headers = ["Item", "Peça", "Medida", "Qtd", "Total"];
  const rows = bill.linhas
    .filter((linha) => linha.qty > 0)
    .map((linha, index) => [
      String(index + 1).padStart(2, "0"),
      linha.nome,
      linha.medida,
      fmtQty(linha.qty),
      linha.total,
    ]);

  const drawHeader = (top: number) => {
    doc.setFillColor(226, 162, 58);
    doc.rect(margin, top, contentW, 8, "F");
    doc.setTextColor(26, 20, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = margin + 2;
    headers.forEach((label, i) => {
      doc.text(label, x, top + 5.4);
      x += columns[i];
    });
    return top + 8;
  };

  y = drawHeader(y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 32, 28);
  rows.forEach((row, index) => {
    if (y > 262) {
      doc.addPage();
      y = drawHeader(18);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 32, 28);
    }
    if (index % 2 === 0) {
      doc.setFillColor(244, 241, 232);
      doc.rect(margin, y, contentW, 9, "F");
    }
    let x = margin + 2;
    doc.setFontSize(9);
    row.forEach((cell, i) => {
      const clipped = doc.splitTextToSize(cell, columns[i] - 3) as string[];
      doc.text(clipped[0] ?? "", x, y + 5.8);
      x += columns[i];
    });
    y += 9;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Medidas das peças", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const alturas = alturasDoPiso(project);
  const notas = [
    `Piso de ${fmtM(bill.frente)} m de frente por ${fmtM(bill.fundo)} m de fundo. Área ${fmtM(bill.area)} m².`,
    bill.decks1 > 0 && bill.decks2 > 0
      ? `Tablados mistos: ${fmtQty(bill.decks2)} de 2,00 × 1,00 m e ${fmtQty(bill.decks1)} de 1,00 × 1,00 m. Espessura ${project.espessuraCm.toLocaleString("pt-BR")} cm.`
      : `Tablados: ${fmtQty(bill.decks)} placa${bill.decks === 1 ? "" : "s"}, espessura ${project.espessuraCm.toLocaleString("pt-BR")} cm.`,
    alturas.length > 1
      ? `Alturas diferentes: ${alturas.map((altura) => fmtM(altura)).join(" m e ")} m. No desnível cada bloco tem os próprios pés, como dois pisos lado a lado. O mais baixo não usa o pé do mais alto. Seção do pé ${project.secaoCm.toLocaleString("pt-BR")} cm.`
      : `Superfície a ${fmtM(bill.superficie)} m. Pé de ${fmtM(bill.pe)} m. A placa entra por cima (${project.espessuraCm.toLocaleString("pt-BR")} cm). Seção do pé ${project.secaoCm.toLocaleString("pt-BR")} cm.`,
    `Lotação estimada: ${fmtQty(bill.pessoas)} pessoas em pé, 4 por m². Não é desenho de público, só a conta de quantas cabem.`,
    bill.carpete.recorte
      ? `Carpete com recorte: compre ${fmtM(bill.carpete.linear)} m de comprimento de rolo com ${fmtM(bill.carpete.largura)} m de largura. A conta usa a área de ${fmtM(bill.carpete.m2)} m².`
      : `Carpete: rolo de ${fmtM(bill.carpete.largura)} m de largura. ${bill.carpete.faixas} faixa${bill.carpete.faixas === 1 ? "" : "s"} de ${fmtM(bill.carpete.comprimento)} m ao longo da ${bill.carpete.sentido}. Comprar ${fmtM(bill.carpete.linear)} m de comprimento.`,
    "Travessa externa: um vão por trecho entre pés, compartilhado só no mesmo nível. A planta desenha o vão real.",
    `Travessa interna: duas por tablado, no sentido ${project.internaSentido === "frente" ? "da frente" : "do fundo"}, por baixo da placa. Não é compartilhada.`,
    `Cano em X: só a partir de 1,00 m de piso. Dois canos por vão de travessa externa. O vão do vizinho no mesmo nível não conta de novo. Abaixo de 1,00 m não entra cano em X. Diâmetro ${project.canoCm.toLocaleString("pt-BR")} cm.`,
    bill.guardaFrente + bill.guardaFundo + bill.guardaEsq + bill.guardaDir > 0
      ? `Guarda-corpo só no lado marcado e só na borda livre. Altura ${fmtM(project.guardaAltura)} m. A medida é a da borda do tablado.`
      : "Nenhum lado de guarda-corpo marcado.",
  ];
  for (const line of notas) {
    const wrapped = doc.splitTextToSize(line, contentW) as string[];
    if (y + wrapped.length * 4.6 > 272) {
      doc.addPage();
      y = 18;
    }
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.6 + 1.4;
  }

  if (bill.warnings.length || project.obs.trim()) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Observações", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const extra = [...bill.warnings];
    if (project.obs.trim()) extra.push(project.obs.trim());
    for (const line of extra) {
      const wrapped = doc.splitTextToSize(line, contentW) as string[];
      if (y + wrapped.length * 4.6 > 272) {
        doc.addPage();
        y = 18;
      }
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.6 + 1.6;
    }
  }

  const imgW = (contentW - 6) / 2;
  const imgH = imgW * (900 / 1400);
  y = desenharCarpete(doc, bill, y, margin, contentW);
  if (y + imgH + 16 > 280) {
    doc.addPage();
    y = 18;
  } else {
    y += 4;
  }

  const com = renderStageJpeg(project, project, true, "COM TABLADO");
  const sem = renderStageJpeg(project, project, false, "ESTRUTURA — SEM TABLADO");
  const cima = renderStageJpeg(project, project, true, "VISTA DE CIMA", "topo");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 32, 28);
  doc.text("Com tablado", margin, y);
  doc.text("Sem tablado", margin + imgW + 6, y);
  y += 3;
  doc.addImage(com, "JPEG", margin, y, imgW, imgH);
  doc.addImage(sem, "JPEG", margin + imgW + 6, y, imgW, imgH);
  doc.setDrawColor(58, 61, 54);
  doc.rect(margin, y, imgW, imgH);
  doc.rect(margin + imgW + 6, y, imgW, imgH);

  y += imgH + 8;
  const topoH = contentW * (900 / 1400);
  if (y + topoH + 8 > 282) {
    doc.addPage();
    y = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 32, 28);
  doc.text("Vista de cima", margin, y);
  y += 3;
  doc.addImage(cima, "JPEG", margin, y, contentW, topoH);
  doc.setDrawColor(58, 61, 54);
  doc.rect(margin, y, contentW, topoH);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(116, 110, 100);
    doc.text(
      "Quantitativo de montagem. Confira na obra antes de cortar ou separar o caminhão.",
      margin,
      290,
    );
    doc.text(`${i}/${pages}`, pageW - margin, 290, { align: "right" });
  }

  doc.save(`${slugNome(project.nome)}-lista.pdf`);
}

function desenharCarpete(doc: jsPDF, bill: Bill, y: number, margin: number, contentW: number): number {
  const c = bill.carpete;
  const altura = c.recorte ? 62 : 74;
  if (y + altura > 272) {
    doc.addPage();
    y = 18;
  }
  doc.setFillColor(244, 241, 232);
  doc.setDrawColor(58, 61, 54);
  doc.rect(margin, y, contentW, altura, "FD");
  doc.setTextColor(30, 32, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CARPETE: O QUE COMPRAR", margin + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const compra = c.recorte
    ? `Piso com recorte de ${fmtM(c.m2)} m². Compre ${fmtM(c.linear)} m de comprimento. Largura do rolo: ${fmtM(c.largura)} m.`
    : `Largura do rolo: ${fmtM(c.largura)} m. ${c.faixas} faixa${c.faixas === 1 ? "" : "s"} de ${fmtM(c.comprimento)} m. Comprar ${fmtM(c.linear)} m de comprimento.`;
  const linhas = doc.splitTextToSize(compra, contentW - 8) as string[];
  doc.text(linhas, margin + 4, y + 13);
  const topo = y + 13 + linhas.length * 4.2;
  desenharRolo(doc, margin + 4, topo, 78, c.largura, c.linear);
  desenharPlantaCarpete(doc, margin + 88, topo, contentW - 96, bill);
  return y + altura + 6;
}

function desenharRolo(doc: jsPDF, x: number, y: number, largura: number, rolo: number, comprar: number) {
  const cy = y + 16;
  doc.setFillColor(214, 186, 140);
  doc.setDrawColor(90, 70, 40);
  doc.ellipse(x + 8, cy, 5, 12, "FD");
  doc.setFillColor(232, 210, 170);
  doc.rect(x + 8, cy - 12, largura - 22, 24, "FD");
  doc.ellipse(x + largura - 14, cy, 5, 12, "FD");
  doc.setDrawColor(30, 32, 28);
  doc.line(x + 8, y + 2, x + largura - 14, y + 2);
  doc.line(x + 8, y, x + 8, y + 4);
  doc.line(x + largura - 14, y, x + largura - 14, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 32, 28);
  doc.text(`largura ${fmtM(rolo)} m`, x + 10, y + 1);
  doc.setFont("helvetica", "normal");
  doc.text(`comprar ${fmtM(comprar)} m`, x, y + 34);
}

function desenharPlantaCarpete(doc: jsPDF, x: number, y: number, largura: number, bill: Bill) {
  const c = bill.carpete;
  const caixaW = largura - 4;
  const caixaH = 28;
  if (c.recorte || bill.frente <= 0 || bill.fundo <= 0) {
    doc.setFontSize(8);
    doc.setTextColor(90, 80, 60);
    doc.text("Planta com recorte: meça o corte na obra.", x, y + 12);
    return;
  }
  const escala = Math.min(caixaW / bill.frente, caixaH / bill.fundo);
  const dw = bill.frente * escala;
  const dh = bill.fundo * escala;
  const ox = x + (caixaW - dw) / 2;
  const oy = y + 4;
  doc.setDrawColor(90, 70, 40);
  for (let i = 0; i < c.faixas; i++) {
    const medida = i === c.faixas - 1 ? c.ultima : c.largura;
    const inicio = i * c.largura;
    if (c.sentido === "frente") {
      const y0 = oy + (inicio / bill.fundo) * dh;
      const h = (medida / bill.fundo) * dh;
      doc.setFillColor(i % 2 ? 196 : 232, i % 2 ? 160 : 210, i % 2 ? 112 : 170);
      doc.rect(ox, y0, dw, h, "FD");
    } else {
      const x0 = ox + (inicio / bill.frente) * dw;
      const w = (medida / bill.frente) * dw;
      doc.setFillColor(i % 2 ? 196 : 232, i % 2 ? 160 : 210, i % 2 ? 112 : 170);
      doc.rect(x0, oy, w, dh, "FD");
    }
  }
  doc.setFontSize(7);
  doc.setTextColor(30, 32, 28);
  doc.text(`${fmtM(bill.frente)} m`, ox, oy - 1);
  doc.text(`${fmtM(bill.fundo)} m`, ox + dw + 1.5, oy + 3);
  const sobra =
    c.sobra > 0.01
      ? `Última faixa cobre ${fmtM(c.ultima)} m. Sobram ${fmtM(c.sobra)} m de largura.`
      : `${c.faixas} faixas, sem sobra de largura.`;
  doc.text(sobra, x, oy + dh + 5);
}
