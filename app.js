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
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
});
