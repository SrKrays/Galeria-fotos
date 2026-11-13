/**
 * fotos.js — fotos de MUESTRA (pasos 4 a 6). En el paso 7 esto lo entrega la API.
 *
 *   marco     id de src/marcos/index.js
 *   aspecto   ancho / alto de la imagen
 *   gancho    frase corta de la placa: tiene que dar ganas de leer la historia
 *   muestra   true = foto y texto inventados, solo para ver el diseño
 *   credito   texto del pie del relato (por defecto: "Fotografía de Antonio Carrizo")
 */
export const WHATSAPP = '5493517680806';

export const fotos = [
  {
    id: 'tres-manos-del-papa',
    codigo: 'AC-0001',
    titulo: 'Las tres manos del Papa',
    anio: 1987,
    lugar: 'Córdoba',
    gancho: 'Mirá bien: ¿cuántas manos ves?',
    marco: 'dorado',
    src: '/fotos/papa.webp',
    aspecto: 0.931,
    alt: 'Juan Pablo II en el balcón del Arzobispado de Córdoba: bendice con una mano en alto mientras otra mano sostiene un megáfono frente a él.',
    // Datos reales, con fuentes en docs/investigacion-fotos.md. Confirmar el día con Antonio.
    relato: [
      'El 8 de abril de 1987, Juan Pablo II salió al balcón del Arzobispado de Córdoba a bendecir a la multitud. Antonio tenía 31 años, era de los fotógrafos más jóvenes de La Voz del Interior y lo esperaba con la cámara lista y una lente de largo alcance.',
      'Para que la gente lo escuchara, una colaboradora le sostenía un megáfono. Desde donde estaba Antonio, esa mano quedó justo en línea con el cuerpo del Papa. El resultado: un Papa que bendice con una mano en alto y, a la vez, parece sostener el megáfono con una mano de más.',
      'Era fotografía de rollo. No había pantalla donde revisar la toma. Antonio se enteró de lo que había sacado recién en la redacción, cuando reveló los negativos.',
      'La imagen se volvió la postal de aquella visita. A algunos les causa gracia; otros leen un mensaje en esa tercera mano que bendice. En noviembre de 2026, treinta y nueve años después, Antonio volvió al mismo lugar con su hijo Aldo, también fotógrafo, para retratar a otro Papa. Él lo dice simple: hay fotos que no se repiten.',
    ],
  },
  {
    id: 'cordoba-de-ayer',
    codigo: 'AC-0002',
    titulo: 'Córdoba de Ayer',
    anio: 1983,
    lugar: 'Córdoba',
    gancho: 'Una ciudad con historia',
    marco: 'negro',
    src: '/fotos/calle.webp',
    aspecto: 0.63,
    alt: 'Calle del centro de Córdoba con una iglesia de torre alta, en tonos sepia.',
    muestra: true,
    relato: [
      'Texto de ejemplo. Una mañana de domingo, con el centro todavía vacío, la ciudad se deja mirar distinto: las torres, los árboles y una calle que parece esperar a alguien.',
      'Acá va el relato real de Antonio: qué hacía ahí, por qué frenó en esa esquina y qué pasó un segundo después del disparo.',
    ],
  },
  {
    id: 'la-plaza',
    codigo: 'AC-0003',
    titulo: 'La Plaza',
    anio: 1986,
    lugar: 'Buenos Aires',
    gancho: 'Un pueblo, una voz',
    marco: 'madera',
    src: '/fotos/plaza.webp',
    aspecto: 1.544,
    alt: 'Multitud llenando una avenida con el Obelisco al fondo.',
    muestra: true,
    relato: [
      'Texto de ejemplo. Hay días en que una ciudad entera cabe en una sola foto. Para sacarla hubo que subir, esperar y aguantar la respiración.',
      'Acá va el relato real de Antonio: desde dónde la tomó, cuánta gente había y qué se escuchaba en ese momento.',
    ],
  },
  {
    id: 'el-mono',
    codigo: 'AC-0004',
    titulo: 'El Mono',
    anio: 2026,
    lugar: 'Córdoba',
    gancho: 'El hombre detrás de la cámara',
    marco: 'plateado',
    src: '/fotos/antonio.webp',
    aspecto: 0.748,
    alt: 'Antonio Carrizo sonríe frente al Arzobispado de Córdoba mientras sostiene una copia de su foto de Juan Pablo II.',
    // Texto de homenaje, borrador de la familia: editarlo a gusto.
    credito: 'Retrato familiar',
    relato: [
      'Antonio Carrizo, el Mono, frente al Arzobispado de Córdoba, con la foto que sacó en ese mismo lugar treinta y nueve años antes.',
      'Pasó la vida del otro lado de la cámara: reportero gráfico, jefe de Fotografía de La Voz del Interior, testigo de una Córdoba que cambiaba delante de su lente. Esta vez le tocó posar a él.',
      'Los diarios hablan del fotógrafo. En casa es otra cosa: un gran hombre y un abuelo de los que enseñan a mirar. Esta galería es para él.',
    ],
  },
  {
    id: 'el-gigante-de-alberdi',
    codigo: 'AC-0005',
    titulo: 'El Gigante de Alberdi',
    anio: 1978,
    lugar: 'Córdoba',
    gancho: 'Una pasión eterna',
    marco: 'dorado',
    src: '/fotos/estadio.webp',
    aspecto: 1.252,
    alt: 'Estadio de fútbol repleto visto desde lo alto de una tribuna.',
    muestra: true,
    relato: [
      'Texto de ejemplo. La cancha llena, el partido por empezar y un fotógrafo que en vez de mirar la pelota mira a la gente.',
      'Acá va el relato real de Antonio: qué partido era, cómo llegó hasta ese lugar de la tribuna y qué recuerda del ruido.',
    ],
  },
  {
    id: 'el-hombre',
    codigo: 'AC-0006',
    titulo: 'El Hombre',
    anio: 1992,
    lugar: 'Córdoba',
    gancho: 'Historias en la mirada',
    marco: 'plateado',
    src: '/fotos/hombre.webp',
    aspecto: 0.676,
    alt: 'Retrato de perfil de un hombre mayor con boina, en blanco y negro.',
    muestra: true,
    relato: [
      'Texto de ejemplo. No posó. Estaba ahí, en medio de la calle, pensando en otra cosa, y eso es lo que quedó en la foto.',
      'Acá va el relato real de Antonio: quién era, si llegaron a hablar y por qué esta imagen lo acompaña desde entonces.',
    ],
  },
];
