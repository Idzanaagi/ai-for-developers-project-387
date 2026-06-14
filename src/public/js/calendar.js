document.addEventListener('DOMContentLoaded', () => {
  const slotsContainer = document.getElementById('slots-container');
  const selectedDateHeader = document.getElementById('selected-date-header');

  const modalOverlay = document.getElementById('modal-overlay');
  const modalForm = document.getElementById('modal-form');
  const modalStartTime = document.getElementById('modal-start-time');
  const modalGuestName = document.getElementById('modal-guest-name');
  const modalGuestEmail = document.getElementById('modal-guest-email');
  const modalTimeInfo = document.getElementById('modal-time-info');
  const modalError = document.getElementById('modal-error');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  const slotsCache = new Map();
  let selectedDate = null;

  const dateCells = document.querySelectorAll('.cal-day[data-date]');
  if (!dateCells.length) return;

  const dates = Array.from(dateCells).map(el => el.dataset.date);

  function formatDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00.000Z');
    return d.toLocaleDateString('ru-RU', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function formatTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ru-RU', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
  }

  function formatSlotLabel(startIso, endIso) {
    return `${formatTime(startIso)}\u2013${formatTime(endIso)}`;
  }

  function hasAvailableSlots(slots) {
    return slots.some(s => s.available);
  }

  function loadAllSlots() {
    let hasErrors = false;

    const fetches = dates.map(date =>
      fetch(`/api/slots?date=${date}`)
        .then(res => res.json())
        .then(data => ({ date, slots: data.slots }))
        .catch(() => {
          hasErrors = true;
          return { date, slots: [] };
        })
    );

    Promise.all(fetches).then(results => {
      results.forEach(({ date, slots }) => {
        slotsCache.set(date, slots);
        const cell = document.querySelector(`.cal-day[data-date="${date}"]`);
        if (cell && slots.length > 0 && !hasAvailableSlots(slots) && !cell.classList.contains('cal-day-empty')) {
          return;
        }
        if (cell && hasAvailableSlots(slots) && !cell.classList.contains('cal-day-today')) {
          cell.classList.add('cal-day-has-slots');
        }
      });

      if (hasErrors) {
        const header = document.querySelector('.subtitle');
        const note = document.createElement('p');
        note.className = 'error-message';
        note.textContent = 'Не удалось загрузить некоторые слоты. Проверьте соединение.';
        if (header && !document.querySelector('.subtitle + .error-message')) {
          header.after(note);
        }
      }

      const todayCell = document.querySelector('.cal-day-today');
      if (todayCell) {
        todayCell.classList.add('cal-day-selected');
        selectDate(todayCell.dataset.date);
      }
    });
  }

  function selectDate(date) {
    selectedDate = date;
    const slots = slotsCache.get(date) || [];

    selectedDateHeader.textContent = formatDateLabel(date);

    dateCells.forEach(el => el.classList.remove('cal-day-selected'));
    const cell = document.querySelector(`.cal-day[data-date="${date}"]`);
    if (cell) cell.classList.add('cal-day-selected');

    renderSlots(slots);
  }

  function renderSlots(slots) {
    if (slots.length === 0) {
      slotsContainer.innerHTML = '<p class="no-slots">Нет доступных слотов на эту дату</p>';
      return;
    }

    let html = '';
    slots.forEach(slot => {
      const label = formatSlotLabel(slot.startTime, slot.endTime);
      if (slot.available) {
        html += `<button type="button" class="slot-btn available" data-start="${slot.startTime}" data-end="${slot.endTime}">${label}</button>`;
      } else {
        html += `<button type="button" class="slot-btn occupied" disabled>${label}</button>`;
      }
    });
    slotsContainer.innerHTML = html;

    document.querySelectorAll('.slot-btn.available').forEach(btn => {
      btn.addEventListener('click', () => {
        openModal(btn.dataset.start, btn.dataset.end);
      });
    });
  }

  function openModal(startIso, endIso) {
    const dateStr = formatDateLabel(selectedDate);
    modalTimeInfo.textContent = `${dateStr}, ${formatSlotLabel(startIso, endIso)}`;
    modalStartTime.value = startIso;
    modalGuestName.value = '';
    modalGuestEmail.value = '';
    modalError.style.display = 'none';
    modalOverlay.style.display = 'flex';
    modalGuestName.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  modalForm.addEventListener('submit', e => {
    e.preventDefault();
    modalError.style.display = 'none';

    const guestName = modalGuestName.value.trim();
    const guestEmail = modalGuestEmail.value.trim();
    const startTime = modalStartTime.value;

    if (!guestName || !guestEmail) {
      modalError.textContent = 'Заполните все поля';
      modalError.style.display = 'block';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      modalError.textContent = 'Введите корректный email';
      modalError.style.display = 'block';
      return;
    }

    fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName, guestEmail, startTime })
    })
      .then(res => {
        if (res.redirected) {
          window.location.href = res.url;
          return;
        }
        return res.json().then(data => {
          if (res.status === 409) {
            modalError.textContent = data.message;
            modalError.style.display = 'block';
            return;
          }
          if (data.redirect) {
            window.location.href = data.redirect;
            return;
          }
          throw new Error(data.message || 'Ошибка');
        });
      })
      .catch(() => {
        modalError.textContent = 'Произошла ошибка. Попробуйте ещё раз.';
        modalError.style.display = 'block';
      });
  });

  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay.style.display === 'flex') closeModal();
  });

  dateCells.forEach(el => {
    el.addEventListener('click', () => {
      if (el.classList.contains('cal-day-empty')) return;
      const date = el.dataset.date;

      if (slotsCache.has(date)) {
        selectDate(date);
      } else {
        fetch(`/api/slots?date=${date}`)
          .then(res => res.json())
          .then(data => {
            slotsCache.set(date, data.slots);
            if (hasAvailableSlots(data.slots) && !el.classList.contains('cal-day-today')) {
              el.classList.add('cal-day-has-slots');
            }
            selectDate(date);
          })
          .catch(() => {
            slotsContainer.innerHTML = '<p class="error-message">Ошибка загрузки слотов</p>';
          });
      }
    });
  });

  loadAllSlots();
});