// ============================================================
// cursos.js — Gestión de Cursos y Certificados
// ============================================================

let currentUser = null;
let cursos = [];
let progreso = [];
let certificados = [];
let currentCourseId = null;
let currentQuizIndex = 0;
let selectedAnswers = {};

// ============================================================
// Inicialización
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = data.session.user;

  // Cargar datos
  await loadCursos();
  await loadProgreso();
  await loadCertificados();
});

// ============================================================
// Cargar Datos
// ============================================================

async function loadCursos() {
  try {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) throw error;
    cursos = data || [];

    renderCursosGrid();
    loading.style.display = 'none';
  } catch (err) {
    console.error('Error cargando cursos:', err);
    showMessage('Error al cargar cursos', 'error');
  }
}

async function loadProgreso() {
  try {
    const { data, error } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', currentUser.id);

    if (error) throw error;
    progreso = data || [];
  } catch (err) {
    console.error('Error cargando progreso:', err);
  }
}

async function loadCertificados() {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    certificados = data || [];

    renderCertificados();
  } catch (err) {
    console.error('Error cargando certificados:', err);
  }
}

// ============================================================
// Renderizar Grid de Cursos
// ============================================================

function renderCursosGrid() {
  const container = document.getElementById('courses-grid');

  if (cursos.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem; grid-column: 1 / -1;">No hay cursos disponibles.</p>';
    return;
  }

  container.innerHTML = cursos.map(curso => {
    const miProgreso = progreso.find(p => p.course_id === curso.id);
    const estado = miProgreso?.status || 'not_started';
    const score = miProgreso?.score || 0;

    let statusClass = 'status-not-started';
    let statusText = '📖 Comenzar';
    let btnClass = 'btn-start';

    if (estado === 'in_progress') {
      statusClass = 'status-in-progress';
      statusText = '⏳ En Progreso';
      btnClass = 'btn-continue';
    } else if (estado === 'completed') {
      statusClass = 'status-completed';
      statusText = '✅ Completado';
      btnClass = 'btn-view-cert';
    }

    return `
      <div class="course-card ${estado === 'completed' ? 'completed' : ''}">
        <div class="status-badge ${statusClass}">${statusText}</div>
        <div class="course-title">${curso.title}</div>
        <div class="course-description">${curso.description || ''}</div>
        <div class="course-meta">
          <span>⏱️ ${curso.duration_minutes} min</span>
          ${estado === 'completed' ? `<span>✅ ${score}%</span>` : ''}
        </div>
        ${estado !== 'not_started' ? `
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${estado === 'completed' ? '100' : '50'}%;"></div>
          </div>
        ` : ''}
        <button class="${btnClass}" onclick="startCourse('${curso.id}')">
          ${estado === 'not_started' ? '📖 Comenzar' : estado === 'in_progress' ? '⏳ Continuar' : '🎓 Ver Certificado'}
        </button>
      </div>
    `;
  }).join('');
}

// ============================================================
// Vista de Curso (Lecciones + Quiz)
// ============================================================

async function startCourse(courseId) {
  currentCourseId = courseId;
  const curso = cursos.find(c => c.id === courseId);
  if (!curso) return;

  // Ocultar grid, mostrar vista de curso
  document.getElementById('courses-grid').style.display = 'none';
  document.getElementById('course-view').classList.add('active');

  // Cargar información del curso
  document.getElementById('course-title').textContent = curso.title;
  document.getElementById('course-description').textContent = curso.description || '';

  // Crear o actualizar progreso
  const miProgreso = progreso.find(p => p.course_id === courseId);
  if (!miProgreso) {
    await supabase
      .from('user_course_progress')
      .insert([{
        user_id: currentUser.id,
        course_id: courseId,
        status: 'in_progress'
      }]);
  } else if (miProgreso.status === 'completed') {
    // Si ya completó, mostrar certificado
    showCertificateMessage(miProgreso);
    return;
  }

  // Cargar lecciones
  await loadAndRenderLessons(courseId);

  // Cargar quiz
  await loadAndRenderQuiz(courseId);

  window.scrollTo(0, 0);
}

