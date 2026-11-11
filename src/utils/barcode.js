/**
 * Generador de códigos de barras en SVG (sin dependencias).
 * - EAN-13 si el código tiene 13 dígitos válidos.
 * - Code 128 para cualquier otro código.
 */

// ---------- EAN-13 ----------
const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const PARIDAD = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

const checkEAN13 = (c) => {
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(c[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (s % 10)) % 10 === Number(c[12]);
};

const modulosEAN13 = (c) => {
  const par = PARIDAD[Number(c[0])];
  let m = "101";
  for (let i = 0; i < 6; i++) m += (par[i] === "L" ? L : G)[Number(c[i + 1])];
  m += "01010";
  for (let i = 0; i < 6; i++) m += R[Number(c[i + 7])];
  return m + "101";
};

// ---------- Code 128 (set B) ----------
const C128 = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232",
];
const C128_STOP = "2331112";

const modulosCode128 = (texto) => {
  const valores = [104]; // Start B
  for (const ch of texto) {
    const v = ch.charCodeAt(0) - 32;
    if (v < 0 || v > 94) throw new Error("Carácter no soportado: " + ch);
    valores.push(v);
  }
  let suma = valores[0];
  for (let i = 1; i < valores.length; i++) suma += valores[i] * i;
  valores.push(suma % 103);

  const anchos = valores.map((v) => C128[v]).join("") + C128_STOP;
  let m = "";
  let barra = true;
  for (const a of anchos) {
    m += (barra ? "1" : "0").repeat(Number(a));
    barra = !barra;
  }
  return m;
};

/**
 * Devuelve el código SVG (string) del código de barras, o "" si no hay código.
 * El SVG se escala al contenedor (width/height 100%).
 */
export function codigoBarrasSVG(codigo) {
  const c = String(codigo ?? "").trim();
  if (!c) return "";

  let modulos;
  try {
    modulos =
      /^\d{13}$/.test(c) && checkEAN13(c) ? modulosEAN13(c) : modulosCode128(c);
  } catch {
    return "";
  }

  // Zona de silencio de 10 módulos a cada lado
  const quiet = 10;
  const total = modulos.length + quiet * 2;
  let barras = "";
  let i = 0;
  while (i < modulos.length) {
    if (modulos[i] === "1") {
      let j = i;
      while (j < modulos.length && modulos[j] === "1") j++;
      barras += `<rect x="${i + quiet}" y="0" width="${j - i}" height="100"/>`;
      i = j;
    } else i++;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} 100" preserveAspectRatio="none" width="100%" height="100%" shape-rendering="crispEdges"><g fill="#000">${barras}</g></svg>`;
}
