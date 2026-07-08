import Redis from 'ioredis';

let redis = null;
function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return res.status(500).json({
      error: 'Gemini API Key is not configured. Please set the GEMINI_API_KEY environment variable.'
    });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: `사용자의 일기 내용:\n"${text}"` }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: "너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고, 사용자의 감정을 한단어(예: 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주는, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: [요약된 감정]\n\n[응원 메시지]' 와 같은 줄바꿈을 포함해서 보내줘"
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      return res.status(response.status).json({
        error: 'Gemini API invocation failed',
        details: errorData
      });
    }

    const data = await response.json();
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!contentText) {
      throw new Error('Invalid response from Gemini API');
    }

    // Save to Redis if configured
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(Date.now() + kstOffset);
        const yyyy = kstDate.getUTCFullYear();
        const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(kstDate.getUTCDate()).padStart(2, '0');
        const hh = String(kstDate.getUTCHours()).padStart(2, '0');
        const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
        const ss = String(kstDate.getUTCSeconds()).padStart(2, '0');
        const redisKey = `aiary-${yyyy}${mm}${dd}${hh}${min}${ss}`;

        const payload = {
          diary: text,
          aiResponse: contentText,
          createdAt: kstDate.toISOString()
        };

        await redisClient.set(redisKey, JSON.stringify(payload));
        console.log(`Saved diary entry to Redis with key: ${redisKey}`);
      } catch (redisError) {
        console.error('Failed to save to Redis:', redisError);
      }
    } else {
      console.warn('Redis is not connected (REDIS_URL env var might be missing)');
    }

    return res.status(200).json({ text: contentText });
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
