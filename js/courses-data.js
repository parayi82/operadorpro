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
  }
];

const PASSING_SCORE = 8; // de 10 reactivos

if (typeof module !== "undefined") { module.exports = { COURSES, PASSING_SCORE }; }
