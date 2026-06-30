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

  // Voice Input Simulation
  let isListening = false;
  voiceInputBtn.addEventListener('click', () => {
    if (!isListening) {
      isListening = true;
      voiceInputBtn.innerHTML = `
        <svg class="btn-icon pulse" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        음성 인식 중...
      `;
      voiceInputBtn.classList.add('listening');
      
      // Mock typing after 2 seconds
      setTimeout(() => {
        if (isListening) {
          const mockTexts = [
            "오늘도 바쁜 하루였다. 퇴근길 밤하늘이 예뻤다. ",
            "친구랑 오랜만에 맛있는 밥을 먹어서 기분이 좋다. ",
            "하는 일이 잘 안 풀려서 조금 답답한 기분이 든다. "
          ];
          const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
          diaryInput.value += randomText;
          diaryInput.dispatchEvent(new Event('input'));
          
          resetVoiceBtn();
        }
      }, 2000);
    } else {
      resetVoiceBtn();
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

  // Analyze Request Simulation
  analyzeBtn.addEventListener('click', () => {
    const text = diaryInput.value.trim();
    if (!text) {
      alert('일기 내용을 입력해 주세요!');
      return;
    }

    aiResponseBox.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p class="loading-text">감정을 분석하고 있습니다...</p>
      </div>
    `;
    aiResponseBox.classList.add('has-content');

    setTimeout(() => {
      // Basic emotion word analysis
      let emotion = '잔잔한';
      let advice = '오늘 하루도 수고 많으셨습니다. 따뜻한 차 한 잔과 함께 편안한 저녁을 보내보세요.';
      
      if (text.includes('기쁘') || text.includes('좋') || text.includes('행복')) {
        emotion = '기쁘고 긍정적인';
        advice = '오늘 하루 동안 느낀 행복한 에너지가 글에서도 잘 느껴집니다! 이 기분을 마음껏 만끽하세요.';
      } else if (text.includes('슬프') || text.includes('눈물') || text.includes('우울')) {
        emotion = '조금은 쓸쓸하고 우울한';
        advice = '때로는 마음껏 감정을 흘려보내는 것도 중요합니다. 오늘은 자신에게 조금 더 너그러운 하루가 되었기를 바랄게요.';
      } else if (text.includes('화') || text.includes('짜증') || text.includes('답답')) {
        emotion = '답답하고 화가 나는';
        advice = '지치고 스트레스 받는 상황이 있으셨나 봅니다. 깊은 심호흡을 하며 마음의 열기를 천천히 식혀보세요.';
      }

      aiResponseBox.innerHTML = `
        <div class="response-content">
          <p class="response-text">
            작성하신 일기에서 <strong>${emotion} 감정</strong>이 느껴집니다.<br><br>
            ${advice}
          </p>
        </div>
      `;
    }, 1500);
  });
});
