// ============================================================
// OperadorPro - Contenido de cursos
// 3 cursos MVP: Carta Porte, NOM-087, Protocolo de accidente
// Cada curso: lecciones (HTML) + examen de 10 reactivos (aprueba con 8)
// NOTA LEGAL: contenido de referencia. Verificar siempre el texto
// vigente de las NOM y reglas del SAT antes de publicar a producción.
// ============================================================

const COURSES = [
  {
    id: "carta-porte",
    title: "Carta Porte sin errores",
    badge: "CP",
    color: "#05603A",
    desc: "Domina el complemento Carta Porte del SAT: qué revisar antes de salir, qué mostrar en una verificación y cómo evitar que un error documental detenga tu viaje.",
    duracion: "≈ 50 min",
    lessons: [
      {
        id: "cp-1",
        title: "Qué es la Carta Porte y quién la emite",
        html: `
          <p>El <strong>complemento Carta Porte</strong> es un anexo al CFDI (factura electrónica) exigido por el SAT para acreditar el traslado legal de mercancías por territorio nacional, especialmente en <strong>tramos de jurisdicción federal</strong>: carreteras federales, autopistas y cruces entre estados.</p>
          <p>Puntos que todo operador debe tener claros:</p>
          <ul>
            <li><strong>Quién lo emite:</strong> el transportista (tu empresa o tú, si eres hombre-camión con tus propios permisos) cuando cobra por el flete, mediante un <em>CFDI de Ingreso</em> con complemento Carta Porte. Si el dueño de la mercancía la mueve con su propia flota, emite un <em>CFDI de Traslado</em> con el complemento.</li>
            <li><strong>Tú no lo generas, pero tú respondes en el camino.</strong> El documento lo timbra el área administrativa; el que lo presenta ante la autoridad en carretera eres tú. Un error que administración no vio se convierte en tu problema en el retén.</li>
            <li><strong>El documento ampara el viaje completo:</strong> mercancía, ruta, unidad, remolques y operador. Si algo de eso cambia (te cambian de caja, de tracto o de ruta), la Carta Porte debe reflejarlo.</li>
          </ul>
          <p class="tip">Regla de oro: <strong>si lo que traes cargado, la unidad que manejas o la ruta que sigues no coinciden con el papel, el viaje está en riesgo.</strong> Detecta la diferencia antes que el verificador.</p>
        `
      },
      {
        id: "cp-2",
        title: "Los datos que TÚ debes revisar antes de arrancar",
        html: `
          <p>Antes de mover la unidad, dedica 5 minutos a este checklist sobre la representación de la Carta Porte que te entreguen:</p>
          <ol>
            <li><strong>Tus datos como operador:</strong> nombre completo, RFC (o CURP en su caso) y <strong>número de licencia federal vigente</strong>. Una licencia vencida o mal capturada invalida tu parte del documento.</li>
            <li><strong>La unidad:</strong> placas del tracto y de cada remolque, configuración vehicular (ej. T3S2, T3S2R4), número de permiso SICT. Verifica placa por placa contra la unidad física.</li>
            <li><strong>La mercancía:</strong> descripción y cantidades a grandes rasgos. No necesitas auditar la factura, pero si el papel dice "abarrotes" y traes acero, detén todo y llama a tu empresa.</li>
            <li><strong>Origen y destino:</strong> que coincidan con las instrucciones reales del viaje, incluyendo paradas intermedias si las hay.</li>
            <li><strong>Material peligroso:</strong> si aplica, debe indicarlo con su clave, y tú debes contar con la categoría de licencia correspondiente (E) y la unidad con sus autorizaciones.</li>
            <li><strong>El folio fiscal y el IdCCP:</strong> que el documento tenga folio fiscal (UUID) y el identificador del complemento. Sin timbrar no ampara nada: es solo un papel.</li>
          </ol>
          <p class="tip">Si la empresa te dice "luego te lo mandamos, arranca": <strong>no arranques en tramo federal sin el documento</strong>. La multa y la retención de la unidad ocurren donde tú estás, no donde está la oficina.</p>
        `
      },
      {
        id: "cp-3",
        title: "En la verificación: qué mostrar y cómo",
        html: `
          <p>En un punto de verificación (SAT, Guardia Nacional, SICT) te pueden pedir que acredites el traslado. Reglas prácticas:</p>
          <ul>
            <li><strong>Formato válido:</strong> puedes mostrar la representación <strong>impresa o digital</strong> (PDF en tu teléfono o tableta). Lo importante es que sea legible y contenga el folio fiscal y el código QR.</li>
            <li><strong>Ten un plan B sin señal:</strong> guarda el PDF descargado en el teléfono (no dependas de WhatsApp con señal) y de preferencia lleva una impresión. En muchos tramos federales no hay datos móviles.</li>
            <li><strong>Documentos compañeros:</strong> licencia federal vigente, tarjeta de circulación del tracto y remolques, póliza de seguro, y en su caso permisos de material peligroso o carga sobredimensionada. La Carta Porte no sustituye a los demás documentos.</li>
            <li><strong>Actitud en el punto:</strong> baja la ventanilla, entrega lo que te pidan, no discutas el criterio en el momento. Si el verificador señala una inconsistencia, pide que te la muestre en el documento, anótala y comunícala de inmediato a tu empresa. Tu trabajo es documentar, no litigar en la carretera.</li>
            <li><strong>Nunca entregues tu teléfono desbloqueado.</strong> Muestra tú el documento en pantalla; el aparato no sale de tu mano.</li>
          </ul>
          <p class="tip">Anota siempre: hora, kilómetro o caseta, corporación y número de unidad oficial. Ese registro vale oro si después hay una sanción que impugnar.</p>
        `
      },
      {
        id: "cp-4",
        title: "Errores comunes, sanciones y cómo protegerte",
        html: `
          <p>Los errores que más viajes detienen:</p>
          <ul>
            <li>Placas del remolque distintas a las capturadas (cambiaron la caja al último minuto).</li>
            <li>Operador distinto al registrado (relevo de operador no reportado).</li>
            <li>Licencia federal vencida o de categoría incorrecta para la configuración o la carga.</li>
            <li>Documento sin timbrar, ilegible o "en camino".</li>
            <li>Mercancía que no corresponde con la descripción.</li>
          </ul>
          <p><strong>Qué arriesga la empresa:</strong> multas fiscales que pueden llegar a decenas de miles de pesos por documento, y en traslados de comercio exterior la mercancía sin Carta Porte válida puede presumirse contrabando, con consecuencias mucho más graves.</p>
          <p><strong>Qué arriesgas tú:</strong> horas o días detenido con la unidad, señalamientos de la empresa, y en el peor escenario verte involucrado en una carpeta por mercancía irregular que tú no cargaste ni revisaste.</p>
          <p><strong>Cómo te proteges:</strong></p>
          <ol>
            <li>Haz el checklist de la lección 2 en <em>cada</em> viaje y consérvalo (una foto del documento y de tu unidad antes de salir es evidencia con fecha).</li>
            <li>Reporta por escrito (mensaje a tu empresa) cualquier inconsistencia que detectes; que quede constancia de que avisaste.</li>
            <li>Nunca aceptes transportar carga que no esté documentada "porque es un favor". El que la trae a bordo eres tú.</li>
          </ol>
          <p class="tip">Un operador que sabe leer una Carta Porte y detecta errores antes de salir le ahorra a la empresa multas y días de unidad parada. Eso es exactamente lo que este certificado acredita ante un reclutador.</p>
        `
      }
    ],
    quiz: [
      { q: "¿En qué tramos es exigible acreditar el traslado con el complemento Carta Porte?", options: ["Solo dentro de las ciudades", "En tramos de jurisdicción federal (carreteras federales y cruces entre estados)", "Solo en cruces fronterizos", "Únicamente en autopistas de cuota"], correct: 1 },
      { q: "Si el transportista cobra por el flete, el complemento Carta Porte se incorpora a un:", options: ["CFDI de Traslado", "CFDI de Nómina", "CFDI de Ingreso", "Recibo simple en papel"], correct: 2 },
      { q: "Te cambian el remolque al último minuto y las placas ya no coinciden con la Carta Porte. Lo correcto es:", options: ["Salir y explicar en el retén si preguntan", "No arrancar hasta que corrijan y retimbren el documento", "Tapar la placa del remolque", "Llevar las dos cajas anotadas a mano"], correct: 1 },
      { q: "¿En qué formato puedes mostrar la Carta Porte en una verificación?", options: ["Solo impresa con sello original", "Solo digital en la app del SAT", "Impresa o digital, siempre que sea legible y tenga folio fiscal y QR", "No es necesario mostrarla si llevas factura"], correct: 2 },
      { q: "¿Cuál de estos datos del OPERADOR debe estar correcto en la Carta Porte?", options: ["Su número de seguro social", "Su número de licencia federal vigente", "Su domicilio particular completo", "Su antigüedad en la empresa"], correct: 1 },
      { q: "Un documento de Carta Porte sin timbrar (sin folio fiscal/UUID):", options: ["Vale igual si trae el logo de la empresa", "Sirve como comprobante provisional por 72 horas", "No ampara el traslado: es solo un papel", "Solo sirve para carga ligera"], correct: 2 },
      { q: "En el punto de verificación, la mejor práctica con tu teléfono es:", options: ["Entregarlo desbloqueado para agilizar", "Mostrar tú el PDF en pantalla sin soltar el aparato", "Decir que no traes documentos digitales", "Mandar el PDF por WhatsApp al oficial"], correct: 1 },
      { q: "Detectas que el papel dice 'abarrotes' pero la carga es acero. ¿Qué haces?", options: ["Arrancas, porque la carga no es tu responsabilidad", "Detienes el viaje y avisas de inmediato a la empresa, por escrito", "Corriges el documento a mano", "Solo lo comentas al llegar al destino"], correct: 1 },
      { q: "¿Por qué conviene reportar por escrito las inconsistencias que detectes antes de salir?", options: ["Para que te paguen horas extra", "Porque queda constancia con fecha de que tú avisaste", "Porque lo exige la Guardia Nacional", "No conviene: es mejor no dejar rastro"], correct: 1 },
      { q: "En comercio exterior, mercancía trasladada sin Carta Porte válida puede:", options: ["Generar solo una llamada de atención", "Presumirse contrabando, con consecuencias graves", "Regularizarse pagando la caseta", "No tiene consecuencia si el chofer no es el dueño"], correct: 1 }
    ]
  },

  {
    id: "nom-087",
    title: "NOM-087: tiempos de conducción y descanso",
    badge: "087",
    color: "#B45309",
    desc: "Las reglas de horas de servicio del autotransporte federal: cuánto puedes conducir, cuándo debes parar, cómo se registra y qué pasa si un accidente ocurre con fatiga de por medio.",
    duracion: "≈ 45 min",
    lessons: [
      {
        id: "n87-1",
        title: "Por qué existe la norma y a quién aplica",
        html: `
          <p>La <strong>NOM-087-SCT-2-2017</strong> regula los <strong>tiempos de conducción y pausas</strong> de los conductores del autotransporte federal. Nació de una realidad que todo operador conoce: la <strong>fatiga</strong> es de las principales causas de accidentes graves en carretera, comparable en efectos a conducir con alcohol.</p>
          <ul>
            <li><strong>Aplica</strong> a conductores de vehículos de autotransporte federal de carga, pasaje y turismo en vías generales de comunicación (carreteras federales).</li>
            <li><strong>Obliga a dos partes:</strong> al operador, a respetar los tiempos; y al permisionario (la empresa), a programar los viajes de forma que puedan cumplirse. Una empresa que te asigna una ruta imposible sin violar la norma está incumpliendo ella también.</li>
            <li><strong>Importa aunque nadie te revise:</strong> más allá de la sanción, el registro de tus tiempos es tu <em>defensa</em> si hay un accidente: demuestra que tú operabas dentro de norma.</li>
          </ul>
          <p class="tip">Piensa en la norma como tu escudo laboral y penal, no como un estorbo: un operador dentro de tiempos tiene una posición legal completamente distinta tras un percance.</p>
        `
      },
      {
        id: "n87-2",
        title: "Las reglas: horas al volante y pausas",
        html: `
          <p>Las reglas centrales de tiempos que establece la norma para el autotransporte federal:</p>
          <ul>
            <li><strong>Conducción continua:</strong> después de un máximo de <strong>5 horas y media</strong> de conducción continua, debes hacer una <strong>pausa mínima de 30 minutos</strong>. La pausa puede fraccionarse dentro del periodo, pero el descanso debe ser efectivo (no es pausa seguir maniobrando o cargando).</li>
            <li><strong>Tope de conducción acumulada:</strong> el tiempo efectivo de conducción no debe exceder <strong>14 horas</strong>; alcanzado ese tope, corresponde un <strong>descanso mínimo de 8 horas consecutivas</strong> antes de volver al volante.</li>
            <li><strong>Doble tripulación:</strong> en servicios con dos operadores, los tiempos se controlan por operador: el que descansa en el camarote acumula descanso, el que conduce acumula conducción. El relevo no "resetea" tus horas, las pausa.</li>
          </ul>
          <p><strong>Ojo con la trampa mental común:</strong> el tope es de <em>conducción</em>, pero tu jornada laboral (LFT) incluye también cargas, esperas y maniobras. Puedes estar dentro de la NOM y aun así fuera de la jornada legal — ambos límites cuentan y ambos son exigibles.</p>
          <p class="tip">Verifica siempre la versión vigente de la norma y las políticas internas de tu empresa: algunas flotas serias operan con límites internos más estrictos que la NOM, y esos también te obligan por contrato.</p>
        `
      },
      {
        id: "n87-3",
        title: "La bitácora de horas de servicio",
        html: `
          <p>El cumplimiento se acredita con la <strong>bitácora de horas de servicio</strong>, que registra tus periodos de conducción, pausas y descansos.</p>
          <ul>
            <li><strong>Quién la lleva:</strong> tú la llenas, la empresa la conserva. Puede ser en formato físico o mediante sistemas electrónicos/GPS que registren los tiempos de la unidad.</li>
            <li><strong>Quién la puede revisar:</strong> la autoridad (SICT/Guardia Nacional en operativos) y los inspectores en verificación. También es documento clave en cualquier peritaje tras un accidente.</li>
            <li><strong>Cómo llenarla bien:</strong> registra la realidad, con horas de inicio y fin de cada periodo. Una bitácora "maquillada" que no coincide con el GPS de la unidad o con los tickets de casetas es peor que ninguna: acredita falsedad.</li>
            <li><strong>Guarda tu propio respaldo:</strong> una foto de tu bitácora al final de cada jornada crea tu archivo personal. Si un día la empresa y tú difieren sobre lo que pasó, tendrás tu evidencia.</li>
          </ul>
          <p class="tip">GPS de la unidad, tickets de caseta, cámaras de peaje y tu bitácora deben contar la misma historia. Cuando no coinciden, la autoridad cree en los datos electrónicos, no en el papel.</p>
        `
      },
      {
        id: "n87-4",
        title: "Fatiga: detectarla, manejarla y sus consecuencias legales",
        html: `
          <p><strong>Señales de fatiga que ningún operador profesional ignora:</strong> parpadeo pesado y microsueños (despertar sin recordar los últimos segundos), invadir rayas sin darte cuenta, no recordar los últimos kilómetros, bostezos constantes, irritabilidad, "ver" cosas en la orilla.</p>
          <p><strong>Qué sí funciona contra la fatiga:</strong> detenerte y dormir 20–30 minutos (la única medida realmente efectiva), pausas programadas antes de sentirte mal, hidratarte y comer ligero. <strong>Qué no funciona:</strong> subir el volumen, abrir la ventana, o encadenar bebidas energéticas — retrasan el sueño unos minutos y provocan un desplome peor.</p>
          <p><strong>Consecuencias legales de un accidente con fatiga demostrable:</strong></p>
          <ul>
            <li>Si tu bitácora o el GPS muestran que excediste los tiempos, la fatiga puede tomarse como elemento de <strong>culpa o negligencia</strong> en la carpeta de investigación, agravando tu situación penal y la responsabilidad civil.</li>
            <li>Si la <strong>empresa te programó</strong> fuera de norma, esa evidencia también reparte la responsabilidad hacia el permisionario — otra razón para conservar mensajes donde te asignan rutas y horarios.</li>
            <li>Negarte a conducir excediendo los tiempos de norma <strong>no es insubordinación</strong>: es cumplimiento de una obligación legal. Documenta la negativa por escrito y con respeto.</li>
          </ul>
          <p class="tip">Frase para tu empresa cuando te presionen: "Dentro de norma llego mañana temprano; fuera de norma, a lo mejor no llego". Un profesional administra sus tiempos como administra su diésel.</p>
        `
      }
    ],
    quiz: [
      { q: "¿Cuál es una de las principales causas de accidentes graves que la NOM-087 busca combatir?", options: ["El exceso de dimensiones", "La fatiga del conductor", "La falta de seguro", "La sobrecarga de los ejes"], correct: 1 },
      { q: "Tras un máximo de 5 horas y media de conducción continua, corresponde:", options: ["Cambiar de operador obligatoriamente", "Una pausa mínima de 30 minutos", "Terminar la jornada", "Reportarse a la SICT"], correct: 1 },
      { q: "Alcanzado el tope de conducción efectiva acumulada (14 horas), debes tomar:", options: ["Una pausa de 30 minutos", "Un descanso mínimo de 8 horas consecutivas", "Un café y continuar", "Descanso solo si hay pensión disponible"], correct: 1 },
      { q: "La NOM-087 obliga:", options: ["Solo al operador", "Solo a la empresa permisionaria", "Al operador y a la empresa que programa los viajes", "Solo a las flotas de más de 50 unidades"], correct: 2 },
      { q: "¿Cuál es la ÚNICA medida realmente efectiva contra la fatiga al volante?", options: ["Bebidas energéticas encadenadas", "Música a alto volumen", "Detenerse y dormir 20–30 minutos", "Ventanilla abierta"], correct: 2 },
      { q: "Una bitácora 'maquillada' que no coincide con el GPS de la unidad:", options: ["No tiene consecuencias", "Es mejor que nada", "Es peor que ninguna: acredita falsedad", "Solo importa en accidentes con heridos"], correct: 2 },
      { q: "En doble tripulación, el relevo de operador:", options: ["Resetea tus horas de conducción", "Pausa tu conteo mientras descansas; no lo borra", "Duplica el tope permitido", "Elimina la obligación de bitácora"], correct: 1 },
      { q: "Tu empresa te asigna una ruta imposible sin exceder los tiempos de la norma. Negarte:", options: ["Es insubordinación y causal de despido", "Es cumplimiento de una obligación legal; documéntalo por escrito", "Solo es válido si eres sindicalizado", "Es válido pero pierdes el viaje sin defensa"], correct: 1 },
      { q: "Tras un accidente, ¿qué papel juega tu bitácora si operabas dentro de tiempos?", options: ["Ninguno, solo cuenta el peritaje de la unidad", "Es tu defensa: demuestra que operabas en norma", "Solo sirve para el seguro", "Se entrega únicamente a la empresa"], correct: 1 },
      { q: "El tope de conducción de la NOM y la jornada laboral de la LFT:", options: ["Son lo mismo con distinto nombre", "Solo aplica el que convenga a la empresa", "Son límites distintos y ambos son exigibles", "La NOM sustituye a la LFT en carretera"], correct: 2 }
    ]
  },

  {
    id: "protocolo-accidente",
    title: "Protocolo de accidente en carretera",
    badge: "SOS",
    color: "#B91C1C",
    desc: "Los primeros 60 minutos deciden tu situación legal. Qué hacer, qué decir, qué no firmar y cuáles son tus derechos si interviene el Ministerio Público.",
    duracion: "≈ 45 min",
    lessons: [
      {
        id: "pa-1",
        title: "Los primeros 10 minutos: seguridad y aviso",
        html: `
          <p>Pasó lo que no querías. El orden de prioridades en los primeros minutos es siempre el mismo:</p>
          <ol>
            <li><strong>Tu integridad primero.</strong> Evalúa si puedes moverte, si hay fuego, derrame o riesgo de volcadura secundaria. Un operador lesionado no puede ayudar a nadie.</li>
            <li><strong>Asegura la zona.</strong> Luces intermitentes, torreta si tienes, y coloca los <strong>triángulos o dispositivos de advertencia</strong> a distancia suficiente para que el tráfico reaccione (en carretera federal, piensa en cientos de metros, no en diez pasos; más lejos en curvas, pendientes o de noche). El segundo accidente sobre la escena es tristemente común y suele ser peor.</li>
            <li><strong>Llama al 911.</strong> Reporta: kilómetro y tramo exactos, número de vehículos, si hay lesionados y de qué gravedad, si hay derrame o material peligroso. Di tu nombre y número de contacto.</li>
            <li><strong>No muevas a los lesionados</strong> salvo riesgo inminente (fuego, explosión). Moverlos puede agravar lesiones y complicar tu situación legal. Sí puedes: hablarles, cubrirlos, contener una hemorragia con presión directa si sabes hacerlo.</li>
            <li><strong>No muevas las unidades</strong> si hay lesionados o daños mayores: la posición final es evidencia. Si es un percance menor sin lesionados y las unidades estorban con riesgo, fotografía todo desde varios ángulos ANTES de mover.</li>
          </ol>
          <p class="tip">Memoriza el orden: <strong>YO → ZONA → 911 → HERIDOS → EVIDENCIA</strong>. En pánico, el orden memorizado sustituye al criterio que se nubla.</p>
        `
      },
      {
        id: "pa-2",
        title: "Con quién hablar y qué decir (y qué no)",
        html: `
          <p>Después del 911, tus llamadas en orden:</p>
          <ol>
            <li><strong>Tu empresa</strong> (o tu aseguradora si eres hombre-camión): reporta hechos objetivos. La empresa activa a su ajustador y a su área legal.</li>
            <li><strong>La aseguradora de la unidad:</strong> el número viene en la póliza. Pide número de reporte y nombre del ajustador asignado. <strong>No negocies nada con el tercero antes de que llegue el ajustador.</strong></li>
          </ol>
          <p><strong>Frente a la autoridad (Guardia Nacional, policía) y frente al tercero:</strong></p>
          <ul>
            <li>Describe <strong>hechos, no conclusiones</strong>: "circulaba por el carril derecho a esta velocidad aproximada, el vehículo apareció desde…" — nunca "fue mi culpa", "me distraje", "iba tarde". La determinación de responsabilidad corresponde al perito, no a ti ni al oficial en la escena.</li>
            <li><strong>No firmes nada que no entiendas o que no puedas leer completo.</strong> Ni convenios con el tercero, ni "responsivas" improvisadas. Si te presionan a firmar, escribe junto a tu firma "recibo, sin aceptar contenido" — o mejor, espera al ajustador o al abogado.</li>
            <li><strong>No entregues documentos originales</strong> al tercero. Al oficial, entrega lo que legalmente te requiera y anota su nombre, corporación y número de unidad.</li>
            <li>Con el tercero mantén trato correcto y breve. Nada de discusiones, ofertas de dinero ni amenazas: todo eso reaparece después como declaración testimonial.</li>
          </ul>
          <p class="tip">La frase profesional universal: <em>"El ajustador y el área legal de mi empresa vienen en camino; con ellos se acuerda todo."</em> Te quita presión y no admite nada.</p>
        `
      },
      {
        id: "pa-3",
        title: "Evidencia: tu cámara es tu abogado en la escena",
        html: `
          <p>Mientras llegan ajustador y autoridad, documenta. Checklist de evidencia:</p>
          <ul>
            <li><strong>Panorámicas</strong> de la escena desde los 4 puntos cardinales, que se vea la posición final de todas las unidades y el entorno (curva, pendiente, señalamiento, estado del pavimento).</li>
            <li><strong>Acercamientos</strong> de daños de todas las unidades (también las del tercero), huellas de frenado, derrames, piezas desprendidas.</li>
            <li><strong>Condiciones:</strong> clima, visibilidad, iluminación. Un video de 360° con la voz narrando hora y lugar vale doble.</li>
            <li><strong>Del tercero:</strong> placas, número de serie si es visible, licencia, póliza, nombre y teléfono. Fotografía los documentos, no los transcribas.</li>
            <li><strong>Testigos:</strong> nombre y teléfono de quien haya visto algo. Dos líneas de lo que dicen. Los testigos se van en minutos y no regresan.</li>
            <li><strong>Tus documentos del viaje:</strong> ten a la mano licencia, tarjetas de circulación, póliza, Carta Porte y tu bitácora de horas (recuerda: si estabas dentro de tiempos, tu bitácora te defiende).</li>
          </ul>
          <p>Envía todo de inmediato a tu empresa/abogado por un canal que deje constancia (correo o mensaje), no lo dejes solo en la galería del teléfono.</p>
          <p class="tip">Regla del profesional: <strong>documentas como si fueras a perder el juicio</strong>. Si nunca hace falta, perfecto; si hace falta, ganaste.</p>
        `
      },
      {
        id: "pa-4",
        title: "Si interviene el Ministerio Público: tus derechos",
        html: `
          <p>Cuando hay lesionados graves o fallecidos, el asunto se vuelve penal y probablemente serás presentado ante el <strong>Ministerio Público</strong>. Aquí es donde más operadores se hunden por no conocer sus derechos:</p>
          <ul>
            <li><strong>Derecho a no declarar.</strong> Puedes reservarte tu declaración hasta contar con abogado. Guardar silencio NO es admisión de culpa y no puede usarse en tu contra. La declaración sin defensor es la fuente número uno de problemas evitables.</li>
            <li><strong>Derecho a un defensor.</strong> Desde el primer acto tienes derecho a un abogado: el de tu empresa, uno particular, o un defensor público. Exígelo antes de firmar o declarar cualquier cosa. La frase correcta: <em>"Voy a declarar con mucho gusto en cuanto esté presente mi defensor."</em></li>
            <li><strong>Derecho a conocer de qué se te acusa</strong> y a comunicarte: avisa a tu familia y a tu empresa dónde estás. No estás incomunicado.</li>
            <li><strong>La unidad y la carga:</strong> normalmente quedarán aseguradas (corralón/depósito) mientras se hace el peritaje. Su liberación es un trámite posterior que gestiona el abogado con la aseguradora; no firmes salidas "exprés" informales.</li>
            <li><strong>Exámenes:</strong> es normal que te practiquen examen médico y de alcohol/drogas. Coopera: si estás limpio, ese examen es tu mejor evidencia inmediata.</li>
            <li><strong>En accidentes de tránsito, la ley general contempla salidas alternas</strong> (acuerdos reparatorios cubiertos por el seguro) para delitos culposos; con defensa adecuada, la gran mayoría de percances sin agravantes se resuelven sin prisión. Con alcohol, fuga u omisión de auxilio, el panorama cambia por completo: <strong>nunca abandones la escena.</strong></li>
          </ul>
          <p class="tip">Resumen para memorizar: <strong>no declaro sin abogado, no firmo sin leer, no me retiro de la escena, sí coopero con el examen médico.</strong> Cuatro decisiones que definen tu futuro más que el accidente mismo.</p>
        `
      }
    ],
    quiz: [
      { q: "¿Cuál es el orden correcto de prioridades tras un accidente?", options: ["Evidencia → empresa → 911", "Tu integridad → asegurar la zona → 911 → heridos → evidencia", "911 → mover unidades → fotos", "Hablar con el tercero → aseguradora → 911"], correct: 1 },
      { q: "Los dispositivos de advertencia (triángulos) en carretera federal se colocan:", options: ["A 10 pasos de la unidad", "Solo si hay niebla", "A distancia suficiente para que el tráfico reaccione: cientos de metros, más en curvas o de noche", "Detrás de la cabina"], correct: 2 },
      { q: "¿Cuándo es válido mover a un lesionado?", options: ["Cuando estorba el tráfico", "Solo ante riesgo inminente como fuego o explosión", "Cuando el tercero lo pide", "Siempre, para llevarlo a la sombra"], correct: 1 },
      { q: "Frente al oficial y al tercero, lo correcto es describir:", options: ["Tus conclusiones sobre quién tuvo la culpa", "Hechos objetivos, sin admitir culpa: la responsabilidad la determina el perito", "Nada en absoluto, ni tu nombre", "Solo lo que diga tu empresa por teléfono"], correct: 1 },
      { q: "Te presentan un documento para firmar en la escena y no puedes leerlo completo:", options: ["Firmas para agilizar", "No firmas; esperas al ajustador o abogado, o firmas solo de recibido sin aceptar contenido", "Firmas con otro nombre", "Lo rompes"], correct: 1 },
      { q: "¿Por qué NO debes mover las unidades si hay lesionados o daños mayores?", options: ["Porque se daña la caja de velocidades", "Porque la posición final es evidencia para el peritaje", "Porque lo prohíbe la aseguradora del tercero", "Sí debes moverlas siempre"], correct: 1 },
      { q: "¿Qué evidencia conviene levantar de los testigos?", options: ["Solo su apodo", "Nombre, teléfono y dos líneas de lo que dicen, antes de que se retiren", "Nada: el perito los localiza después", "Su credencial de elector en original"], correct: 1 },
      { q: "Ante el Ministerio Público, guardar silencio hasta tener abogado:", options: ["Es admisión tácita de culpa", "Es tu derecho y no puede usarse en tu contra", "Solo aplica para delitos graves", "Requiere permiso de la empresa"], correct: 1 },
      { q: "El examen médico y de alcohol/drogas tras el accidente:", options: ["Debes rechazarlo siempre", "Conviene cooperar: si estás limpio, es tu mejor evidencia inmediata", "Solo aplica a los del tercero", "Se hace únicamente con orden judicial"], correct: 1 },
      { q: "¿Cuál de estas conductas cambia por completo tu panorama legal, para mal?", options: ["Llamar al 911", "Abandonar la escena del accidente", "Esperar al ajustador", "Tomar fotografías"], correct: 1 }
    ]
  },

  {
    id: "materiales-peligrosos",
    title: "Materiales y residuos peligrosos (NOM-002-SCT/2011)",
    badge: "002",
    color: "#17191E",
    desc: "Capacitación específica para operadores que transportan sustancias, materiales o residuos peligrosos: documentación, señalización, manejo seguro y respuesta a emergencias.",
    duracion: "≈ 55 min",
    lessons: [
      {
        id: "mp-1",
        title: "Qué son los materiales peligrosos y por qué necesitas esta capacitación",
        html: `
          <p>Se considera <strong>material o residuo peligroso</strong> toda sustancia (o mezcla de sustancias)
          que por sus características corrosivas, reactivas, explosivas, tóxicas,
          inflamables o biológico-infecciosas representa un riesgo para la salud, el
          medio ambiente o los bienes durante su traslado. La <strong>NOM-002-SCT/2011</strong>
          clasifica estas sustancias en <strong>9 clases</strong> de la ONU (explosivos, gases,
          líquidos inflamables, sólidos inflamables, oxidantes, tóxicos/infecciosos,
          radiactivos, corrosivos y varios), cada una con su propia simbología.</p>
          <p>Puntos que todo operador de esta carga debe tener claros desde el día uno:</p>
          <ul>
            <li><strong>Licencia federal categoría "E":</strong> conducir unidades con materiales
            peligrosos exige esta categoría específica, adicional a la licencia base. No
            es opcional ni negociable con el permisionario.</li>
            <li><strong>Capacitación y reentrenamiento periódico:</strong> esta certificación
            acredita conocimiento general; muchas empresas y aseguradoras exigen además
            cursos de reentrenamiento anual específicos por tipo de material que
            transportan.</li>
            <li><strong>No toda unidad ni todo operador califica:</strong> el vehículo necesita
            autorización específica de la SICT para el tipo de material, y tú necesitas
            estar dado de alta como operador autorizado para esa carga.</li>
          </ul>
          <p class="tip">Regla de oro: <strong>si no tienes categoría E vigente, autorización de la
          unidad para ese material y la documentación completa, no subas esa carga</strong> —
          ni por presión de la empresa ni por "ya se hace tarde". El riesgo penal y de
          seguridad es tuyo, no de quien te apura por teléfono.</p>
        `
      },
      {
        id: "mp-2",
        title: "Documentación y señalización obligatoria",
        html: `
          <p>Además de tus documentos habituales (licencia, tarjeta de circulación, póliza,
          Carta Porte), el transporte de materiales peligrosos exige documentación y
          señalización específica:</p>
          <ul>
            <li><strong>Complemento Carta Porte con datos de material peligroso:</strong> debe
            incluir la <strong>clave de material peligroso</strong>, su clase y número ONU/UN.
            Verifica que la clave del papel coincida con lo que realmente traes cargado.</li>
            <li><strong>Hoja de datos de seguridad (HDS/SDS):</strong> documento técnico de la
            sustancia con sus riesgos, primeros auxilios y manejo en caso de derrame.
            Debe ir a bordo, en un lugar que tú y los primeros respondientes puedan
            ubicar de inmediato (no enterrada en una carpeta en el fondo de la cabina).</li>
            <li><strong>Rombos de seguridad y paneles de identificación:</strong> la unidad debe
            portar visiblemente el <strong>rombo (diamante) de riesgo</strong> correspondiente a
            la clase de material en los 4 costados, y el <strong>panel naranja con el número
            ONU</strong> cuando aplique. Verifica que estén limpios, legibles y sean los
            correctos para lo que traes — un rombo equivocado confunde a los primeros
            respondientes en una emergencia real.</li>
            <li><strong>Autorización SICT de la unidad y de la ruta:</strong> algunas sustancias
            solo pueden transportarse por rutas autorizadas y en horarios específicos
            (evitando cruces urbanos en horas pico, por ejemplo).</li>
          </ul>
          <p class="tip">Antes de arrancar, checklist de 30 segundos: <strong>clave correcta en la
          Carta Porte, HDS a bordo y localizable, rombos correctos en los 4 costados,
          panel naranja si aplica.</strong> Si falta uno solo, detén el viaje y repórtalo.</p>
        `
      },
      {
        id: "mp-3",
        title: "Manejo seguro en ruta y equipo de protección",
        html: `
          <p>Transportar materiales peligrosos exige disciplina adicional en cada tramo del
          viaje:</p>
          <ul>
            <li><strong>Inspección pre-viaje reforzada:</strong> revisa especialmente fugas,
            estado de válvulas y conexiones (en pipas), amarres y estado del embalaje
            (en carga seca), y que el equipo de emergencia esté completo: extintor de
            mayor capacidad, kit de derrame básico, equipo de protección personal (EPP).</li>
            <li><strong>Equipo de protección personal (EPP) a bordo:</strong> guantes,
            googles/lentes de seguridad y, según el material, respirador o traje
            específico indicado en la hoja de seguridad. No es "por si acaso": es para
            que tú puedas actuar sin exponerte en los primeros minutos de un incidente
            menor.</li>
            <li><strong>Segregación de materiales incompatibles:</strong> nunca combines en la
            misma unidad sustancias que la hoja de seguridad marque como incompatibles
            entre sí (ej. oxidantes con inflamables). Si algo no cuadra con lo que sabes
            de la carga, pregunta antes de aceptar el embarque.</li>
            <li><strong>Restricciones de velocidad, ruta y paradas:</strong> muchas normas
            internas y pólizas exigen velocidad reducida, evitar zonas densamente
            pobladas para pernoctar, y no estacionarte cerca de escuelas, hospitales o
            fuentes de agua. Planea tus paradas de descanso con esto en mente, no sobre
            la marcha.</li>
            <li><strong>Reabastecimiento de combustible:</strong> apaga el motor, sin
            fumar ni usar el teléfono cerca del despacho, y extrema precaución si la
            carga es inflamable.</li>
          </ul>
          <p class="tip">Con materiales peligrosos, la improvisación es el riesgo más grande.
          Sigue el protocolo aunque el reloj apriete: una parada de más nunca cuesta lo
          que cuesta un incidente.</p>
        `
      },
      {
        id: "mp-4",
        title: "Respuesta a emergencias y consecuencias legales",
        html: `
          <p>Si ocurre un incidente (fuga, derrame, incendio, volcadura) con materiales
          peligrosos, el protocolo cambia respecto a un accidente convencional:</p>
          <ol>
            <li><strong>Tu integridad primero, a distancia segura.</strong> No intentes contener
            un derrame o fuga mayor sin el equipo y entrenamiento adecuados — retírate a
            distancia segura y reporta desde ahí.</li>
            <li><strong>Llama al 911 y reporta la clase y número ONU del material</strong> (lo
            traes en tu documentación) — esto permite a los cuerpos de emergencia
            preparar la respuesta correcta desde que salen.</li>
            <li><strong>Usa la Guía de Respuesta en caso de Emergencia (GRE)</strong> si la traes
            a bordo: te indica el radio de aislamiento inicial recomendado y las
            acciones básicas según la clase de material, mientras llegan los expertos.</li>
            <li><strong>Aísla la zona</strong> con mayor radio del habitual (considera dirección
            del viento si hay gases o vapores) y evita que curiosos o el propio tráfico
            se acerquen.</li>
            <li><strong>No intentes limpiar o "resolver" un derrame ambiental por tu cuenta.</strong>
            Eso corresponde a equipos especializados; tu intento bien intencionado puede
            agravar la contaminación y tu responsabilidad legal.</li>
          </ol>
          <p><strong>Consecuencias de operar fuera de norma:</strong> las sanciones por
          transportar materiales peligrosos sin autorización, sin señalización correcta o
          con documentación incompleta son considerablemente más severas que en carga
          general — incluyen aseguramiento inmediato de la unidad, multas elevadas, y en
          caso de daño ambiental o a terceros, responsabilidad penal tanto para el
          operador como para la empresa. La cobertura de seguro para este tipo de carga
          también suele exigir que el operador cuente con toda la documentación y
          capacitación vigente para que la póliza responda.</p>
          <p class="tip">Un operador certificado y en regla para materiales peligrosos accede a
          cargas mejor pagadas — y es exactamente el perfil que las empresas serias
          buscan para reducir su propio riesgo.</p>
        `
      }
    ],
    quiz: [
      { q: "¿Cuántas clases de riesgo de la ONU clasifica la normatividad de materiales peligrosos?", options: ["4", "6", "9", "12"], correct: 2 },
      { q: "¿Qué categoría de licencia federal se requiere para conducir unidades con materiales peligrosos?", options: ["Categoría A", "Categoría B", "Categoría E", "No se requiere categoría especial"], correct: 2 },
      { q: "Además del rombo de seguridad, ¿qué otro elemento debe portar visiblemente la unidad cuando aplique?", options: ["Un extintor pintado en la puerta", "El panel naranja con el número ONU", "El logo de la aseguradora", "Una calcomanía de verificación vehicular"], correct: 1 },
      { q: "La hoja de datos de seguridad (HDS/SDS) debe ir a bordo:", options: ["No es necesaria si el viaje es corto", "En un lugar donde tú y los primeros respondientes la ubiquen de inmediato", "Solo en la oficina de la empresa", "Únicamente en formato digital sin respaldo físico"], correct: 1 },
      { q: "Antes de aceptar cargar dos sustancias distintas en la misma unidad, debes verificar:", options: ["Que quepan en el espacio disponible", "Que no sean materiales incompatibles según la hoja de seguridad", "Que ambas tengan la misma clave ONU", "No es necesario verificar nada si van bien empacadas"], correct: 1 },
      { q: "Ante una fuga o derrame mayor de material peligroso, tu primera acción es:", options: ["Contenerlo tú mismo con lo que tengas a la mano", "Retirarte a distancia segura y reportar al 911", "Seguir manejando hasta el destino", "Esperar en la cabina a que pase"], correct: 1 },
      { q: "La Guía de Respuesta en caso de Emergencia (GRE) sirve para:", options: ["Sustituir la llamada al 911", "Indicar el radio de aislamiento inicial y acciones básicas según la clase de material", "Reemplazar la hoja de datos de seguridad", "Solo la usan los bomberos, no el operador"], correct: 1 },
      { q: "Si ocurre un derrame con posible daño ambiental, lo correcto es:", options: ["Limpiarlo tú mismo lo antes posible", "Dejarlo para que la lluvia lo disperse", "No intentar resolverlo por tu cuenta; es tarea de equipos especializados", "Cubrirlo con tierra y continuar el viaje"], correct: 2 },
      { q: "Las sanciones por transportar materiales peligrosos sin la documentación y señalización correctas, comparadas con carga general, son:", options: ["Iguales", "Menores, porque es un caso especial", "Considerablemente más severas", "Solo aplican a la empresa, nunca al operador"], correct: 2 },
      { q: "¿Por qué conviene mantener vigente tu capacitación y documentación para materiales peligrosos?", options: ["Es un trámite sin beneficio real", "Da acceso a cargas mejor pagadas y reduce tu riesgo legal y de seguridad", "Solo lo exige la aseguradora, nada más", "No afecta si la empresa ya está en regla"], correct: 1 }
    ]
  },

  {
    id: "sujecion-carga",
    title: "Peso, dimensiones y sujeción de carga (NOM-012-SCT-2)",
    badge: "012",
    color: "#044A2D",
    desc: "Límites de peso y dimensiones del autotransporte federal, y buenas prácticas de sujeción y estiba: la carga mal sujeta o mal distribuida es causa directa de accidentes, volcaduras y multas.",
    duracion: "≈ 45 min",
    lessons: [
      {
        id: "sc-1",
        title: "Qué regula la NOM-012-SCT-2 y por qué te afecta directamente",
        html: `
          <p>La <strong>NOM-012-SCT-2</strong> establece los <strong>pesos y dimensiones máximos</strong>
          con los que pueden circular los vehículos de autotransporte federal, según su
          configuración vehicular (ej. C2, C3, T3S2, T3S2R4). Aunque quien calcula la
          carga suele ser logística o el cliente, <strong>tú eres quien la trae encima</strong> y
          quien responde en una báscula o en un retén.</p>
          <ul>
            <li><strong>Peso Bruto Vehicular (PBV):</strong> el peso máximo permitido de la
            unidad cargada, según su configuración. Excederlo (sobrecupo) es una de las
            infracciones más comunes y costosas del autotransporte.</li>
            <li><strong>Límites por eje:</strong> no basta con no exceder el peso total; cada eje
            tiene su propio límite. Una carga mal distribuida puede sobrecargar un eje
            aunque el peso total esté dentro de norma — y así te sancionan igual en la
            báscula.</li>
            <li><strong>Dimensiones máximas:</strong> alto, ancho y largo permitidos según la
            configuración; cargas que sobresalen requieren señalización y, en algunos
            casos, permiso especial de carga sobredimensionada.</li>
          </ul>
          <p class="tip">Antes de firmar de recibido una carga, pregunta el peso total y por eje
          si no viene indicado. Firmar "de recibido conforme" sin verificar te vuelve
          corresponsable de la sobrecarga ante la autoridad.</p>
        `
      },
      {
        id: "sc-2",
        title: "Cómo pesar y distribuir la carga correctamente",
        html: `
          <p>La distribución del peso importa tanto como el peso total:</p>
          <ul>
            <li><strong>Usa las básculas disponibles</strong> en el origen o en las casetas de la
            ruta cuando tengas duda razonable sobre el peso — es preferible una parada
            de 10 minutos que una infracción que detiene la unidad horas.</li>
            <li><strong>Centro de gravedad bajo y centrado:</strong> la carga más pesada va abajo
            y lo más centrada posible, tanto de adelante hacia atrás como de lado a
            lado. Un centro de gravedad alto o descentrado aumenta drásticamente el
            riesgo de volcadura en curvas o maniobras de emergencia.</li>
            <li><strong>Distribución longitudinal:</strong> concentrar todo el peso muy adelante o
            muy atrás sobrecarga el eje correspondiente aunque el total sea correcto.
            Reparte la carga a lo largo de la caja o plataforma.</li>
            <li><strong>Carga líquida a granel (pipas):</strong> el "efecto de oleaje" del líquido
            en movimiento afecta la estabilidad de forma distinta a la carga sólida —
            requiere manejo aún más suave en curvas, frenados y arrancones.</li>
          </ul>
          <p class="tip">Si algo se siente "raro" al arrancar o en la primera curva —vaivén
          excesivo, la unidad se siente inestable— detente y revisa distribución y
          sujeción antes de seguir. Ese instinto rara vez se equivoca.</p>
        `
      },
      {
        id: "sc-3",
        title: "Sujeción y estiba: reglas prácticas",
        html: `
          <p>Una carga bien distribuida pero mal sujeta sigue siendo un riesgo. Reglas
          prácticas de sujeción:</p>
          <ul>
            <li><strong>Usa el equipo adecuado:</strong> cadenas, tensores (matracas), cinchos o
            duelas según el tipo de carga. Revisa que no tengan cortes, deshilachados,
            oxidación severa o hebillas dañadas antes de usarlos — un tensor dañado
            falla justo cuando más se necesita.</li>
            <li><strong>Capacidad de carga de trabajo (WLL):</strong> cada amarre tiene una
            capacidad máxima marcada por el fabricante. La suma de la capacidad de tus
            amarres debe cubrir con margen el peso que estás asegurando, no solo
            "verse suficiente".</li>
            <li><strong>Número mínimo de puntos de sujeción:</strong> como regla práctica general,
            entre más pesada, alta o indivisible sea la pieza, más puntos de amarre
            independientes necesita — nunca dependas de un solo punto para una pieza
            crítica.</li>
            <li><strong>Cobertura con lona:</strong> además de proteger la carga, evita que objetos
            se desprendan y se conviertan en proyectiles para otros vehículos —
            responsabilidad que recae directamente en el operador que dejó la unidad
            así.</li>
            <li><strong>Revisa la sujeción durante el viaje:</strong> las vibraciones aflojan
            tensores y cadenas. Verifica en la primera parada corta después de arrancar
            y periódicamente en viajes largos, no solo antes de salir.</li>
          </ul>
          <p class="tip">Estiba y sujeción es de lo poco que SÍ está 100% en tus manos —
          a diferencia del tráfico o el clima. Ahí es donde más se nota un operador
          profesional.</p>
        `
      },
      {
        id: "sc-4",
        title: "Consecuencias de la sobrecarga y la carga mal sujeta",
        html: `
          <p>Las consecuencias de operar fuera de los límites de peso, dimensiones o
          sujeción van más allá de la multa:</p>
          <ul>
            <li><strong>Sanciones económicas:</strong> las multas por sobrepeso se calculan según
            el exceso detectado en báscula y pueden ser significativas; se suman a la
            demora de la unidad mientras se resuelve o se hace trasbordo de excedente.</li>
            <li><strong>Riesgo de volcadura:</strong> la combinación de sobrepeso, centro de
            gravedad alto y velocidad en curva es la receta más común de volcaduras en
            autotransporte — y una volcadura con carga que invade carriles contrarios
            puede involucrar a terceros inocentes.</li>
            <li><strong>Carga que cae en movimiento:</strong> si una pieza mal sujeta cae y causa
            un accidente a otro vehículo, la responsabilidad civil (y potencialmente
            penal) recae sobre el operador y la empresa, incluso si el operador del
            otro vehículo no tuvo culpa alguna.</li>
            <li><strong>Aseguramiento de la unidad:</strong> en verificaciones, una unidad con
            sobrepeso relevante o sujeción claramente deficiente puede ser detenida
            hasta corregir la condición, generando pérdida de tiempo, penalizaciones
            del cliente por retraso, y en casos graves, aseguramiento formal.</li>
          </ul>
          <p class="tip">La revisión de peso y sujeción toma minutos; una volcadura o una pieza
          caída en carretera cuesta días de unidad parada, procesos legales y, en el
          peor caso, vidas. Nunca es tiempo perdido.</p>
        `
      }
    ],
    quiz: [
      { q: "¿Qué regula principalmente la NOM-012-SCT-2?", options: ["Los tiempos de conducción y descanso", "Los pesos y dimensiones máximos según la configuración vehicular", "El protocolo de accidentes", "La categoría de licencia federal"], correct: 1 },
      { q: "Una carga puede sobrecargar un eje específico aunque el peso total de la unidad esté dentro de norma. Esto ocurre por:", options: ["Un error de báscula", "Mala distribución de la carga a lo largo de la unidad", "El clima", "El tipo de combustible usado"], correct: 1 },
      { q: "¿Dónde debe ir el centro de gravedad de la carga para reducir el riesgo de volcadura?", options: ["Lo más alto posible", "Bajo y centrado", "Concentrado totalmente al frente", "No importa mientras el peso total sea correcto"], correct: 1 },
      { q: "Antes de usar cadenas o tensores para sujetar la carga, debes revisar:", options: ["Solo que combinen en color", "Que no tengan cortes, oxidación severa o hebillas dañadas", "Que sean del mismo fabricante que la unidad", "No es necesario revisarlos si se ven completos"], correct: 1 },
      { q: "La capacidad de carga de trabajo (WLL) de los amarres debe:", options: ["Ser exactamente igual al peso de la pieza", "Cubrir con margen el peso que se está asegurando", "Ignorarse si el viaje es corto", "Aplicar solo a cargas líquidas"], correct: 1 },
      { q: "¿Cuándo conviene revisar la sujeción de la carga durante el viaje?", options: ["Nunca, solo antes de salir", "En la primera parada corta después de arrancar y periódicamente en viajes largos", "Solo si llueve", "Únicamente al llegar al destino"], correct: 1 },
      { q: "Si sientes vaivén excesivo o inestabilidad al tomar la primera curva después de cargar, debes:", options: ["Ignorarlo y seguir, es normal", "Detenerte y revisar distribución y sujeción antes de continuar", "Acelerar para estabilizar la unidad", "Solo reportarlo al llegar al destino"], correct: 1 },
      { q: "Si una pieza mal sujeta cae en movimiento y causa un accidente a otro vehículo, la responsabilidad recae principalmente en:", options: ["Únicamente en el otro conductor", "El operador y la empresa transportista", "Nadie, se considera caso fortuito", "Solo en quien fabricó la pieza"], correct: 1 },
      { q: "Con carga líquida a granel (pipas), el manejo debe ser:", options: ["Igual que con carga sólida", "Más suave en curvas, frenados y arrancones por el efecto de oleaje del líquido", "Más rápido para evitar el oleaje", "Solo importa la velocidad, no el frenado"], correct: 1 },
      { q: "Firmar de recibido una carga sin verificar su peso:", options: ["No tiene ninguna consecuencia para el operador", "Puede volverte corresponsable de una sobrecarga ante la autoridad", "Es obligatorio hacerlo sin revisar", "Solo aplica si el cliente lo exige por escrito"], correct: 1 }
    ]
  },

  {
    id: "manejo-defensivo",
    title: "Manejo defensivo y prevención de accidentes",
    badge: "MD",
    color: "#23262C",
    desc: "Técnicas de manejo defensivo específicas para vehículos pesados: distancia de seguridad, puntos ciegos, condiciones adversas y anticipación ante el error de terceros.",
    duracion: "≈ 50 min",
    lessons: [
      {
        id: "md-1",
        title: "Qué es el manejo defensivo y la regla de los segundos",
        html: `
          <p><strong>Manejar a la defensiva</strong> significa anticipar el error ajeno, no solo
          evitar el propio. La mayoría de los accidentes en carretera involucran al
          menos una decisión de otro conductor que un operador defensivo pudo haber
          anticipado con distancia y atención suficientes.</p>
          <ul>
            <li><strong>Distancia de seguimiento:</strong> un vehículo pesado necesita mucha más
            distancia de frenado que un automóvil. Como regla práctica, mantén al menos
            <strong>6 segundos</strong> de distancia respecto al vehículo de adelante en condiciones
            normales (cuenta "mil uno, mil dos…" desde que el vehículo de enfrente pasa
            un punto fijo hasta que tú pasas el mismo punto), y auméntala en lluvia,
            carga pesada o pendiente descendente.</li>
            <li><strong>Explora constantemente:</strong> revisa espejos cada 5–8 segundos, no solo
            cuando vas a maniobrar. Anticipar lo que pasa detrás y a los lados te da
            opciones antes de que las necesites.</li>
            <li><strong>Ten siempre una "salida":</strong> al circular, identifica mentalmente hacia
            dónde podrías moverte si el vehículo de adelante frena en seco o algo
            invade tu carril. Un operador defensivo nunca se queda "atrapado" sin opciones.</li>
          </ul>
          <p class="tip">La pregunta que debes hacerte cada pocos minutos: <strong>"si el vehículo
          de adelante se detiene en este instante, ¿tengo espacio para reaccionar?"</strong>
          Si la respuesta es no, ya vas muy cerca.</p>
        `
      },
      {
        id: "md-2",
        title: "Puntos ciegos y maniobras seguras",
        html: `
          <p>Un tracto con remolque tiene zonas ciegas mucho más grandes que un automóvil,
          y esto exige maniobras específicas:</p>
          <ul>
            <li><strong>Las 4 zonas ciegas (\"no-zones\"):</strong> justo detrás del remolque, a lo
            largo de ambos costados (especialmente el lado del pasajero, el más
            extenso), y justo enfrente de la cabina en distancias cortas. Si tú no ves el
            espejo de un vehículo, ese conductor probablemente no te ve a ti.</li>
            <li><strong>Cambios de carril:</strong> señaliza con anticipación, verifica el punto
            ciego girando ligeramente la cabeza (no solo el espejo) y ejecuta el cambio
            de forma gradual, nunca brusca — recuerda que el remolque "corta camino" en
            curvas y cambios de carril (efecto de fuera de trayectoria).</li>
            <li><strong>Vueltas amplias:</strong> en vueltas cerradas, especialmente a la derecha,
            el remolque describe un radio distinto al de la cabina. Verifica que ningún
            vehículo, ciclista o peatón intente "colarse" por ese espacio antes de girar.</li>
            <li><strong>Reversa:</strong> siempre que sea posible, pide apoyo de un señalero en
            tierra. Si no hay nadie, baja, camina y verifica el área antes de maniobrar
            — los segundos que toma valen mucho menos que un incidente.</li>
          </ul>
          <p class="tip">Regla simple para autos particulares cerca de ti: <strong>si no puedes ver
          su espejo retrovisor, ellos no pueden verte a ti.</strong> Compártela mentalmente
          con cada maniobra que hagas.</p>
        `
      },
      {
        id: "md-3",
        title: "Condiciones adversas: lluvia, niebla, noche y terracería",
        html: `
          <p>Cada condición adversa exige un ajuste específico, no solo "manejar más
          despacio":</p>
          <ul>
            <li><strong>Lluvia:</strong> reduce velocidad gradualmente, aumenta la distancia de
            seguimiento (el doble de lo habitual en lluvia fuerte), evita frenados
            bruscos que puedan provocar coleo (jackknife) del remolque, y ten especial
            cuidado en los primeros minutos de lluvia, cuando el aceite acumulado en el
            pavimento lo vuelve más resbaladizo que después de un rato lloviendo.</li>
            <li><strong>Niebla:</strong> usa luces bajas (las altas rebotan en la niebla y reducen
            tu visibilidad), reduce velocidad de forma importante, y si la visibilidad
            baja demasiado, es preferible orillarte en un lugar seguro y esperar a que
            mejore que seguir "a ciegas".</li>
            <li><strong>Manejo nocturno:</strong> tu campo de visión efectivo se reduce
            drásticamente; ajusta la velocidad a la distancia que realmente iluminan tus
            faros, extrema precaución con peatones, animales y vehículos sin luces
            traseras funcionales, y gestiona tu fatiga (ver el curso de NOM-087):
            manejar de noche con sueño acumulado es de las combinaciones más peligrosas
            que existen.</li>
            <li><strong>Terracería o camino en mal estado:</strong> reduce velocidad
            considerablemente, evita frenados y giros bruscos que en superficie
            irregular pueden desestabilizar la unidad, y verifica la sujeción de la
            carga con más frecuencia — las vibraciones aflojan amarres más rápido.</li>
          </ul>
          <p class="tip">Ninguna entrega justifica llegar tarde con la unidad volcada. Ajustar
          velocidad a las condiciones reales del camino, no al horario que traes
          encima, es la decisión más rentable a largo plazo.</p>
        `
      },
      {
        id: "md-4",
        title: "Anticipación, terceros imprudentes y mantenimiento como seguridad",
        html: `
          <p>El manejo defensivo también significa saber reaccionar (o no reaccionar) ante
          el error de otros:</p>
          <ul>
            <li><strong>Ante un vehículo que se te cierra o invade tu carril:</strong> prioriza
            evitar el impacto de forma controlada (frenar progresivamente, buscar tu
            "salida" ya identificada) por encima de defender "quién tenía el paso". Un
            operador de vehículo pesado que reacciona con maniobras bruscas puede
            provocar un accidente peor que el que intentaba evitar.</li>
            <li><strong>No entres en confrontación en carretera:</strong> pitar de forma agresiva,
            acelerar para "darle una lección" a otro conductor, o seguirlo de cerca
            para reclamarle, convierte un susto en un riesgo real para ti y para
            terceros. Si alguien maneja de forma temeraria cerca de ti, aumenta
            distancia y, si es grave, repórtalo (placas, ubicación) a la autoridad.</li>
            <li><strong>El mantenimiento preventivo es parte del manejo defensivo:</strong> frenos,
            llantas y luces en buen estado no son solo un tema de norma (NOM-068) —
            son literalmente tu capacidad de reaccionar cuando la necesitas. La
            inspección pre-viaje de 5 minutos es, en los hechos, tu primera maniobra
            defensiva del día.</li>
            <li><strong>Gestiona tu propio estado:</strong> el manejo defensivo empieza contigo:
            fatiga, distracción por el teléfono, o manejar bajo estrés emocional fuerte
            reducen tu capacidad de anticipación tanto como la de cualquier otro
            conductor imprudente que puedas cruzarte.</li>
          </ul>
          <p class="tip">Un operador defensivo no es el que nunca se topa con un imprudente en
          la carretera — es el que llega a su destino sin importar cuántos se
          cruzó en el camino.</p>
        `
      }
    ],
    quiz: [
      { q: "¿Qué significa principalmente 'manejar a la defensiva'?", options: ["Manejar siempre muy despacio", "Anticipar el error de otros conductores, no solo evitar el propio", "Nunca ceder el paso a nadie", "Manejar pegado a la línea central"], correct: 1 },
      { q: "Como regla práctica, ¿cuántos segundos de distancia de seguimiento se recomiendan en condiciones normales para un vehículo pesado?", options: ["1 segundo", "3 segundos", "6 segundos", "No es necesario contar, basta con 'ver bien'"], correct: 2 },
      { q: "Las zonas ciegas ('no-zones') más extensas de un tracto con remolque están:", options: ["Solo enfrente de la cabina", "Detrás del remolque y a lo largo de ambos costados, especialmente el del pasajero", "Únicamente arriba de la cabina", "No existen en vehículos modernos"], correct: 1 },
      { q: "Antes de un cambio de carril, además de usar el espejo, debes:", options: ["Solo activar la direccional", "Girar ligeramente la cabeza para verificar el punto ciego", "Acelerar para cambiar más rápido", "No es necesario nada adicional"], correct: 1 },
      { q: "En los primeros minutos de lluvia, el pavimento suele ser:", options: ["Menos resbaladizo que de costumbre", "Más resbaladizo, por el aceite acumulado que aún no se ha lavado", "Igual que en seco", "Solo importa si llueve fuerte"], correct: 1 },
      { q: "En niebla densa, lo correcto respecto a las luces es:", options: ["Usar luces altas para ver más lejos", "Usar luces bajas, porque las altas rebotan en la niebla y reducen visibilidad", "Apagar las luces por completo", "Usar las intermitentes todo el tiempo"], correct: 1 },
      { q: "Si la visibilidad en niebla baja demasiado, la mejor decisión es:", options: ["Seguir despacio 'a ciegas'", "Orillarte en un lugar seguro y esperar a que mejore", "Acelerar para salir rápido de la zona", "Prender las luces altas y continuar"], correct: 1 },
      { q: "Un vehículo se te cierra de forma imprudente en carretera. La reacción defensiva correcta es:", options: ["Acelerar para 'darle una lección'", "Frenar progresivamente y usar la salida que ya tenías identificada", "Seguirlo de cerca para reclamarle", "Pitar de forma prolongada y agresiva"], correct: 1 },
      { q: "La inspección pre-viaje de frenos, llantas y luces se considera parte del manejo defensivo porque:", options: ["Es solo un trámite sin relación con la seguridad", "Determina literalmente tu capacidad real de reaccionar cuando lo necesites", "Solo importa para pasar la verificación vehicular", "No tiene relación con accidentes"], correct: 1 },
      { q: "¿Cuál de estos factores reduce tu propia capacidad de anticipación, igual que un conductor imprudente externo?", options: ["Revisar los espejos cada pocos segundos", "La fatiga y la distracción por el teléfono", "Mantener distancia de seguimiento amplia", "Ajustar la velocidad a las condiciones del camino"], correct: 1 }
    ]
  }
];

const PASSING_SCORE = 8; // de 10 reactivos

if (typeof module !== "undefined") { module.exports = { COURSES, PASSING_SCORE }; }