async function loadAndRenderLessons(courseId) {
  try {
    const { data, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (error) throw error;

    const container = document.getElementById('lessons-container');
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="color: #999;">No hay lecciones disponibles.</p>';
      return;
    }

    container.innerHTML = data.map(lesson => `
      <div class="lesson-content">
        <h3>${lesson.title}</h3>
        ${lesson.video_url ? `
          <div class="video-container">
            🎥 Video: ${lesson.video_url}
          </div>
        ` : ''}
        <div style="color: #666; line-height: 1.6;">
          ${lesson.content || 'Sin contenido'}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error cargando lecciones:', err);
  }
}

async function loadAndRenderQuiz(courseId) {
  try {
    const { data, error } = await supabase
      .from('course_quizzes')
      .select('*')
      .eq('course_id', courseId)
      .order('id');

    if (error) throw error;

    if (!data || data.length === 0) {
      document.getElementById('quiz-section').style.display = 'none';
      return;
    }

    const quizSection = document.getElementById('quiz-section');
    quizSection.style.display = 'block';

    // Mostrar primer quiz
    currentQuizIndex = 0;
    renderQuiz(data[currentQuizIndex]);
  } catch (err) {
    console.error('Error cargando quiz:', err);
  }
}

function renderQuiz(quiz) {
  document.getElementById('quiz-question').textContent = quiz.question;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = quiz.options.map(opt => `
    <label class="quiz-option" onclick="selectAnswer('${opt.id}')">
      <input type="radio" name="answer" value="${opt.id}" onchange="selectAnswer('${opt.id}')">
      ${opt.text}
    </label>
  `).join('');

  document.getElementById('submit-quiz-btn').style.display = 'block';
}

function selectAnswer(optionId) {
  document.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
  document.querySelector(`.quiz-option input[value="${optionId}"]`).parentElement.classList.add('selected');
  selectedAnswers[currentQuizIndex] = optionId;
}

async function submitQuiz() {
  const { data: quizzes, error: quizError } = await supabase
    .from('course_quizzes')
    .select('*')
    .eq('course_id', currentCourseId)
    .order('id');

  if (quizError) {
    showMessage('Error al enviar quiz', 'error');
    return;
  }

  const quiz = quizzes[currentQuizIndex];
  const selectedAnswer = selectedAnswers[currentQuizIndex];

  if (!selectedAnswer) {
    showMessage('Selecciona una respuesta', 'error');
    return;
  }

  const isCorrect = selectedAnswer === quiz.correct_option_id;

  // Mostrar retroalimentación
  document.querySelectorAll('.quiz-option').forEach(opt => {
    const input = opt.querySelector('input');
    if (input.value === quiz.correct_option_id) {
      opt.classList.add('correct');
    } else if (input.value === selectedAnswer && !isCorrect) {
      opt.classList.add('incorrect');
    }
  });

  document.getElementById('submit-quiz-btn').style.display = 'none';

  setTimeout(() => {
    if (currentQuizIndex < quizzes.length - 1) {
      currentQuizIndex++;
      renderQuiz(quizzes[currentQuizIndex]);
    } else {
      // Quiz completado
      completeCourse();
    }
  }, 2000);
}

async function completeCourse() {
  try {
    // Calcular score (100% si todas correctas, por ahora simplificado)
    const score = 100;

    // Actualizar progreso
    await supabase
      .from('user_course_progress')
      .update({
        status: 'completed',
        score: score,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id)
      .eq('course_id', currentCourseId);

    // Generar certificado
    const publicId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const curso = cursos.find(c => c.id === currentCourseId);
    const profile = await supabase.auth.getUser();

    const { error: certError } = await supabase
      .from('certificates')
      .insert([{
        user_id: currentUser.id,
        course_id: currentCourseId,
        public_id: publicId,
        issued_at: new Date().toISOString(),
        metadata: {
          course_title: curso.title,
          score: score,
          email: profile.data.user.email
        }
      }]);

    if (certError) throw certError;

    // Mostrar mensaje de completación
    showCertificateMessage({
      score: score,
      publicId: publicId
    });

    await loadProgreso();
    await loadCertificados();
  } catch (err) {
    console.error('Error completando curso:', err);
    showMessage('Error al completar curso', 'error');
  }
}

function showCertificateMessage(data) {
  document.getElementById('lessons-container').style.display = 'none';
  document.getElementById('quiz-section').style.display = 'none';

  const completionMsg = document.getElementById('completion-message');
  completionMsg.style.display = 'block';
  document.getElementById('completion-text').textContent = `Felicidades! Has completado este curso con una puntuación de ${data.score}%. Descarga tu certificado con código QR verificable.`;
}

function downloadCertificate() {
  const curso = cursos.find(c => c.id === currentCourseId);
  const cert = certificados.find(c => c.course_id === currentCourseId);

  const htmlContent = generateCertificateHtml(curso, cert);

  const opt = {
    margin: 20,
    filename: `Certificado_${cert.public_id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  document.body.appendChild(element);

  html2pdf().set(opt).from(element).save();
  document.body.removeChild(element);
}

function generateCertificateHtml(curso, cert) {
  return `
    <div style="font-family: 'Times New Roman', serif; padding: 40px; max-width: 900px; margin: 0 auto; text-align: center; border: 3px solid #d4a574;">
      <div style="font-size: 48px; font-weight: bold; color: #d4a574; margin-bottom: 20px;">CERTIFICADO</div>

      <div style="font-size: 18px; color: #333; margin: 30px 0;">SE OTORGA ESTE CERTIFICADO A</div>

      <div style="font-size: 28px; font-weight: bold; color: #0f5132; margin: 30px 0; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">
        ${currentUser.email}
      </div>

      <div style="font-size: 16px; color: #666; margin: 30px 0;">Por haber completado exitosamente el curso</div>

      <div style="font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">
        ${curso.title}
      </div>

      <div style="font-size: 14px; color: #666; margin: 30px 0;">
        Fecha de Emisión: ${new Date(cert.issued_at).toLocaleDateString('es-MX')}
      </div>

      <div style="margin: 40px 0;">
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">CÓDIGO DE VERIFICACIÓN</div>
        <div id="cert-qr" style="display: inline-block; padding: 20px; background: white; border: 1px solid #ddd;"></div>
        <div style="font-size: 12px; color: #666; margin-top: 10px; font-family: monospace; font-weight: bold;">
          ${cert.public_id}
        </div>
      </div>

      <div style="font-size: 12px; color: #999; margin-top: 40px;">
        Verifica este certificado en https://operadorpro.app/verificar/${cert.public_id}
      </div>
    </div>

    <script>
      setTimeout(() => {
        new QRCode(document.getElementById('cert-qr'), {
          text: '${cert.public_id}',
          width: 150,
          height: 150
        });
      }, 500);
    </script>
  `;
}

// ============================================================
// Certificados
// ============================================================

function renderCertificados() {
  const container = document.getElementById('certificates-grid');

  if (certificados.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem; grid-column: 1 / -1;">No tienes certificados aún. ¡Completa un curso!</p>';
    return;
  }

  container.innerHTML = certificados.map(cert => {
    const curso = cursos.find(c => c.id === cert.course_id);
    const fecha = new Date(cert.issued_at).toLocaleDateString('es-MX');

    return `
      <div class="certificate-card">
        <div class="certificate-title">🎓 ${cert.metadata?.course_title || 'Certificado'}</div>
        <div class="certificate-date">Emitido: ${fecha}</div>
        <div class="certificate-qr" id="qr-${cert.id}"></div>
        <div style="font-size: 0.8rem; color: #27ae60; margin-bottom: 1rem; font-family: monospace;">${cert.public_id}</div>
        <button class="btn btn-primary" onclick="downloadCert('${cert.id}')">📥 Descargar</button>
      </div>
    `;
  }).join('');

  // Generar QR para cada certificado
  setTimeout(() => {
    certificados.forEach(cert => {
      const container = document.getElementById(`qr-${cert.id}`);
      if (container) {
        new QRCode(container, {
          text: cert.public_id,
          width: 150,
          height: 150
        });
      }
    });
  }, 500);
}

function downloadCert(certId) {
  const cert = certificados.find(c => c.id === certId);
  const curso = cursos.find(c => c.id === cert.course_id);
  downloadCertificate();
}

// ============================================================
// Navegación
// ============================================================

function backToCourses() {
  document.getElementById('course-view').classList.remove('active');
  document.getElementById('courses-grid').style.display = 'grid';
  document.getElementById('lessons-container').innerHTML = '';
  document.getElementById('completion-message').style.display = 'none';
  currentCourseId = null;
  selectedAnswers = {};
  currentQuizIndex = 0;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  if (tabName === 'cursos') {
    document.getElementById('tab-cursos').classList.add('active');
  } else {
    document.getElementById('tab-certificados').classList.add('active');
  }

  event.target.classList.add('active');
}

function showMessage(msg, type = 'info', containerId = 'message-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const msgEl = document.createElement('div');
  msgEl.className = type;
  msgEl.textContent = msg;
  container.innerHTML = '';
  container.appendChild(msgEl);

  setTimeout(() => {
    msgEl.remove();
  }, 3000);
}

function logout() {
  supabase.auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
}
