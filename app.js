document.addEventListener('DOMContentLoaded', () => {
  const diaryInput = document.getElementById('diary-input');
  const currentCharCount = document.getElementById('current-char-count');
  const voiceInputBtn = document.getElementById('voice-input-btn');
  const analyzeBtn = document.getElementById('analyze-btn');
  const aiResponseBox = document.getElementById('ai-response-box');

  // Character Counter
  diaryInput.addEventListener('input', () => {
    const textLength = diaryInput.value.length;
    currentCharCount.textContent = textLength;
  });

  // Load saved content from localStorage
  const savedDiaryText = localStorage.getItem('diary_text');
  const savedAiResponse = localStorage.getItem('diary_ai_response');

  if (savedDiaryText) {
    diaryInput.value = savedDiaryText;
    currentCharCount.textContent = savedDiaryText.length;
  }

  if (savedAiResponse) {
    aiResponseBox.innerHTML = '';
    const responseContent = document.createElement('div');
    responseContent.className = 'response-content';
    
    const responseText = document.createElement('p');
    responseText.className = 'response-text';
    responseText.style.whiteSpace = 'pre-wrap';
    responseText.textContent = savedAiResponse;
    
    responseContent.appendChild(responseText);
    aiResponseBox.appendChild(responseContent);
    aiResponseBox.classList.add('has-content');
  }

  // Speech Recognition API setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ko-KR';

    recognition.onstart = () => {
      isListening = true;
      voiceInputBtn.innerHTML = `
        <svg class="btn-icon pulse" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        음성 인식 중...
      `;
      voiceInputBtn.classList.add('listening');
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // Append text
      const space = diaryInput.value.length > 0 && !diaryInput.value.endsWith(' ') ? ' ' : '';
      diaryInput.value += space + transcript;
      diaryInput.dispatchEvent(new Event('input'));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 확인해주세요.');
      } else {
        alert('음성 인식 중 오류가 발생했습니다: ' + event.error);
      }
      resetVoiceBtn();
    };

    recognition.onend = () => {
      resetVoiceBtn();
    };
  }

  voiceInputBtn.addEventListener('click', () => {
    if (!SpeechRecognition) {
      alert('현재 브라우저에서는 음성 인식 기능을 지원하지 않습니다. Chrome 또는 Safari 등을 사용해 주세요.');
      return;
    }

    if (!isListening) {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    } else {
      recognition.stop();
    }
  });

  function resetVoiceBtn() {
    isListening = false;
    voiceInputBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
      음성으로 입력하기
    `;
    voiceInputBtn.classList.remove('listening');
  }

  // Analyze Request via Serverless Function (Gemini API)
  analyzeBtn.addEventListener('click', async () => {
    const text = diaryInput.value.trim();
    if (!text) {
      alert('일기 내용을 입력해 주세요!');
      return;
    }

    aiResponseBox.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p class="loading-text">Gemini가 감정을 분석하고 있습니다...</p>
      </div>
    `;
    aiResponseBox.classList.add('has-content');

    try {
      // Get current user session and access token
      const session = window.supabaseClient ? (await window.supabaseClient.auth.getSession()).data.session : null;
      const token = session ? session.access_token : null;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '감정 분석 요청 중 문제가 발생했습니다.');
      }

      const result = await response.json();
      
      aiResponseBox.innerHTML = '';
      const responseContent = document.createElement('div');
      responseContent.className = 'response-content';
      
      const responseText = document.createElement('p');
      responseText.className = 'response-text';
      responseText.style.whiteSpace = 'pre-wrap';
      responseText.textContent = result.text;
      
      responseContent.appendChild(responseText);
      aiResponseBox.appendChild(responseContent);

      // Save to localStorage
      localStorage.setItem('diary_text', text);
      localStorage.setItem('diary_ai_response', result.text);

      // Refresh history list
      fetchHistory();
    } catch (error) {
      console.error('Analysis failed:', error);
      aiResponseBox.innerHTML = `
        <div class="response-content error-box">
          <p class="response-text" style="color: #ef4444;">
            <strong>분석 실패</strong><br><br>
            ${error.message}<br>
            <span style="font-size: 0.85em; color: #888;">(로컬 실행 시 .env 파일에 GEMINI_API_KEY가 설정되어 있고 vercel dev 등으로 서버를 실행했는지 확인해 주세요.)</span>
          </p>
        </div>
      `;
    }
  });

  // History container elements and rendering logic
  const historyContainer = document.getElementById('history-container');

  async function fetchHistory() {
    if (!historyContainer) return;
    try {
      // Get current user session and access token
      const session = window.supabaseClient ? (await window.supabaseClient.auth.getSession()).data.session : null;
      const token = session ? session.access_token : null;

      const response = await fetch('/api/history', {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error('히스토리를 불러오는 데 실패했습니다.');
      }
      const historyData = await response.json();
      
      if (historyData.length === 0) {
        historyContainer.innerHTML = '<p class="placeholder-text">저장된 일기 내역이 없습니다.</p>';
        return;
      }
      
      historyContainer.innerHTML = '';
      historyData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        // Parse date from Redis key (format: user:UUID:diary-YYYYMMDDHHmmss)
        let dateStr = '';
        if (item.key) {
          const match = item.key.match(/diary-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
          if (match) {
            dateStr = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
          }
        }
        if (!dateStr && item.createdAt) {
          dateStr = new Date(item.createdAt).toLocaleString('ko-KR');
        }
        
        const dateBadge = document.createElement('span');
        dateBadge.className = 'history-date-badge';
        dateBadge.textContent = dateStr || '날짜 미상';
        
        const diaryText = document.createElement('p');
        diaryText.className = 'history-diary-text';
        diaryText.textContent = item.diary || '';
        
        const aiReply = document.createElement('p');
        aiReply.className = 'history-ai-reply';
        aiReply.textContent = item.aiResponse || '';
        
        card.appendChild(dateBadge);
        card.appendChild(diaryText);
        card.appendChild(aiReply);
        historyContainer.appendChild(card);
      });
    } catch (err) {
      console.error('History load error:', err);
      historyContainer.innerHTML = `<p class="placeholder-text" style="color: #ef4444;">히스토리 로드 실패: ${err.message}</p>`;
    }
  }

  // Supabase Auth Integration
  const authContainer = document.getElementById('auth-container');
  const diaryAppContainer = document.getElementById('diary-app-container');
  const userEmailDisplay = document.getElementById('user-email-display');
  
  const authForm = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');
  const btnGoogleLogin = document.getElementById('btn-google-login');
  const btnLogout = document.getElementById('btn-logout');

  function updateAuthUI(session) {
    if (session && session.user) {
      // User is logged in
      authContainer.classList.add('hidden');
      diaryAppContainer.classList.remove('hidden');
      if (userEmailDisplay) {
        userEmailDisplay.textContent = session.user.email;
      }
      // Load history
      fetchHistory();
    } else {
      // User is logged out
      authContainer.classList.remove('hidden');
      diaryAppContainer.classList.add('hidden');
    }
  }

  if (window.supabaseClient) {
    // Check initial session
    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      updateAuthUI(session);
    });

    // Listen for auth state changes
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Supabase Auth Event:', event);
      updateAuthUI(session);
    });
  }

  // Form submit handler (prevent default form submission)
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }

  // Login handler
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
      }

      try {
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } catch (err) {
        alert('로그인 실패: ' + err.message);
      }
    });
  }

  // Sign up handler
  if (btnSignup) {
    btnSignup.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
      }

      try {
        const { error } = await window.supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        alert('가입 확인 이메일을 확인해주세요!');
      } catch (err) {
        alert('회원가입 실패: ' + err.message);
      }
    });
  }

  // Google Login handler
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
      try {
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err) {
        alert('Google 로그인 실패: ' + err.message);
      }
    });
  }

  // Logout handler
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
      } catch (err) {
        alert('로그아웃 실패: ' + err.message);
      }
    });
  }
});
