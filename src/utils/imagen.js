/**
 * Utilidades de imagen para reconocer envases por su aspecto.
 *
 * Idea: cada foto de referencia se resume en una "firma visual" muy chica
 * (111 números). Para reconocer, se calcula la firma de lo que ve la cámara
 * y se compara contra las firmas guardadas. No hay librerías externas ni
 * modelos que descargar: todo corre en el teléfono.
 *
 * La firma combina tres cosas:
 *   1. Disposición de colores: promedio de color en una grilla de 8x4 celdas
 *      (normalizado por la luz media, para tolerar más/menos iluminación).
 *   2. Histograma de tonos: qué colores predominan, sin importar dónde.
 *   3. Gradientes: hacia dónde se aclara/oscurece la imagen (estructura).
 */

export const VERSION_FIRMA = 3;

// Recorte central VERTICAL: idéntico al marco verde del reconocedor.
// Ocupa el 80% del alto del cuadro y tiene proporción ancho/alto = 0.65
// (nunca más del 90% del ancho). La foto de referencia y la imagen en vivo
// usan SIEMPRE este mismo recorte.
export const RECORTE = { alto: 0.8, relacion: 0.65, maxAncho: 0.9 };

/** Posición y tamaño del recorte dentro de un cuadro de ancho x alto píxeles */
export function geometriaRecorte(ancho, alto) {
  let rh = alto * RECORTE.alto;
  let rw = rh * RECORTE.relacion;
  const maxW = ancho * RECORTE.maxAncho;
  if (rw > maxW) {
    rw = maxW;
    rh = rw / RECORTE.relacion;
  }
  return {
    sx: (ancho - rw) / 2,
    sy: (alto - rh) / 2,
    rw,
    rh,
    fracAncho: rw / ancho, // para dibujar el marco (0..1)
    fracAlto: rh / alto,
  };
}

// Tamaño al que se reduce el recorte antes de describirlo
const MUESTRA_ANCHO = 48;
const MUESTRA_ALTO = 96;

// Grilla fina de color (8x16, vertical). Se compara tolerando pequeños corrimientos.
const GX = 8;
const GY = 16;
const N_CELDAS = GX * GY; // 128
const BINS_TONO = 12;
const BINS_GRIS = 3; // oscuro / medio / claro (para píxeles sin color)
const N_HIST = BINS_TONO + BINS_GRIS; // 15
const BASE_HIST = N_CELDAS * 3;
export const LARGO_FIRMA = BASE_HIST + N_HIST; // 399

// Corrimientos tolerados al comparar (en celdas finas: 1 celda ≈ 12% del ancho, 6% del alto)
const MAX_DESPL_X = 1;
const MAX_DESPL_Y = 2;

// Parámetros de la comparación (calibrados con pruebas)
const PESO_DISPOSICION = 0.5;
const PESO_TONOS = 0.2;
const PESO_GRADIENTES = 0.3;
const ESCALA_DISTANCIA = 0.35;
const PENALIZACION_DESPLAZAMIENTO = 0.1;
const ZONA_MUERTA_GRADIENTE = 3;
// La similitud "cruda" de dos imágenes sin relación ronda este valor.
// Se resta y se reescala para que 0% ≈ imágenes distintas y 100% ≈ idénticas.
const PISO_SIMILITUD = 0.3;

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/* ------------------------------------------------------------------ */
/*  NÚCLEO PURO (sin DOM): recibe algo con forma de ImageData          */
/* ------------------------------------------------------------------ */

