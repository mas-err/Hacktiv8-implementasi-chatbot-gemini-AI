const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const instructionText = document.getElementById('instruction-text');
const saveBtn = document.getElementById('save-instruction');
const toggleBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');

// Sidebar Toggle Logic
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
}

// Close sidebar when clicking outside (optional but good UX)
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768) {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  }
});

// Store conversation history
let conversationHistory = [];

// Load system instruction on start
fetch('/api/instruction')
  .then(res => res.json())
  .then(data => {
    if (data.instruction) {
      instructionText.value = data.instruction;
    }
  })
  .catch(err => console.error('Failed to load instruction:', err));

// Save system instruction
saveBtn.addEventListener('click', async () => {
  const newInstruction = instructionText.value.trim();
  if (!newInstruction) return;

  try {
    const res = await fetch('/api/instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: newInstruction })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Persona diperbarui! Chat selanjutnya akan menggunakan instruksi ini.');
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    console.error('Error saving instruction:', err);
    alert('Gagal menyimpan instruksi');
  }
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Add user message to UI and History
  appendMessage('user', userMessage);
  conversationHistory.push({ role: 'user', text: userMessage });

  input.value = '';

  // 2. Show "Thinking..." message
  const loadingId = 'loading-' + Date.now();
  appendMessage('bot', 'Thinking...', loadingId);

  try {
    // 3. Send FULL history to backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: conversationHistory
      })
    });

    const data = await response.json();

    // 4. Remove loading and show response
    removeMessage(loadingId);

    if (response.ok && data.result) {
      appendMessage('bot', data.result);
      // 5. Add bot response to history (so context is preserved for next turn)
      conversationHistory.push({ role: 'model', text: data.result });
    } else {
      appendMessage('bot', 'Sorry, no response received or an error occurred.');
      if (data.message) console.error('Server Error:', data.message);
    }

  } catch (error) {
    removeMessage(loadingId);
    appendMessage('bot', 'Failed to get response from server.');
    console.error('Fetch Error:', error);
  }
});

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function appendMessage(sender, text, id = null) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  const content = document.createElement('div');

  // Render Markdown for bot, plain text for user
  if (sender === 'bot') {
    content.innerHTML = marked.parse(text);
  } else {
    content.textContent = text;
  }

  msg.appendChild(content);

  // Metadata: Time + Tick (only for user)
  const meta = document.createElement('div');
  meta.className = 'metadata';

  const time = document.createElement('span');
  time.textContent = getCurrentTime();
  meta.appendChild(time);

  if (sender === 'user') {
    const tick = document.createElement('span');
    tick.className = 'tick';
    // Double tick SVG
    tick.innerHTML = '<svg viewBox="0 0 16 11" fill="none" class=""><path d="M4 10.5L0 6.5L1.4 5.1L4 7.7L9.6 2.1L11 3.5L4 10.5Z" fill="currentColor"/><path d="M15 3.5L8 10.5L6.6 9.1L13.6 2.1L15 3.5Z" fill="currentColor"/></svg>';
    meta.appendChild(tick);
  }

  msg.appendChild(meta);

  if (id) msg.id = id;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeMessage(id) {
  const msg = document.getElementById(id);
  if (msg) {
    msg.remove();
  }
}
