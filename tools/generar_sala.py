#!/usr/bin/env python3
"""
generar_sala.py — Galería Antonio Carrizo (VinPath)

Genera, a partir de la imagen de la sala SIN cuadros, los dos recursos que
carga la escena de Pixi ("carga todo junto"), más los datos de geometría.

La pared se desliza, así que la base se convierte en un MOSAICO que se repite
sin costura en horizontal: se recorta de foco 1 a foco 3 (dos módulos de foco)
y se funde el borde con la franja equivalente del otro extremo. La galería
puede tener así la cantidad de cuadros que haga falta.

  frontend/public/sala/sala-base.webp        imagen base, máxima calidad
  frontend/public/sala/sala-base-movil.webp  imagen base liviana (celulares)
  frontend/public/sala/sala-respaldo.jpg     imagen estática si no hay WebGL
  frontend/public/sala/sala-mascaras.webp    máscaras, UNA sola textura (sin pérdida)
  frontend/src/pixi/salaMeta.json            focos, zócalo y piso (coordenadas 0..1)
  docs/verificacion-sala.png                 lámina para comparar con la referencia

Canales de la textura de máscaras:
  R  conos de luz    cuánta luz de foco recibe cada punto de la pared (0..1)
  G  piso            1 = piso reflectante, 0 = pared y zócalo (borde suavizado)
  B  vidrio          perfil del reflejo diagonal del vidrio, en espacio
                     normalizado del cuadro (los cuadros son HTML y se mueven,
                     así que el shader lo muestrea con las coordenadas de cada uno)

Uso (desde la raíz del proyecto):
    python tools/generar_sala.py
    python tools/generar_sala.py --limpia referencias/otra-sala.png

Requiere: Python 3.9+, Pillow y numpy  ->  pip install pillow numpy
Nada es manual: zócalo y focos se detectan solos. Si cambiás la imagen de la
sala, corré el script de nuevo y todo se regenera.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent

# ───────────── valores de ajuste del generador ─────────────
ANCHO_MOVIL = 960          # px de la base liviana
ANCHO_RESPALDO = 1280      # px del JPG de respaldo
CALIDAD_ALTA = 92          # WebP base
CALIDAD_MOVIL = 80
UMBRAL_FOCO = 0.60         # luminancia mínima para considerar "lámpara"
FRANJA_FOCOS = 0.12        # fracción superior donde se buscan los focos
DESENFOQUE_CONO = 1 / 110  # radio del blur del cono, relativo al ancho
GAMMA_CONO = 0.80          # <1 abre el cono, >1 lo cierra
PLUMA_PISO = 2.0           # px de suavizado del borde zócalo/piso
# reflejo del vidrio: (centro, ancho, fuerza) sobre la diagonal 0..1
FUNDIDO_MOSAICO = 110      # px de fundido en la costura del mosaico
BANDAS_VIDRIO = [(0.42, 0.050, 1.00), (0.535, 0.013, 0.60), (0.31, 0.008, 0.25)]


def luminancia(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722])


def suavizar_1d(v, radio):
    k = np.exp(-0.5 * (np.arange(-3 * radio, 3 * radio + 1) / radio) ** 2)
    return np.convolve(v, k / k.sum(), mode="same")


def detectar_zocalo(L):
    """Devuelve (fila donde empieza el zócalo, fila donde empieza el piso)."""
    alto = L.shape[0]
    medias = L.mean(axis=1)
    y0 = int(alto * 0.6)
    salto = medias[y0 + 3:alto - 3] - medias[y0:alto - 6]
    piso = y0 + 3 + int(np.argmax(salto))            # mayor salto oscuro -> claro
    while medias[piso - 1] > medias[piso] * 0.5:     # afinar al primer renglón claro
        piso -= 1
    pared = np.median(medias[piso - 80:piso - 30])
    zocalo = piso - 1
    while zocalo > 0 and medias[zocalo - 1] < pared * 0.6:
        zocalo -= 1
    return zocalo, piso


def detectar_focos(L):
    """Devuelve [(x, y)] en píxeles, de izquierda a derecha."""
    alto, ancho = L.shape
    franja = L[: int(alto * FRANJA_FOCOS)]
    perfil = suavizar_1d(franja.max(axis=0), 6)
    sep = ancho // 10
    focos = []
    for x in range(ancho):
        a, b = max(0, x - sep), min(ancho, x + sep + 1)
        if perfil[x] >= UMBRAL_FOCO and perfil[x] == perfil[a:b].max():
            if focos and x - focos[-1][0] < sep:
                continue
            x0 = max(0, x - 30)
            ventana = franja[:, x0:x + 31]
            # la lámpara es lo más brillante; así no se confunde con la pared iluminada
            ys, xs = np.nonzero(ventana >= ventana.max() * 0.97)
            focos.append((x0 + float(xs.mean()), float(ys.mean())))
    return focos


def hacer_mosaico(rgb, focos):
    """Recorta un período exacto (foco 1 -> foco último) y funde la costura.

    Devuelve (mosaico uint8, x de inicio del recorte). El fundido mezcla puntos
    que están a la MISMA distancia de su foco, así la luz no cambia: solo se
    cruza la textura del yeso.
    """
    ancho = rgb.shape[1]
    periodo = int(round(focos[-1][0] - focos[0][0]))
    sobra = ancho - periodo                      # px disponibles fuera del período
    f = min(FUNDIDO_MOSAICO, sobra)
    inicio = sobra - f                           # la costura cae lejos del eje del foco
    tesela = rgb[:, inicio:inicio + periodo].astype(float)
    cola = rgb[:, inicio + periodo:inicio + periodo + f].astype(float)
    t = np.linspace(0, 1, f)[None, :, None]
    t = t * t * (3 - 2 * t)
    tesela[:, :f] = cola * (1 - t) + tesela[:, :f] * t
    return (tesela + 0.5).astype(np.uint8), inicio


def mascara_conos(L, zocalo):
    alto, ancho = L.shape
    radio = ancho * DESENFOQUE_CONO
    borde = int(radio * 4)
    Lw = np.hstack([L[:, -borde:], L, L[:, :borde]])   # el blur también es sin costura
    img = Image.fromarray((np.clip(Lw, 0, 1) * 255).astype(np.uint8))
    blur = np.asarray(img.filter(ImageFilter.GaussianBlur(radio)), float)[:, borde:-borde] / 255
    pared = blur[:zocalo]
    ambiente = np.percentile(pared, 30)
    tope = np.percentile(pared, 99.7)
    r = np.clip((blur - ambiente) / (tope - ambiente), 0, 1) ** GAMMA_CONO
    # la luz del foco muere antes del zócalo: nunca invade el piso
    y = np.arange(alto)[:, None]
    r *= np.clip((zocalo - y) / 10.0, 0, 1)
    return r


def mascara_piso(alto, ancho, piso):
    y = np.arange(alto)[:, None] + 0.5
    g = np.clip((y - piso) / PLUMA_PISO, 0, 1)
    return np.repeat(g, ancho, axis=1)


def mascara_vidrio(alto, ancho):
    v, u = np.mgrid[0:alto, 0:ancho]
    u = (u + 0.5) / ancho
    v = (v + 0.5) / alto
    d = (u + v) / 2                       # diagonal: 0 arriba-izq, 1 abajo-der
    b = np.zeros_like(d)
    for centro, anchura, fuerza in BANDAS_VIDRIO:
        b += fuerza * np.exp(-0.5 * ((d - centro) / anchura) ** 2)
    # el perfil es constante a lo largo de la diagonal: el shader lo lee en (d, d)
    # y le aplica la caída vertical, así el reflejo puede correrse sin cortes
    return np.clip(b, 0, 1)


def lamina_verificacion(base, masc, referencia, focos, zocalo, piso, destino):
    w = 1100
    def esc(im):
        return im.convert("RGB").resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    k = w / base.width
    marcada = esc(base)
    d = ImageDraw.Draw(marcada)
    d.line([(0, zocalo * k), (w, zocalo * k)], fill=(0, 255, 255))
    d.line([(0, piso * k), (w, piso * k)], fill=(0, 255, 0))
    for x, y in focos:
        d.ellipse([x * k - 9, y * k - 9, x * k + 9, y * k + 9], outline=(255, 0, 255), width=2)
        d.line([(x * k, 0), (x * k, marcada.height)], fill=(255, 0, 255))
    m = np.asarray(masc, float) / 255
    canales = [esc(Image.fromarray((m[..., i] * 255).astype(np.uint8))) for i in range(3)]
    paneles = [("1. BASE en mosaico (2 repeticiones, la costura no debe verse)", esc(base)),
               ("2. Deteccion: focos (magenta), zocalo (cian), piso (verde)", marcada),
               ("3. Mascara R: conos de luz", canales[0]),
               ("4. Mascara G: piso reflectante", canales[1]),
               ("5. Mascara B: perfil del reflejo del vidrio", canales[2])]
    if referencia is not None:
        paneles.insert(0, ("0. REFERENCIA (meta)", esc(referencia)))
    cols = 2
    filas = -(-len(paneles) // cols)
    ph = max(p.height for _, p in paneles) + 26
    hoja = Image.new("RGB", (cols * (w + 12) + 12, filas * (ph + 12) + 12), (24, 24, 24))
    dd = ImageDraw.Draw(hoja)
    for i, (titulo, p) in enumerate(paneles):
        x = 12 + (i % cols) * (w + 12)
        y = 12 + (i // cols) * (ph + 12)
        dd.text((x, y + 4), titulo, fill=(235, 220, 180))
        hoja.paste(p, (x, y + 26))
    hoja.save(destino)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limpia", default=RAIZ / "referencias/sala-limpia.png", type=Path)
    ap.add_argument("--referencia", default=RAIZ / "referencias/sala-referencia.png", type=Path)
    args = ap.parse_args()

    sala = RAIZ / "frontend/public/sala"
    sala.mkdir(parents=True, exist_ok=True)
    (RAIZ / "frontend/src/pixi").mkdir(parents=True, exist_ok=True)
    (RAIZ / "docs").mkdir(exist_ok=True)

    original = Image.open(args.limpia).convert("RGB")
    rgb = np.asarray(original)
    L0 = luminancia(rgb / 255)
    zocalo, piso = detectar_zocalo(L0)
    focos0 = detectar_focos(L0)

    tesela, inicio = hacer_mosaico(rgb, focos0)
    base = Image.fromarray(tesela, "RGB")
    ancho, alto = base.size
    L = luminancia(tesela / 255)
    # focos dentro del mosaico (el último coincide con el primero: se descarta)
    focos = sorted(((x - inicio) % ancho, y) for x, y in focos0[:-1])

    # 1) imagen base (tres pesos)
    base.save(sala / "sala-base.webp", quality=CALIDAD_ALTA, method=6)
    ancho_movil = round(ANCHO_MOVIL * ancho / original.width)
    movil = base.resize((ancho_movil, round(ancho_movil * alto / ancho)), Image.LANCZOS)
    movil.save(sala / "sala-base-movil.webp", quality=CALIDAD_MOVIL, method=6)
    resp = original.resize((ANCHO_RESPALDO, round(ANCHO_RESPALDO * original.height / original.width)), Image.LANCZOS)
    resp.save(sala / "sala-respaldo.jpg", quality=84, optimize=True, progressive=True)

    # 2) máscaras en una sola textura
    canales = np.dstack([mascara_conos(L, zocalo),
                         mascara_piso(alto, ancho, piso),
                         mascara_vidrio(alto, ancho)])
    masc = Image.fromarray((canales * 255 + 0.5).astype(np.uint8), "RGB")
    masc.save(sala / "sala-mascaras.webp", lossless=True, method=6)

    # 3) geometría para los shaders (0..1, origen arriba-izquierda)
    meta = {
        "_": "Generado por tools/generar_sala.py — no editar a mano.",
        "ancho": ancho, "alto": alto, "aspecto": round(ancho / alto, 5),
        "zocaloY": round(zocalo / alto, 5),
        "pisoY": round(piso / alto, 5),
        "mosaico": True,
        "separacionFocos": round(1 / len(focos), 5),
        "focos": [{"x": round(x / ancho, 5), "y": round(y / alto, 5)} for x, y in focos],
    }
    (RAIZ / "frontend/src/pixi/salaMeta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    # 4) verificación
    ref = Image.open(args.referencia) if Path(args.referencia).exists() else None
    doble = Image.new("RGB", (ancho * 2, alto))            # dos teselas juntas: la costura debe ser invisible
    doble.paste(base, (0, 0)); doble.paste(base, (ancho, 0))
    lamina_verificacion(doble, masc, ref, focos + [(x + ancho, y) for x, y in focos], zocalo, piso,
                        RAIZ / "docs/verificacion-sala.png")

    print(f"Mosaico {ancho}x{alto} (recorte desde x={inicio}) | zócalo y={zocalo} | piso y={piso} | focos x={[round(f[0]) for f in focos]}")
    for f in sorted(sala.iterdir()):
        print(f"  {f.relative_to(RAIZ)}  {f.stat().st_size / 1024:.0f} KB")
    if ref is not None:
        # coincidencia base vs referencia en zonas sin cuadros (franja de focos y piso)
        a = np.asarray(original.resize((480, 270), Image.LANCZOS), float)
        b = np.asarray(ref.convert("RGB").resize((480, 270), Image.LANCZOS), float)
        zy = round(piso / alto * 270)
        ty = round(0.085 * 270)
        print(f"Diferencia media con la referencia (0-255): focos {np.abs(a[:ty] - b[:ty]).mean():.1f} | "
              f"piso {np.abs(a[zy:] - b[zy:]).mean():.1f}")


if __name__ == "__main__":
    main()