// Suaviza un plano de la grilla con un filtro [1 2 1] en horizontal y vertical.
// Así, un corrimiento de "media celda" cambia poco el resultado.
function suavizarPlano(plano) {
  const tmp = new Float64Array(N_CELDAS);
  for (let cy = 0; cy < GY; cy++) {
    for (let cx = 0; cx < GX; cx++) {
      const izq = plano[cy * GX + Math.max(0, cx - 1)];
      const der = plano[cy * GX + Math.min(GX - 1, cx + 1)];
      tmp[cy * GX + cx] = (izq + 2 * plano[cy * GX + cx] + der) / 4;
    }
  }
  const out = new Float64Array(N_CELDAS);
  for (let cy = 0; cy < GY; cy++) {
    for (let cx = 0; cx < GX; cx++) {
      const arr = tmp[Math.max(0, cy - 1) * GX + cx];
      const aba = tmp[Math.min(GY - 1, cy + 1) * GX + cx];
      out[cy * GX + cx] = (arr + 2 * tmp[cy * GX + cx] + aba) / 4;
    }
  }
  return out;
}

/**
 * @param {{data: Uint8ClampedArray|Uint8Array, width: number, height: number}} imagen RGBA
 * @returns {Uint8Array} firma de LARGO_FIRMA bytes
 */
export function calcularFirma({ data, width, height }) {
  const sumaR = new Float64Array(N_CELDAS);
  const sumaG = new Float64Array(N_CELDAS);
  const sumaB = new Float64Array(N_CELDAS);
  const cuenta = new Uint32Array(N_CELDAS);
  let totR = 0;
  let totG = 0;
  let totB = 0;

  for (let y = 0; y < height; y++) {
    const cy = Math.min(GY - 1, Math.floor((y * GY) / height));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const c = cy * GX + Math.min(GX - 1, Math.floor((x * GX) / width));
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      sumaR[c] += r;
      sumaG[c] += g;
      sumaB[c] += b;
      cuenta[c]++;
      totR += r;
      totG += g;
      totB += b;
    }
  }

  const n = Math.max(1, width * height);
  // Normalización por canal ("gray-world"): quita el efecto de la cantidad de
  // luz y de la dominante de color de la lámpara/cámara.
  const mediaR = Math.max(0.02, totR / n);
  const mediaG = Math.max(0.02, totG / n);
  const mediaB = Math.max(0.02, totB / n);
  const mediaY = 0.299 * mediaR + 0.587 * mediaG + 0.114 * mediaB;

  const planoL = new Float64Array(N_CELDAS);
  const planoU = new Float64Array(N_CELDAS);
  const planoV = new Float64Array(N_CELDAS);
  for (let c = 0; c < N_CELDAS; c++) {
    const k = Math.max(1, cuenta[c]);
    const r = sumaR[c] / k / mediaR;
    const g = sumaG[c] / k / mediaG;
    const b = sumaB[c] / k / mediaB;
    const L = clamp(0.299 * r + 0.587 * g + 0.114 * b, 0, 3);
    planoL[c] = L;
    planoU[c] = clamp(b - L, -2, 2);
    planoV[c] = clamp(r - L, -2, 2);
  }
  const sL = suavizarPlano(planoL);
  const sU = suavizarPlano(planoU);
  const sV = suavizarPlano(planoV);

  const firma = new Uint8Array(LARGO_FIRMA);
  for (let c = 0; c < N_CELDAS; c++) {
    firma[c] = Math.round((sL[c] / 3) * 255);
    firma[N_CELDAS + c] = Math.round(((sU[c] + 2) / 4) * 255);
    firma[2 * N_CELDAS + c] = Math.round(((sV[c] + 2) / 4) * 255);
  }

  // Histograma de tonos
  const hist = new Float64Array(N_HIST);
  for (let i = 0; i < width * height * 4; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const sat = max === 0 ? 0 : delta / max;
    if (sat > 0.25 && max > 0.15) {
      let h;
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h = (h * 60 + 360) % 360;
      hist[Math.min(BINS_TONO - 1, Math.floor((h / 360) * BINS_TONO))]++;
    } else {
      const rel = max / mediaY;
      hist[BINS_TONO + (rel < 0.5 ? 0 : rel < 1.3 ? 1 : 2)]++;
    }
  }
  for (let k = 0; k < N_HIST; k++) {
    firma[BASE_HIST + k] = Math.round((hist[k] / n) * 255);
  }

  return firma;
}

