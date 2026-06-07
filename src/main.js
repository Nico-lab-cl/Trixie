// Interactividad para la Landing Page de Trixie Vega

document.addEventListener('DOMContentLoaded', () => {
  initProposalsFilter();
  initVotingWizard();
  initFeedbackForm();
});

/* ==========================================================================
   FILTRO DE PROPUESTAS
   ========================================================================== */
function initProposalsFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.proposal-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover clase activa de todos los botones
      filterBtns.forEach(b => b.classList.remove('active'));
      // Agregar clase activa al botón presionado
      btn.classList.add('active');

      const targetCategory = btn.getAttribute('data-target');

      cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        
        if (targetCategory === 'all' || cardCategory === targetCategory) {
          card.classList.remove('hidden');
          // Animación de entrada
          card.style.animation = 'none';
          card.offsetHeight; // Forzar reflow
          card.style.animation = 'fadeIn 0.3s ease forwards';
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

/* ==========================================================================
   SIMULADOR DE VOTO ELECTRONICO (PASO A PASO)
   ========================================================================== */
function initVotingWizard() {
  let currentStep = 1;
  const totalSteps = 4;

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const steps = document.querySelectorAll('.wizard-step');
  const dots = document.querySelectorAll('.step-dot');

  // Actualizar visibilidad y estados del wizard
  function updateWizard() {
    // Actualizar contenido de los pasos
    steps.forEach(step => {
      step.classList.remove('active');
    });
    document.getElementById(`step-${currentStep}`).classList.add('active');

    // Actualizar estados de los puntos de progreso (dots)
    dots.forEach((dot, idx) => {
      const stepNum = idx + 1;
      dot.classList.remove('active', 'completed');
      
      if (stepNum === currentStep) {
        dot.classList.add('active');
      } else if (stepNum < currentStep) {
        dot.classList.add('completed');
      }
    });

    // Controlar habilitación de botones de navegación
    btnPrev.disabled = currentStep === 1;

    if (currentStep === totalSteps) {
      btnNext.textContent = '¡Entendido!';
      btnNext.classList.remove('btn-accent');
      btnNext.classList.add('btn-primary');
    } else {
      btnNext.textContent = 'Siguiente';
      btnNext.classList.remove('btn-primary');
      btnNext.classList.add('btn-accent');
    }
  }

  // Evento Siguiente
  btnNext.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      currentStep++;
      updateWizard();
    } else {
      // Si llegó al final, vuelve al paso 1 o hace scroll al buzón
      currentStep = 1;
      updateWizard();
      document.getElementById('buzon').scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Evento Atrás
  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateWizard();
    }
  });

  // Permitir click directo en los dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetStep = parseInt(dot.getAttribute('data-step'), 10);
      currentStep = targetStep;
      updateWizard();
    });
  });
}

/* ==========================================================================
   FORMULARIO DE PROPUESTAS & LOCAL STORAGE
   ========================================================================== */
function initFeedbackForm() {
  const form = document.getElementById('proposal-form');
  const successOverlay = document.getElementById('form-success');
  const btnClose = document.getElementById('btn-success-close');
  const successTitle = document.getElementById('success-title');
  const successMessage = document.getElementById('success-message');

  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : 'Enviar Sugerencia a Trixie';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener valores del formulario
    const firstName = document.getElementById('form-firstname').value.trim();
    const lastName = document.getElementById('form-lastname').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const phone = document.getElementById('form-phone').value.trim();
    const shift = document.getElementById('form-shift').value;
    const topic = document.getElementById('form-topic').value;
    const message = document.getElementById('form-message').value.trim();

    const leadData = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      jornada: shift,
      tema: topic,
      sugerencia: message
    };

    // Deshabilitar botón e indicar carga
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error del servidor al registrar lead.');
      }

      const savedLead = await response.json();

      // Guardar en localStorage como respaldo local
      let currentSuggestions = [];
      try {
        currentSuggestions = JSON.parse(localStorage.getItem('trixie_suggestions')) || [];
        currentSuggestions.push({
          id: savedLead.id,
          order_number: savedLead.order_number,
          name: `${firstName} ${lastName}`,
          shift,
          topic,
          message,
          date: savedLead.created_at || new Date().toISOString()
        });
        localStorage.setItem('trixie_suggestions', JSON.stringify(currentSuggestions));
      } catch (err) {
        console.error('Error guardando en localStorage:', err);
      }

      // Actualizar modal de éxito de forma dinámica
      if (successTitle) {
        successTitle.textContent = `¡Muchas gracias, ${firstName}!`;
      }
      if (successMessage) {
        successMessage.innerHTML = `Tu opinión se ha registrado de manera oficial.<br><br>` +
          `Tu número de orden es: <strong style="color:#65a30d; font-size:1.15rem;">${savedLead.order_number}</strong>.<br><br>` +
          `Te enviaremos la información de confirmación a tu correo: <strong>${email}</strong> ` +
          `y un mensaje a tu número de teléfono: <strong>${phone}</strong>.`;
      }

      // Mostrar modal / overlay de éxito con animación
      successOverlay.classList.remove('hidden');
      successOverlay.style.animation = 'fadeIn 0.3s ease forwards';

    } catch (err) {
      console.error('Error al registrar lead:', err);
      alert(`Lo sentimos, hubo un problema: ${err.message}`);
    } finally {
      // Reestablecer botón
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });

  // Cerrar overlay de éxito y resetear formulario
  btnClose.addEventListener('click', () => {
    successOverlay.classList.add('hidden');
    form.reset();
  });
}
