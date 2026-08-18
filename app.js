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
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWindow = document.getElementById('chat-window');

    if (session && session.user) {
      // User is logged in
      authContainer.classList.add('hidden');
      diaryAppContainer.classList.remove('hidden');
      if (chatToggleBtn) chatToggleBtn.classList.remove('hidden');
      if (userEmailDisplay) {
        userEmailDisplay.textContent = session.user.email;
      }
      // Load history
      fetchHistory();
    } else {
      // User is logged out
      authContainer.classList.remove('hidden');
      diaryAppContainer.classList.add('hidden');
      if (chatToggleBtn) chatToggleBtn.classList.add('hidden');
      if (chatWindow) chatWindow.classList.add('hidden');
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

  // Floating Chat UI Handler & Realtime Integration
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  const chatWindow = document.getElementById('chat-window');
  const chatCloseBtn = document.getElementById('chat-close-btn');
  const chatIconOpen = document.querySelector('.chat-icon-open');
  const chatIconClose = document.querySelector('.chat-icon-close');
  const chatEmojiBtn = document.getElementById('chat-emoji-btn');
  const chatEmojiPicker = document.getElementById('chat-emoji-picker');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  let currentUserEmail = '';
  let realtimeChannel = null;

  function extractNickname(email) {
    if (!email) return '익명';
    return email.split('@')[0];
  }

  function appendChatMessage(msg) {
    if (!chatMessages) return;
    
    // Check duplicate by msg id or dataset
    if (msg.id && document.querySelector(`[data-msg-id="${msg.id}"]`)) {
      return;
    }

    const isOutgoing = currentUserEmail && (msg.user_email === currentUserEmail || msg.users_email === currentUserEmail);
    const emailToUse = msg.user_email || msg.users_email || '';
    const nickname = extractNickname(emailToUse);

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    if (msg.id) {
      msgDiv.dataset.msgId = msg.id;
    }

    if (!isOutgoing) {
      const senderDiv = document.createElement('div');
      senderDiv.className = 'message-sender';
      senderDiv.textContent = nickname;
      msgDiv.appendChild(senderDiv);
    }

    const rowDiv = document.createElement('div');
    rowDiv.className = 'chat-message-row';

    // Avatar element
    if (msg.avatar_url) {
      const avatarImg = document.createElement('img');
      avatarImg.className = 'msg-avatar';
      avatarImg.src = msg.avatar_url;
      avatarImg.alt = nickname;
      rowDiv.appendChild(avatarImg);
    } else {
      const avatarDefault = document.createElement('div');
      avatarDefault.className = 'msg-avatar-default';
      avatarDefault.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `;
      rowDiv.appendChild(avatarDefault);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = msg.content || '';
    rowDiv.appendChild(bubble);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    if (msg.created_at) {
      const date = new Date(msg.created_at);
      timeDiv.textContent = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else {
      timeDiv.textContent = '방금 전';
    }

    msgDiv.appendChild(rowDiv);
    msgDiv.appendChild(timeDiv);
    chatMessages.appendChild(msgDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function fetchChatMessages() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      chatMessages.innerHTML = '';
      if (data && data.length > 0) {
        data.forEach(msg => appendChatMessage(msg));
      } else {
        chatMessages.innerHTML = '<p class="placeholder-text" style="padding: 20px 0;">아직 메시지가 없습니다. 첫 메시지를 남겨보세요! 💬</p>';
      }
    } catch (err) {
      console.error('채팅 메시지 로드 실패:', err);
    }
  }

  function subscribeChatRealtime() {
    if (!window.supabaseClient || realtimeChannel) return;

    realtimeChannel = window.supabaseClient
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Remove empty placeholder if exists
        const placeholder = chatMessages.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();
        
        appendChatMessage(payload.new);
      })
      .subscribe((status) => {
        console.log('Supabase Realtime Channel Status:', status);
      });
  }

  // Helper function to update top profile header UI with user avatar
  function updateProfileHeaderUI(avatarUrl) {
    const userProfileImg = document.getElementById('user-profile-img');
    const userProfileDefault = document.getElementById('user-profile-default');

    if (avatarUrl) {
      if (userProfileImg) {
        userProfileImg.src = avatarUrl;
        userProfileImg.classList.remove('hidden');
      }
      if (userProfileDefault) {
        userProfileDefault.classList.add('hidden');
      }
    } else {
      if (userProfileImg) {
        userProfileImg.classList.add('hidden');
        userProfileImg.src = '';
      }
      if (userProfileDefault) {
        userProfileDefault.classList.remove('hidden');
      }
    }
  }

  // Update currentUserEmail & userAvatarUrl when auth updates & initialize chat
  const originalUpdateAuthUI = updateAuthUI;
  updateAuthUI = function(session) {
    if (session && session.user) {
      currentUserEmail = session.user.email;
      const avatarUrl = session.user.user_metadata?.avatar_url || '';
      updateProfileHeaderUI(avatarUrl);
      fetchChatMessages();
      subscribeChatRealtime();
    } else {
      currentUserEmail = '';
      updateProfileHeaderUI('');
      if (realtimeChannel && window.supabaseClient) {
        window.supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    }
    originalUpdateAuthUI(session);
  };

  function toggleChatWindow() {
    if (!chatWindow) return;
    const isHidden = chatWindow.classList.contains('hidden');
    if (isHidden) {
      chatWindow.classList.remove('hidden');
      chatIconOpen.classList.add('hidden');
      chatIconClose.classList.remove('hidden');
      chatInput.focus();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
      chatWindow.classList.add('hidden');
      chatIconOpen.classList.remove('hidden');
      chatIconClose.classList.add('hidden');
      chatEmojiPicker.classList.add('hidden');
    }
  }

  if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', toggleChatWindow);
  }

  if (chatCloseBtn) {
    chatCloseBtn.addEventListener('click', toggleChatWindow);
  }

  if (chatEmojiBtn && chatEmojiPicker) {
    chatEmojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chatEmojiPicker.classList.toggle('hidden');
    });

    chatEmojiPicker.addEventListener('click', (e) => {
      if (e.target.classList.contains('emoji-item')) {
        chatInput.value += e.target.textContent;
        chatInput.focus();
        chatEmojiPicker.classList.add('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!chatEmojiPicker.contains(e.target) && e.target !== chatEmojiBtn) {
        chatEmojiPicker.classList.add('hidden');
      }
    });
  }

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageText = chatInput.value.trim();
      if (!messageText) return;

      try {
        if (!window.supabaseClient) {
          throw new Error('Supabase 클라이언트가 설정되지 않았습니다.');
        }

        const sessionRes = await window.supabaseClient.auth.getSession();
        const user = sessionRes.data.session?.user;

        if (!user) {
          alert('로그인이 필요합니다.');
          return;
        }

        const userEmail = user.email;
        const avatarUrl = user.user_metadata?.avatar_url || '';

        // Insert new message into Supabase 'messages' table
        const { error } = await window.supabaseClient
          .from('messages')
          .insert({
            content: messageText,
            user_email: userEmail,
            avatar_url: avatarUrl
          });

        if (error) {
          throw error;
        }

        // Clear input box on success
        chatInput.value = '';
      } catch (err) {
        console.error('메시지 전송 실패:', err);
        alert('메시지 전송 중 오류가 발생했습니다: ' + err.message);
      }
    });
  }

  // Profile Photo File Picker Interaction & Upload Logic
  const profileAvatarContainer = document.getElementById('profile-avatar-container');
  const btnChangeProfilePhoto = document.getElementById('btn-change-profile-photo');
  const profileFileInput = document.getElementById('profile-file-input');

  function triggerProfileFilePicker() {
    if (profileFileInput) {
      profileFileInput.click();
    }
  }

  if (profileAvatarContainer) {
    profileAvatarContainer.addEventListener('click', triggerProfileFilePicker);
  }

  if (btnChangeProfilePhoto) {
    btnChangeProfilePhoto.addEventListener('click', triggerProfileFilePicker);
  }

  if (profileFileInput) {
    profileFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }

      try {
        if (!window.supabaseClient) {
          throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
        }

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session || !session.user) {
          alert('로그인이 필요합니다.');
          return;
        }

        const userId = session.user.id;
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        // Upload file to 'avatars' bucket in Supabase storage
        const { error: uploadError } = await window.supabaseClient.storage
          .from('avatars')
          .upload(filePath, file, {
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = window.supabaseClient.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl + '?t=' + new Date().getTime();

        // Update Supabase Auth user metadata
        const { data: userData, error: updateError } = await window.supabaseClient.auth.updateUser({
          data: { avatar_url: publicUrl }
        });

        if (updateError) throw updateError;

        // Update profile header UI immediately
        updateProfileHeaderUI(publicUrl);
        alert('프로필 사진이 성공적으로 변경되었습니다!');

      } catch (err) {
        console.error('프로필 사진 업로드 오류:', err);
        alert('프로필 사진 업로드에 실패했습니다: ' + err.message);
      } finally {
        profileFileInput.value = '';
      }
    });
  }
});