// Distancia de color entre dos firmas con la grilla de la segunda corrida (dx, dy) celdas
function distanciaConDesplazamiento(a, b, dx, dy) {
  let suma = 0;
  let cant = 0;
  for (let cy = 0; cy < GY; cy++) {
    const by = cy + dy;
    if (by < 0 || by >= GY) continue;
    for (let cx = 0; cx < GX; cx++) {
      const bx = cx + dx;
      if (bx < 0 || bx >= GX) continue;
      const ia = cy * GX + cx;
      const ib = by * GX + bx;
      const dL = ((a[ia] - b[ib]) / 255) * 3;
      const dU = ((a[N_CELDAS + ia] - b[N_CELDAS + ib]) / 255) * 4;
      const dV = ((a[2 * N_CELDAS + ia] - b[2 * N_CELDAS + ib]) / 255) * 4;
      suma += 0.4 * dL * dL + dU * dU + dV * dV;
      cant++;
    }
  }
  return { dist: Math.sqrt(suma / Math.max(1, cant)), cant };
}

// Concordancia de gradientes (hacia dónde se aclara/oscurece) con el corrimiento dado
function concordanciaGradientes(a, b, dx, dy) {
  const signo = (d) => (d > ZONA_MUERTA_GRADIENTE ? 1 : d < -ZONA_MUERTA_GRADIENTE ? -1 : 0);
  let iguales = 0;
  let total = 0;
  for (let cy = 0; cy < GY - 1; cy++) {
    const by = cy + dy;
    if (by < 0 || by + 1 >= GY) continue;
    for (let cx = 0; cx < GX - 1; cx++) {
      const bx = cx + dx;
      if (bx < 0 || bx + 1 >= GX) continue;
      const ia = cy * GX + cx;
      const ib = by * GX + bx;
      const ah = signo(a[ia + 1] - a[ia]);
      const av = signo(a[ia + GX] - a[ia]);
      const bh = signo(b[ib + 1] - b[ib]);
      const bv = signo(b[ib + GX] - b[ib]);
      if (ah === bh) iguales++;
      if (av === bv) iguales++;
      total += 2;
    }
  }
  return total ? iguales / total : 0;
}

/**
 * Parecido entre dos firmas. Devuelve un número entre 0 (nada que ver)
 * y 1 (imagen prácticamente idéntica).
 */
export function similitud(a, b) {
  if (!a || !b || a.length !== LARGO_FIRMA || b.length !== LARGO_FIRMA) return 0;

  // 1. Disposición de colores: se busca el mejor encaje tolerando corrimientos chicos
  let mejor = null;
  for (let dy = -MAX_DESPL_Y; dy <= MAX_DESPL_Y; dy++) {
    for (let dx = -MAX_DESPL_X; dx <= MAX_DESPL_X; dx++) {
      const { dist, cant } = distanciaConDesplazamiento(a, b, dx, dy);
      if (cant < N_CELDAS * 0.5) continue; // demasiado poca superficie en común
      const efectiva = dist * (1 + PENALIZACION_DESPLAZAMIENTO * (Math.abs(dx) + Math.abs(dy)));
      if (!mejor || efectiva < mejor.efectiva) mejor = { efectiva, dx, dy };
    }
  }
  const simDisposicion = Math.exp(-mejor.efectiva / ESCALA_DISTANCIA);

  // 2. Histograma de tonos (intersección)
  let inter = 0;
  let sa = 0;
  let sb = 0;
  for (let k = 0; k < N_HIST; k++) {
    inter += Math.min(a[BASE_HIST + k], b[BASE_HIST + k]);
    sa += a[BASE_HIST + k];
    sb += b[BASE_HIST + k];
  }
  const simTonos = inter / Math.max(1, sa, sb);

  // 3. Gradientes (con el mismo corrimiento del mejor encaje)
  const simGrad = concordanciaGradientes(a, b, mejor.dx, mejor.dy);

  const cruda =
    PESO_DISPOSICION * simDisposicion +
    PESO_TONOS * simTonos +
    PESO_GRADIENTES * simGrad;

  return clamp((cruda - PISO_SIMILITUD) / (1 - PISO_SIMILITUD), 0, 1);
}

