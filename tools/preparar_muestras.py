#!/usr/bin/env python3
"""
preparar_muestras.py — arma las fotos de MUESTRA de la galería (paso 4).

Son provisorias: sirven para ver los marcos mientras no están las fotos
originales de Antonio. Cuando exista el panel de administración (paso 7)
las fotos reales se suben desde ahí y esta carpeta deja de usarse.

  · papa      recorte de referencias/muestra-papa.png (sin la franja del medio
              que la publicó ni el texto sobreimpreso). REEMPLAZAR por el original.
  · antonio   referencias/muestra-antonio-con-foto.png, entera.
  · estadio, calle, plaza, hombre: recortes de las fotos inventadas que trae
              la imagen de referencia de la sala.

Uso:  python tools/preparar_muestras.py      (requiere Pillow)
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
REF = RAIZ / "referencias"
SALIDA = RAIZ / "frontend/public/fotos"

# nombre: (archivo, caja de recorte x0,y0,x1,y1 o None)
MUESTRAS = {
    "papa":    ("muestra-papa.png", (0, 92, 335, 452)),
    "antonio": ("muestra-antonio-con-foto.png", None),
    "estadio": ("sala-referencia.png", (150, 277, 453, 519)),
    "calle":   ("sala-referencia.png", (601, 270, 761, 524)),
    "plaza":   ("sala-referencia.png", (908, 308, 1223, 512)),
    "hombre":  ("sala-referencia.png", (1357, 278, 1522, 522)),
}

def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, (archivo, caja) in MUESTRAS.items():
        img = Image.open(REF / archivo).convert("RGB")
        if caja:
            img = img.crop(caja)
        img.save(SALIDA / f"{nombre}.webp", quality=90, method=6)
        print(f"{nombre}.webp  {img.width}x{img.height}  aspecto {img.width / img.height:.3f}")

if __name__ == "__main__":
    main()