/* ---- (de)serialización para guardar la firma en Firebase como texto ---- */

export function serializarFirma(firma) {
  let hex = "";
  for (let i = 0; i < firma.length; i++) hex += firma[i].toString(16).padStart(2, "0");
  return `${VERSION_FIRMA}:${hex}`;
}

/** Devuelve la firma, o null si el texto es inválido o de otra versión */
export function deserializarFirma(texto) {
  if (typeof texto !== "string") return null;
  const [version, hex] = texto.split(":");
  if (Number(version) !== VERSION_FIRMA || !hex || hex.length !== LARGO_FIRMA * 2) return null;
  const firma = new Uint8Array(LARGO_FIRMA);
  for (let i = 0; i < LARGO_FIRMA; i++) {
    const v = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(v)) return null;
    firma[i] = v;
  }
  return firma;
}

/* ------------------------------------------------------------------ */
/*  AYUDAS DE CANVAS (solo navegador)                                  */
/* ------------------------------------------------------------------ */

/**
 * Copia al canvas la zona central de la fuente (video, imagen o canvas),
 * con las mismas proporciones que el marco verde (vertical) del reconocedor.
 */
export function recortarCentro(fuente, ancho, alto, canvas) {
  const { sx, sy, rw, rh } = geometriaRecorte(ancho, alto);
  canvas.width = Math.max(1, Math.round(rw));
  canvas.height = Math.max(1, Math.round(rh));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(fuente, sx, sy, rw, rh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Reduce de a mitades para promediar bien los píxeles (evita "aliasing")
function reducirCanvas(origen, anchoFinal, altoFinal) {
  let actual = origen;
  while (actual.width > anchoFinal * 2 || actual.height > altoFinal * 2) {
    const siguiente = document.createElement("canvas");
    siguiente.width = Math.max(anchoFinal, Math.ceil(actual.width / 2));
    siguiente.height = Math.max(altoFinal, Math.ceil(actual.height / 2));
    const ctx = siguiente.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(actual, 0, 0, siguiente.width, siguiente.height);
    actual = siguiente;
  }
  const final = document.createElement("canvas");
  final.width = anchoFinal;
  final.height = altoFinal;
  const ctx = final.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(actual, 0, 0, anchoFinal, altoFinal);
  return final;
}

/** Firma visual de un canvas que ya contiene el recorte central */
export function firmaDesdeCanvas(canvasRecorte) {
  const chico = reducirCanvas(canvasRecorte, MUESTRA_ANCHO, MUESTRA_ALTO);
  const ctx = chico.getContext("2d", { willReadFrequently: true });
  return calcularFirma(ctx.getImageData(0, 0, MUESTRA_ANCHO, MUESTRA_ALTO));
}

/** Foto liviana (JPEG en base64) para guardar como referencia visual */
export function canvasAJpeg(canvas, maxLado = 560, calidad = 0.7) {
  const escala = Math.min(1, maxLado / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * escala));
  const h = Math.max(1, Math.round(canvas.height * escala));
  const chico = reducirCanvas(canvas, w, h);
  return chico.toDataURL("image/jpeg", calidad);
}

/** Carga un archivo de imagen (galería) como elemento <img> */
export function cargarImagenArchivo(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };
    img.src = url;
  });
}

/**
 * Pasa una imagen cualquiera (galería) a un canvas conservando su orientación
 * (máx. 1280 px), para que se comporte como un cuadro de la cámara en vivo.
 */
export function imagenACanvas(img) {
  const MAX = 1280;
  const escala = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
  canvas.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Firma visual de una foto guardada (data URL), usando el mismo recorte que en vivo */
export function firmaDesdeDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cuadro = imagenACanvas(img);
        const recorte = recortarCentro(cuadro, cuadro.width, cuadro.height, document.createElement("canvas"));
        resolve(firmaDesdeCanvas(recorte));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("La foto guardada no se pudo leer."));
    img.src = dataUrl;
  });
}
